/**
 * BFF Review Routes — create and delete reviews via API.
 */

const express = require('express');
const router = express.Router();
const { apiCall } = require('../utils/apiClient.js');
const { isLoggedIn } = require('../middleware.js');

// POST /listings/:id/reviews — create a review
router.post('/listings/:id/reviews', isLoggedIn, async (req, res) => {
    try {
        // Form sends review[rating] and review[comment] (nested via Express urlencoded)
        const reviewData = req.body.review || {};
        await apiCall('/api/reviews', {
            method: 'POST',
            body: {
                comment: reviewData.comment,
                rating: reviewData.rating,
                listingId: req.params.id
            },
            session: req.session
        });
        req.flash('success', 'Review added!');
    } catch (err) {
        req.flash('error', err.message || 'Failed to add review.');
    }
    res.redirect(`/listings/${req.params.id}`);
});

// DELETE /listings/:id/reviews/:reviewId — delete a review
router.delete('/listings/:id/reviews/:reviewId', isLoggedIn, async (req, res) => {
    try {
        await apiCall(`/api/reviews/${req.params.reviewId}`, {
            method: 'DELETE',
            session: req.session
        });
        req.flash('success', 'Review deleted!');
    } catch (err) {
        req.flash('error', err.message || 'Failed to delete review.');
    }
    res.redirect(`/listings/${req.params.id}`);
});

module.exports = router;
