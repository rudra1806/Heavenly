/**
 * RabbitMQ event consumers for the Listing Service.
 * 
 * Handles:
 *   - user.deleted → cascade delete all listings owned by the deleted user
 * 
 * When a listing is cascade-deleted, we also publish listing.deleted events
 * so the Review and Booking services can clean up their data too.
 */

const Listing = require('../models/listing.js');

/**
 * Sets up all event consumers for the Listing Service.
 * 
 * @param {function} consumeEvent - RabbitMQ consume function from shared package
 * @param {function} publishEvent - RabbitMQ publish function (for re-publishing cascade events)
 */
async function setupConsumers(consumeEvent, publishEvent) {
    // When a user is deleted, delete all their listings
    await consumeEvent(
        'listing-service.user-deleted',  // Unique queue name
        'user.deleted',                   // Routing key to subscribe to
        async (data) => {
            const { userId, username } = data;
            console.log(`[Listing Events] Processing user.deleted for user: ${username} (${userId})`);

            // Find all listings by this user before deleting
            const listings = await Listing.find({ ownerId: userId });

            if (listings.length === 0) {
                console.log(`[Listing Events] No listings found for user ${username}`);
                return;
            }

            // Delete images from Cloudinary for each listing (prevent orphaned images)
            const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL || 'http://localhost:3005';
            const serviceClient = require('../utils/serviceClient.js');
            
            for (const listing of listings) {
                // Delete image from Cloudinary if not default
                if (listing.image.filename && listing.image.filename !== 'default.jpg') {
                    try {
                        await serviceClient.delete(`${MEDIA_SERVICE_URL}/media/${listing.image.filename}`);
                        console.log(`[Listing Events] Deleted image: ${listing.image.filename}`);
                    } catch (imgErr) {
                        console.warn(`[Listing Events] Failed to delete image ${listing.image.filename}:`, imgErr.message);
                        // Continue with listing deletion even if image deletion fails
                    }
                }

                // Publish listing.deleted for each listing (so reviews/bookings/search can clean up)
                if (publishEvent) {
                    await publishEvent('listing.deleted', {
                        listingId: listing._id.toString(),
                        ownerId: listing.ownerId,
                        title: listing.title
                    });
                }
            }

            // Bulk delete all listings
            const result = await Listing.deleteMany({ ownerId: userId });
            console.log(`[Listing Events] Cascade deleted ${result.deletedCount} listings for user ${username}`);
        }
    );

    console.log('[Listing Events] All consumers registered');
}

module.exports = { setupConsumers };
