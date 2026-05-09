/**
 * Admin Service routes.
 * 
 * All routes require admin authentication (enforced by Gateway + authMiddleware).
 * 
 * Dashboard:
 *   GET /admin/dashboard              — Platform-wide stats
 *   GET /admin/user-dashboard/:userId — User-specific host+guest stats
 * 
 * Admin CRUD (delegates to owning services):
 *   GET    /admin/users               — All users (search)
 *   DELETE /admin/users/:id           — Delete user (cascade via events)
 *   GET    /admin/listings            — All listings (search)
 *   DELETE /admin/listings/:id        — Delete listing (cascade via events)
 *   GET    /admin/reviews             — All reviews (search)
 *   DELETE /admin/reviews/:id         — Delete review
 *   GET    /admin/bookings            — All bookings
 *   DELETE /admin/bookings/:id        — Hard delete booking
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.js');

let authMiddleware;
try {
    authMiddleware = require('../../../../shared/middleware/authMiddleware');
} catch {
    authMiddleware = require('/app/shared/middleware/authMiddleware');
}

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(authMiddleware.requireAdmin);

// Dashboard
router.get('/admin/dashboard', adminController.getDashboard);
router.get('/admin/user-dashboard/:userId', adminController.getUserDashboard);

// Users
router.get('/admin/users', adminController.getAllUsers);
router.delete('/admin/users/:id', adminController.deleteUser);

// Listings
router.get('/admin/listings', adminController.getAllListings);
router.delete('/admin/listings/:id', adminController.deleteListing);

// Reviews
router.get('/admin/reviews', adminController.getAllReviews);
router.delete('/admin/reviews/:id', adminController.deleteReview);

// Bookings
router.get('/admin/bookings', adminController.getAllBookings);
router.delete('/admin/bookings/:id', adminController.deleteBooking);

module.exports = router;
