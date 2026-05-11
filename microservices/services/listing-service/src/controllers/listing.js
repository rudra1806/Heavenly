/**
 * Listing Controller — handles property CRUD, availability, and ownership.
 * 
 * Interacts with:
 *   - Media Service (upload images)
 *   - Search Service (geocode locations)
 *   - RabbitMQ (publish listing lifecycle events)
 */

const Listing = require('../models/listing.js');

// Service clients — injected from index.js
let serviceClient = null;
let publishEvent = null;
let MEDIA_SERVICE_URL = '';
let SEARCH_SERVICE_URL = '';

function setDependencies(deps) {
    serviceClient = deps.serviceClient;
    publishEvent = deps.publishEvent;
    MEDIA_SERVICE_URL = deps.mediaServiceUrl || '';
    SEARCH_SERVICE_URL = deps.searchServiceUrl || '';
}

/**
 * GET /listings
 * Returns all listings (optionally filtered by owner or availability).
 */
async function getAllListings(req, res) {
    try {
        const filter = {};
        if (req.query.ownerId) filter.ownerId = req.query.ownerId;
        if (req.query.isAvailable !== undefined) {
            filter.isAvailable = req.query.isAvailable === 'true';
        }

        const listings = await Listing.find(filter).sort({ createdAt: -1 });
        res.json({
            success: true,
            data: { listings, count: listings.length }
        });
    } catch (err) {
        console.error('[Listing] getAllListings error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch listings.' });
    }
}

/**
 * GET /listings/:id
 * Returns a single listing by ID.
 */
async function getListing(req, res) {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ success: false, error: 'Listing not found.' });
        }
        res.json({ success: true, data: { listing } });
    } catch (err) {
        console.error('[Listing] getListing error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch listing.' });
    }
}

/**
 * POST /listings
 * Creates a new listing. Calls Media Service for image upload and Search Service for geocoding.
 */
async function createListing(req, res) {
    try {
        const { title, description, price, location, country, maxGuests } = req.body;

        // Get owner ID from JWT (set by gateway's X-User-Id header or auth middleware)
        const ownerId = req.headers['x-user-id'] || req.user?.id;
        if (!ownerId) {
            return res.status(401).json({ success: false, error: 'Authentication required.' });
        }

        // Build listing data
        const listingData = {
            title, description, price, location, country,
            maxGuests: maxGuests || 4,
            ownerId
        };

        // Geocode the location via Search Service
        if (SEARCH_SERVICE_URL) {
            try {
                const geoResponse = await serviceClient.get(
                    `${SEARCH_SERVICE_URL}/geocode?location=${encodeURIComponent(location + ', ' + country)}`
                );
                if (geoResponse.success && geoResponse.data?.coordinates) {
                    listingData.geometry = {
                        type: 'Point',
                        coordinates: geoResponse.data.coordinates
                    };
                }
            } catch (geoErr) {
                console.warn('[Listing] Geocoding failed, using defaults:', geoErr.message);
            }
        }

        // Handle image if file was uploaded via multipart (proxied from BFF/Gateway)
        if (req.body.image && req.body.image.url) {
            listingData.image = {
                url: req.body.image.url,
                filename: req.body.image.filename || 'default.jpg'
            };
        }

        const listing = new Listing(listingData);
        await listing.save();

        // Publish event for Search Service to index
        if (publishEvent) {
            await publishEvent('listing.created', {
                listingId: listing._id.toString(),
                title: listing.title,
                description: listing.description,
                location: listing.location,
                country: listing.country,
                price: listing.price,
                coordinates: listing.geometry?.coordinates,
                image: listing.image
            });
        }

        console.log(`[Listing] Created: ${listing.title} by ${ownerId}`);

        res.status(201).json({
            success: true,
            message: 'Listing created successfully.',
            data: { listing }
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ success: false, error: messages.join(', ') });
        }
        console.error('[Listing] createListing error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to create listing.' });
    }
}

/**
 * PUT /listings/:id
 * Updates an existing listing. Only the owner can update.
 */
async function updateListing(req, res) {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ success: false, error: 'Listing not found.' });
        }

        // Ownership check
        const userId = req.headers['x-user-id'] || req.user?.id;
        const userRole = req.headers['x-user-role'] || req.user?.role;
        if (listing.ownerId !== userId && userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'You do not have permission to edit this listing.' });
        }

        const { title, description, price, location, country, maxGuests, image } = req.body;

        // Update fields
        if (title) listing.title = title;
        if (description) listing.description = description;
        if (price !== undefined) listing.price = price;
        if (maxGuests !== undefined) listing.maxGuests = maxGuests;

        // Re-geocode if location changed
        if (location && country && (location !== listing.location || country !== listing.country)) {
            listing.location = location;
            listing.country = country;

            if (SEARCH_SERVICE_URL) {
                try {
                    const geoResponse = await serviceClient.get(
                        `${SEARCH_SERVICE_URL}/geocode?location=${encodeURIComponent(location + ', ' + country)}`
                    );
                    if (geoResponse.success && geoResponse.data?.coordinates) {
                        listing.geometry = {
                            type: 'Point',
                            coordinates: geoResponse.data.coordinates
                        };
                    }
                } catch (geoErr) {
                    console.warn('[Listing] Re-geocoding failed:', geoErr.message);
                }
            }
        }

        // Update image if provided
        if (image && image.url) {
            // Delete old image from Cloudinary if it's not the default
            if (listing.image.filename && listing.image.filename !== 'default.jpg' && MEDIA_SERVICE_URL) {
                try {
                    await serviceClient.delete(`${MEDIA_SERVICE_URL}/media/${listing.image.filename}`);
                } catch (delErr) {
                    console.warn('[Listing] Failed to delete old image:', delErr.message);
                }
            }
            listing.image = { url: image.url, filename: image.filename || 'default.jpg' };
        }

        await listing.save();

        // Publish update event
        if (publishEvent) {
            await publishEvent('listing.updated', {
                listingId: listing._id.toString(),
                title: listing.title,
                description: listing.description,
                location: listing.location,
                country: listing.country,
                price: listing.price,
                coordinates: listing.geometry?.coordinates,
                image: listing.image
            });
        }

        console.log(`[Listing] Updated: ${listing.title}`);

        res.json({
            success: true,
            message: 'Listing updated successfully.',
            data: { listing }
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ success: false, error: messages.join(', ') });
        }
        console.error('[Listing] updateListing error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to update listing.' });
    }
}

/**
 * DELETE /listings/:id
 * Deletes a listing and its Cloudinary image. Publishes listing.deleted event.
 */
async function deleteListing(req, res) {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ success: false, error: 'Listing not found.' });
        }

        // Ownership check
        const userId = req.headers['x-user-id'] || req.user?.id;
        const userRole = req.headers['x-user-role'] || req.user?.role;
        if (listing.ownerId !== userId && userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'You do not have permission to delete this listing.' });
        }

        // Delete image from Cloudinary if not default
        if (listing.image.filename && listing.image.filename !== 'default.jpg' && MEDIA_SERVICE_URL) {
            try {
                await serviceClient.delete(`${MEDIA_SERVICE_URL}/media/${listing.image.filename}`);
            } catch (delErr) {
                console.warn('[Listing] Failed to delete image:', delErr.message);
            }
        }

        await Listing.findByIdAndDelete(req.params.id);

        // Publish event for cascade deletion (reviews, bookings, search index)
        if (publishEvent) {
            await publishEvent('listing.deleted', {
                listingId: listing._id.toString(),
                ownerId: listing.ownerId,
                title: listing.title
            });
        }

        console.log(`[Listing] Deleted: ${listing.title}`);

        res.json({
            success: true,
            message: `Listing "${listing.title}" deleted successfully.`
        });
    } catch (err) {
        console.error('[Listing] deleteListing error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to delete listing.' });
    }
}

/**
 * POST /listings/:id/toggle-availability
 * Toggles a listing's availability status. Owner or admin only.
 */
async function toggleAvailability(req, res) {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ success: false, error: 'Listing not found.' });
        }

        // Ownership check
        const userId = req.headers['x-user-id'] || req.user?.id;
        const userRole = req.headers['x-user-role'] || req.user?.role;
        if (listing.ownerId !== userId && userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'You do not have permission to modify this listing.' });
        }

        listing.isAvailable = !listing.isAvailable;
        await listing.save();

        // Publish update event so search index can be updated
        if (publishEvent) {
            await publishEvent('listing.updated', {
                listingId: listing._id.toString(),
                isAvailable: listing.isAvailable
            });
        }

        console.log(`[Listing] Toggled availability: ${listing.title} → ${listing.isAvailable}`);

        res.json({
            success: true,
            message: `Listing is now ${listing.isAvailable ? 'available' : 'unavailable'}.`,
            data: { listing }
        });
    } catch (err) {
        console.error('[Listing] toggleAvailability error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to toggle availability.' });
    }
}

module.exports = {
    getAllListings,
    getListing,
    createListing,
    updateListing,
    deleteListing,
    toggleAvailability,
    setDependencies
};
