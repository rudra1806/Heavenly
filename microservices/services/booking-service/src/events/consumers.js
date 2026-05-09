/**
 * RabbitMQ event consumers for the Booking Service.
 * 
 * Handles:
 *   - listing.deleted → cancel all active bookings for that listing
 *   - user.deleted → cancel all active bookings by that user
 */

const Booking = require('../models/booking.js');

async function setupConsumers(consumeEvent) {
    // When a listing is deleted, cancel all its pending/confirmed bookings
    await consumeEvent(
        'booking-service.listing-deleted',
        'listing.deleted',
        async (data) => {
            const { listingId, title } = data;
            console.log(`[Booking Events] Processing listing.deleted: ${title} (${listingId})`);

            const result = await Booking.updateMany(
                { listingId, status: { $in: ['pending', 'confirmed'] } },
                {
                    $set: {
                        status: 'cancelled',
                        'payment.status': 'refunded'
                    }
                }
            );
            console.log(`[Booking Events] Cancelled ${result.modifiedCount} bookings for listing ${listingId}`);
        }
    );

    // When a user is deleted, cancel all their active bookings
    await consumeEvent(
        'booking-service.user-deleted',
        'user.deleted',
        async (data) => {
            const { userId, username } = data;
            console.log(`[Booking Events] Processing user.deleted: ${username} (${userId})`);

            const result = await Booking.updateMany(
                { userId, status: { $in: ['pending', 'confirmed'] } },
                {
                    $set: {
                        status: 'cancelled',
                        'payment.status': 'refunded'
                    }
                }
            );
            console.log(`[Booking Events] Cancelled ${result.modifiedCount} bookings for user ${username}`);
        }
    );

    console.log('[Booking Events] All consumers registered');
}

module.exports = { setupConsumers };
