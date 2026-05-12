/**
 * Booking Service routes.
 * 
 * GET    /bookings                    — List bookings (filter by userId, listingId)
 * GET    /bookings/:id                — Single booking
 * POST   /bookings                    — Create booking (auth required)
 * POST   /bookings/:id/payment        — Create Razorpay order (auth required)
 * POST   /bookings/:id/verify-payment — Verify Razorpay payment (auth required)
 * POST   /bookings/:id/cancel         — Cancel booking (auth required)
 * DELETE /bookings/:id                — Hard delete (admin only)
 */

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.js');
const validateBooking = require('../validators/validateBooking.js');

let authMiddleware;
try {
    authMiddleware = require('../../../../shared/middleware/authMiddleware');
} catch {
    authMiddleware = require('/app/shared/middleware/authMiddleware');
}

// Public
router.get('/bookings', bookingController.getBookings);
router.get('/bookings/:id', bookingController.getBooking);

// Protected
router.post('/bookings', authMiddleware, validateBooking, bookingController.createBooking);
router.post('/bookings/:id/payment', authMiddleware, bookingController.processPayment);
router.post('/bookings/:id/verify-payment', authMiddleware, bookingController.verifyPayment);
router.post('/bookings/:id/cancel', authMiddleware, bookingController.cancelBooking);

// Delete booking - users can soft-delete their own cancelled bookings, admins can hard-delete any
router.delete('/bookings/:id', authMiddleware, bookingController.deleteBooking);

module.exports = router;
