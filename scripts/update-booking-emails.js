/**
 * Migration script to populate guestEmail field in existing bookings.
 * 
 * This script:
 * 1. Connects to the booking and auth databases
 * 2. Fetches all bookings without guestEmail
 * 3. Looks up the user email from the auth service database
 * 4. Updates the booking with the guestEmail
 * 
 * Run with: node update-booking-emails.js
 */

const mongoose = require('mongoose');

// Database URLs
const BOOKING_DB_URL = process.env.BOOKING_DB_URL || 'mongodb://localhost:27017/heavenly_bookings';
const AUTH_DB_URL = process.env.AUTH_DB_URL || 'mongodb://localhost:27017/heavenly_auth';

// Create separate connections
const bookingConn = mongoose.createConnection(BOOKING_DB_URL);
const authConn = mongoose.createConnection(AUTH_DB_URL);

// Define schemas
const bookingSchema = new mongoose.Schema({
    userId: String,
    guestUsername: String,
    guestEmail: String,
    listingId: String,
    checkIn: Date,
    checkOut: Date,
    guests: Number,
    status: String,
    payment: Object
}, { timestamps: true });

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    role: String
}, { timestamps: true });

// Create models
const Booking = bookingConn.model('Booking', bookingSchema);
const User = authConn.model('User', userSchema);

async function updateBookingEmails() {
    try {
        console.log('[Migration] Connecting to databases...');
        await Promise.all([
            bookingConn.asPromise(),
            authConn.asPromise()
        ]);
        console.log('[Migration] Connected successfully');

        // Find all bookings without guestEmail or with empty guestEmail
        const bookings = await Booking.find({
            $or: [
                { guestEmail: { $exists: false } },
                { guestEmail: '' },
                { guestEmail: null }
            ]
        });

        console.log(`[Migration] Found ${bookings.length} bookings without email`);

        let updated = 0;
        let notFound = 0;

        for (const booking of bookings) {
            try {
                // Look up user by userId
                const user = await User.findById(booking.userId);
                
                if (user && user.email) {
                    booking.guestEmail = user.email;
                    await booking.save();
                    updated++;
                    console.log(`[Migration] Updated booking ${booking._id} with email ${user.email}`);
                } else {
                    notFound++;
                    console.log(`[Migration] User not found for booking ${booking._id} (userId: ${booking.userId})`);
                }
            } catch (err) {
                console.error(`[Migration] Error updating booking ${booking._id}:`, err.message);
            }
        }

        console.log('\n[Migration] Summary:');
        console.log(`  Total bookings processed: ${bookings.length}`);
        console.log(`  Successfully updated: ${updated}`);
        console.log(`  User not found: ${notFound}`);
        console.log('[Migration] Complete!');

    } catch (err) {
        console.error('[Migration] Error:', err);
    } finally {
        await bookingConn.close();
        await authConn.close();
        process.exit(0);
    }
}

// Run the migration
updateBookingEmails();
