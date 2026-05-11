/**
 * Search & Geocoding Controller
 * 
 * Two responsibilities:
 *   1. Geocoding — converts addresses to coordinates via Nominatim (OpenStreetMap)
 *      Results are cached in Redis (1 week TTL) to respect rate limits.
 * 
 *   2. Search — maintains an in-memory index of listings, updated via RabbitMQ events.
 *      Provides full-text search across title, description, location, and country.
 */

let redisClient = null;

// In-memory search index — maps listing IDs to searchable data
// In production, you'd use Elasticsearch. For learning, this demonstrates the pattern.
const searchIndex = new Map();

function setRedisClient(client) {
    redisClient = client;
}

/**
 * GET /geocode?location=Malibu, USA
 * 
 * Converts a location string to [longitude, latitude] coordinates.
 * Uses Nominatim (free OpenStreetMap geocoder) with Redis caching.
 * 
 * Rate limit: Nominatim allows 1 request/second — Redis cache prevents
 * hitting this limit for repeated locations.
 */
async function geocode(req, res) {
    try {
        const { location } = req.query;

        if (!location || location.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Location query parameter is required.'
            });
        }

        const cacheKey = `geo:${location.toLowerCase().trim()}`;

        // Check Redis cache first
        if (redisClient) {
            try {
                const cached = await redisClient.get(cacheKey);
                if (cached) {
                    console.log(`[Search] Geocode cache HIT: ${location}`);
                    return res.json({
                        success: true,
                        data: JSON.parse(cached),
                        cached: true
                    });
                }
            } catch (cacheErr) {
                console.warn('[Search] Redis cache read error:', cacheErr.message);
            }
        }

        // Cache miss — call Nominatim API
        console.log(`[Search] Geocode cache MISS — calling Nominatim: ${location}`);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'HeavenlyApp/1.0 (learning project)',
                'Accept-Language': 'en'
            }
        });

        const results = await response.json();

        if (!results || results.length === 0) {
            return res.json({
                success: true,
                data: { coordinates: [0, 0], displayName: location },
                message: 'Location not found, using default coordinates.'
            });
        }

        const result = {
            coordinates: [parseFloat(results[0].lon), parseFloat(results[0].lat)],
            displayName: results[0].display_name
        };

        // Cache the result in Redis (7 days TTL — locations don't change often)
        if (redisClient) {
            try {
                await redisClient.set(cacheKey, JSON.stringify(result), { EX: 604800 }); // 7 days
            } catch (cacheErr) {
                console.warn('[Search] Redis cache write error:', cacheErr.message);
            }
        }

        res.json({
            success: true,
            data: result,
            cached: false
        });
    } catch (err) {
        console.error('[Search] Geocode error:', err.message);
        res.status(500).json({ success: false, error: 'Geocoding failed.' });
    }
}

/**
 * GET /search?q=beach&minPrice=100&maxPrice=5000
 * 
 * Searches listings in the local index. Supports text search and price filtering.
 * The index is kept up to date via RabbitMQ events.
 */
async function search(req, res) {
    try {
        const { q, minPrice, maxPrice } = req.query;

        let results = Array.from(searchIndex.values());

        // Text search — match against title, description, location, country
        if (q && q.trim() !== '') {
            const query = q.toLowerCase().trim();
            results = results.filter(listing => {
                const searchable = `${listing.title} ${listing.description} ${listing.location} ${listing.country}`.toLowerCase();
                return searchable.includes(query);
            });
        }

        // Price filters
        if (minPrice) {
            results = results.filter(l => l.price >= parseInt(minPrice));
        }
        if (maxPrice) {
            results = results.filter(l => l.price <= parseInt(maxPrice));
        }

        res.json({
            success: true,
            data: {
                listings: results,
                count: results.length,
                indexSize: searchIndex.size
            }
        });
    } catch (err) {
        console.error('[Search] Search error:', err.message);
        res.status(500).json({ success: false, error: 'Search failed.' });
    }
}

/**
 * Adds or updates a listing in the search index.
 * Called from event consumers when listing.created or listing.updated is received.
 */
function indexListing(data) {
    const existing = searchIndex.get(data.listingId) || {};
    const coords = data.coordinates !== undefined ? data.coordinates : existing.coordinates || [0, 0];
    
    searchIndex.set(data.listingId, {
        _id: data.listingId,
        listingId: data.listingId,
        title: data.title !== undefined ? data.title : existing.title || '',
        description: data.description !== undefined ? data.description : existing.description || '',
        location: data.location !== undefined ? data.location : existing.location || '',
        country: data.country !== undefined ? data.country : existing.country || '',
        price: data.price !== undefined ? data.price : existing.price || 0,
        coordinates: coords,
        geometry: {
            type: 'Point',
            coordinates: coords
        },
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : (existing.isAvailable !== undefined ? existing.isAvailable : true),
        image: data.image !== undefined ? data.image : existing.image || { url: '', filename: '' }
    });
    console.log(`[Search] Indexed listing: ${data.listingId} — ${data.title || existing.title}`);
}

/**
 * Removes a listing from the search index.
 */
function removeFromIndex(listingId) {
    searchIndex.delete(listingId);
    console.log(`[Search] Removed from index: ${listingId}`);
}

/**
 * Returns the current index size (for health checks / debugging).
 */
function getIndexSize() {
    return searchIndex.size;
}

module.exports = {
    geocode,
    search,
    indexListing,
    removeFromIndex,
    getIndexSize,
    setRedisClient
};
