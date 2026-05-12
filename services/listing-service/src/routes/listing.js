/**
 * Listing Service routes.
 * 
 * GET    /listings              — All listings (filter by ownerId, isAvailable)
 * GET    /listings/:id          — Single listing
 * POST   /listings              — Create listing (auth required)
 * PUT    /listings/:id          — Update listing (owner/admin only)
 * DELETE /listings/:id          — Delete listing (owner/admin only)
 * POST   /listings/:id/toggle-availability — Toggle availability (owner/admin)
 */

const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listing.js');
const validateListing = require('../validators/validateListing.js');

// Import shared auth middleware
let authMiddleware;
try {
    authMiddleware = require('../../../../shared/middleware/authMiddleware');
} catch {
    authMiddleware = require('/app/shared/middleware/authMiddleware');
}

// ===== Public Routes =====
router.get('/listings', listingController.getAllListings);
router.get('/listings/:id', listingController.getListing);

// ===== Protected Routes (owner/admin) =====
router.post('/listings', authMiddleware, validateListing, listingController.createListing);
router.put('/listings/:id', authMiddleware, listingController.updateListing);
router.delete('/listings/:id', authMiddleware, listingController.deleteListing);
router.post('/listings/:id/toggle-availability', authMiddleware, listingController.toggleAvailability);

module.exports = router;
