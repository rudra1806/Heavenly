/**
 * RabbitMQ event consumers for the Review Service.
 * 
 * Handles:
 *   - listing.deleted → delete all reviews for that listing
 *   - user.deleted → delete all reviews by that user
 */

const Review = require('../models/review.js');

async function setupConsumers(consumeEvent) {
    // When a listing is deleted, remove all its reviews
    await consumeEvent(
        'review-service.listing-deleted',
        'listing.deleted',
        async (data) => {
            const { listingId, title } = data;
            console.log(`[Review Events] Processing listing.deleted for: ${title} (${listingId})`);
            const result = await Review.deleteMany({ listingId });
            console.log(`[Review Events] Cascade deleted ${result.deletedCount} reviews for listing ${listingId}`);
        }
    );

    // When a user is deleted, remove all their reviews
    await consumeEvent(
        'review-service.user-deleted',
        'user.deleted',
        async (data) => {
            const { userId, username } = data;
            console.log(`[Review Events] Processing user.deleted for: ${username} (${userId})`);
            const result = await Review.deleteMany({ authorId: userId });
            console.log(`[Review Events] Cascade deleted ${result.deletedCount} reviews by user ${username}`);
        }
    );

    console.log('[Review Events] All consumers registered');
}

module.exports = { setupConsumers };
