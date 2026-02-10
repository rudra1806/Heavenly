const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const isLoggedIn = require('../utils/isLoggedIn.js');
const isAdmin = require('../utils/isAdmin.js');

// Controller
const adminController = require('../controllers/admin.js');

// All admin routes require login + admin role
router.use('/admin', isLoggedIn, isAdmin);

// Dashboard
router.get('/admin', wrapAsync(adminController.dashboard));

// User Management
router.get('/admin/users', wrapAsync(adminController.allUsers));
router.delete('/admin/users/:userId', wrapAsync(adminController.deleteUser));

// Listing Management
router.get('/admin/listings', wrapAsync(adminController.allListings));

// Review Management
router.get('/admin/reviews', wrapAsync(adminController.allReviews));
router.delete('/admin/reviews/:reviewId', wrapAsync(adminController.deleteReview));

module.exports = router;
