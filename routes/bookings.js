const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const isLoggedIn = require('../utils/isLoggedIn.js');
const validateBooking = require('../utils/validateBooking.js');
const bookingController = require('../controllers/booking.js');

// Show all user bookings
router.get('/bookings', isLoggedIn, wrapAsync(bookingController.userBookings));

// Show booking form
router.get('/listings/:id/book', isLoggedIn, wrapAsync(bookingController.bookingForm));

// Create booking
router.post('/listings/:id/book', isLoggedIn, validateBooking, wrapAsync(bookingController.createBooking));

// Show payment page
router.get('/bookings/:id/payment', isLoggedIn, wrapAsync(bookingController.paymentPage));

// Process payment
router.post('/bookings/:id/payment', isLoggedIn, wrapAsync(bookingController.processPayment));

// Show single booking
router.get('/bookings/:id', isLoggedIn, wrapAsync(bookingController.showBooking));

// Cancel booking
router.post('/bookings/:id/cancel', isLoggedIn, wrapAsync(bookingController.cancelBooking));

// Delete (remove) a cancelled booking
router.delete('/bookings/:id', isLoggedIn, wrapAsync(bookingController.deleteBooking));

module.exports = router;
