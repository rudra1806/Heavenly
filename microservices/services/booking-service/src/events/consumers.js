/**
 * RabbitMQ event consumers for the Booking Service.
 * 
 * Handles:
 *   - listing.deleted → hard-delete all bookings for that listing
 *   - user.deleted → hard-delete all bookings by that user
 */

const Booking = require('../models/booking.js');

async function setupConsumers(consumeEvent) {
    // When a listing is deleted, hard-delete all its bookings
    await consumeEvent(
        'booking-service.listing-deleted',
        'listing.deleted',
        async (data) => {
            const { listingId, title } = data;
            console.log(`[Booking Events] Processing listing.deleted: ${title} (${listingId})`);

            // Hard delete all bookings for this listing (listing no longer exists)
            const result = await Booking.deleteMany({ listingId });
            console.log(`[Booking Events] Hard deleted ${result.deletedCount} bookings for listing ${listingId}`);
        }
    );

    // When a user is deleted, hard-delete all their bookings (both as guest and host)
    await consumeEvent(
        'booking-service.user-deleted',
        'user.deleted',
        async (data) => {
            const { userId, username } = data;
            console.log(`[Booking Events] Processing user.deleted: ${username} (${userId})`);

            // Delete all bookings where user is the guest
            const guestBookingsResult = await Booking.deleteMany({ userId });
            console.log(`[Booking Events] Hard deleted ${guestBookingsResult.deletedCount} guest bookings for user ${username}`);
            
            // Note: Bookings on user's listings are handled by listing.deleted events
            // which are published when the user's listings are cascade-deleted
        }
    );

    console.log('[Booking Events] All consumers registered');
}

module.exports = { setupConsumers };
