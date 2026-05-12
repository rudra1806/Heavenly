/**
 * Migration script to add platformFee and hostEarnings to existing bookings.
 * 
 * This script calculates:
 * - platformFee: 15% of totalPrice
 * - hostEarnings: 85% of totalPrice (totalPrice - platformFee)
 * 
 * Run this once after deploying the platform fee feature.
 * 
 * Usage:
 *   node scripts/migrate-platform-fee.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/heavenly_bookings';

const bookingSchema = new mongoose.Schema({
    listingId: String,
    userId: String,
    listingTitle: String,
    listingImage: String,
    listingLocation: String,
    ownerUsername: String,
    guestUsername: String,
    checkIn: Date,
    checkOut: Date,
    guests: Number,
    pricePerNight: Number,
    totalPrice: Number,
    platformFee: Number,
    hostEarnings: Number,
    status: String,
    isHidden: Boolean,
    payment: {
        status: String,
        method: String,
        transactionId: String,
        razorpayOrderId: String,
        refundId: String,
        paidAt: Date
    }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

async function migrateBookings() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected successfully.');

        // Find all bookings that don't have platformFee or hostEarnings set
        const bookingsToUpdate = await Booking.find({
            $or: [
                { platformFee: { $exists: false } },
                { hostEarnings: { $exists: false } },
                { platformFee: 0, hostEarnings: 0 }
            ]
        });

        console.log(`Found ${bookingsToUpdate.length} bookings to update.`);

        if (bookingsToUpdate.length === 0) {
            console.log('No bookings need migration. Exiting.');
            await mongoose.connection.close();
            return;
        }

        let updated = 0;
        let skipped = 0;

        for (const booking of bookingsToUpdate) {
            if (!booking.totalPrice || booking.totalPrice === 0) {
                console.log(`Skipping booking ${booking._id} - totalPrice is 0 or missing`);
                skipped++;
                continue;
            }

            // Calculate platform fee (15%) and host earnings (85%)
            const platformFee = Math.round(booking.totalPrice * 0.15);
            const hostEarnings = booking.totalPrice - platformFee;

            booking.platformFee = platformFee;
            booking.hostEarnings = hostEarnings;

            await booking.save();
            updated++;

            if (updated % 10 === 0) {
                console.log(`Updated ${updated} bookings...`);
            }
        }

        console.log('\n=== Migration Complete ===');
        console.log(`Total bookings processed: ${bookingsToUpdate.length}`);
        console.log(`Successfully updated: ${updated}`);
        console.log(`Skipped: ${skipped}`);

        await mongoose.connection.close();
        console.log('Database connection closed.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateBookings();
