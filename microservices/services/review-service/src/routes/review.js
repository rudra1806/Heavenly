/**
 * Review Service routes.
 * 
 * GET    /reviews                — List reviews (filter by listingId or authorId)
 * GET    /reviews/stats/:listingId — Rating stats for a listing
 * GET    /reviews/:id           — Single review
 * POST   /reviews               — Create review (auth required)
 * DELETE /reviews/:id           — Delete review (author/admin only)
 */

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.js');
const validateReview = require('../validators/validateReview.js');

let authMiddleware;
try {
    authMiddleware = require('../../../../shared/middleware/authMiddleware');
} catch {
    authMiddleware = require('/app/shared/middleware/authMiddleware');
}

// Public
router.get('/reviews', reviewController.getReviews);
router.get('/reviews/stats/:listingId', reviewController.getListingStats);
router.get('/reviews/:id', reviewController.getReview);

// Protected
router.post('/reviews', authMiddleware, validateReview, reviewController.createReview);
router.delete('/reviews/:id', authMiddleware, reviewController.deleteReview);

module.exports = router;
