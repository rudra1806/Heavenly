/**
 * Centralized event name constants for RabbitMQ messaging.
 * 
 * All services import these constants to ensure consistent routing keys.
 * Using constants prevents typo-based bugs in event names.
 * 
 * Pattern: <domain>.<action>
 * Exchange: heavenly.events (topic exchange)
 */

module.exports = {
    // Exchange name — all services publish/consume through this
    EXCHANGE: 'heavenly.events',

    // User domain events
    USER: {
        REGISTERED: 'user.registered',
        DELETED: 'user.deleted'
    },

    // Listing domain events
    LISTING: {
        CREATED: 'listing.created',
        UPDATED: 'listing.updated',
        DELETED: 'listing.deleted'
    },

    // Review domain events
    REVIEW: {
        CREATED: 'review.created',
        DELETED: 'review.deleted'
    },

    // Booking domain events
    BOOKING: {
        CREATED: 'booking.created',
        CANCELLED: 'booking.cancelled',
        PAYMENT_COMPLETED: 'booking.payment.completed'
    }
};
