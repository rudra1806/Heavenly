/**
 * Booking model for the Booking Service.
 * 
 * Key differences from the monolith:
 *   - listingId and userId stored as plain strings
 *   - No cross-DB populate for listing/user details
 *   - Denormalized fields (listingTitle, ownerUsername) to avoid HTTP calls on read
 *   - Payment simulation fields retained for future Razorpay/Stripe integration
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    // References as plain strings (no ObjectId refs across databases)
    listingId: {
        type: String,
        required: [true, 'Listing ID is required'],
        index: true
    },
    userId: {
        type: String,
        required: [true, 'User ID is required'],
        index: true
    },

    // Denormalized fields — cached at booking time (avoid inter-service calls on read)
    listingTitle: { type: String, default: '' },
    listingImage: { type: String, default: '' },
    listingLocation: { type: String, default: '' },
    ownerUsername: { type: String, default: '' },
    guestUsername: { type: String, default: '' },

    // Booking dates
    checkIn: {
        type: Date,
        required: [true, 'Check-in date is required']
    },
    checkOut: {
        type: Date,
        required: [true, 'Check-out date is required']
    },

    // Guest count
    guests: {
        type: Number,
        required: [true, 'Number of guests is required'],
        min: [1, 'At least 1 guest required']
    },

    // Pricing
    pricePerNight: {
        type: Number,
        required: true,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },

    // Booking status lifecycle
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },

    // Simulated payment fields (ready for Razorpay/Stripe integration)
    payment: {
        status: {
            type: String,
            enum: ['pending', 'completed', 'refunded', 'failed'],
            default: 'pending'
        },
        method: {
            type: String,
            enum: ['simulated', 'razorpay', 'stripe'],
            default: 'simulated'
        },
        transactionId: { type: String, default: null },
        paidAt: { type: Date, default: null }
    }
}, {
    timestamps: true
});

// Indexes for overlap detection queries
bookingSchema.index({ listingId: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
