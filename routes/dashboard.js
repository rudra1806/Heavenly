const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const isLoggedIn = require('../utils/isLoggedIn.js');

// Controller
const dashboardController = require('../controllers/dashboard.js');

// All dashboard routes require login
router.use('/dashboard', isLoggedIn);

// Dashboard overview
router.get('/dashboard', wrapAsync(dashboardController.index));

// My bookings (as guest)
router.get('/dashboard/bookings', wrapAsync(dashboardController.myBookings));

// My listings (as host)
router.get('/dashboard/listings', wrapAsync(dashboardController.myListings));

// Toggle listing availability
router.post('/dashboard/listings/:id/toggle-availability', wrapAsync(dashboardController.toggleAvailability));

// See bookings on my listing (guest details)
router.get('/dashboard/listings/:id/bookings', wrapAsync(dashboardController.listingBookings));

// Owner cancels a guest's booking
router.post('/dashboard/listings/:id/bookings/:bookingId/cancel', wrapAsync(dashboardController.cancelGuestBooking));

module.exports = router;
