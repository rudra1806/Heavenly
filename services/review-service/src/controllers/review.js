/**
 * Review Controller — handles review CRUD and listing-level stats.
 */

const Review = require('../models/review.js');

let publishEvent = null;

function setPublishEvent(fn) {
    publishEvent = fn;
}

/**
 * GET /reviews?listingId=X or /reviews?authorId=X
 * Returns reviews filtered by listing or author.
 */
async function getReviews(req, res) {
    try {
        const filter = {};
        // Support batch query: ?listingIds=id1,id2,id3 (preferred for bulk)
        // Falls back to single: ?listingId=id1
        if (req.query.listingIds) {
            const ids = req.query.listingIds.split(',').map(id => id.trim()).filter(Boolean);
            filter.listingId = { $in: ids };
        } else if (req.query.listingId) {
            filter.listingId = req.query.listingId;
        }
        if (req.query.authorId) filter.authorId = req.query.authorId;

        const reviews = await Review.find(filter).sort({ createdAt: -1 });

        // Calculate average rating if filtered by listing
        let averageRating = null;
        if (req.query.listingId && reviews.length > 0) {
            const total = reviews.reduce((sum, r) => sum + r.rating, 0);
            averageRating = (total / reviews.length).toFixed(1);
        }

        res.json({
            success: true,
            data: {
                reviews,
                count: reviews.length,
                averageRating: averageRating ? parseFloat(averageRating) : null
            }
        });
    } catch (err) {
        console.error('[Review] getReviews error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
    }
}

/**
 * GET /reviews/:id
 * Returns a single review by ID.
 */
async function getReview(req, res) {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, error: 'Review not found.' });
        }
        res.json({ success: true, data: { review } });
    } catch (err) {
        console.error('[Review] getReview error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch review.' });
    }
}

/**
 * POST /reviews
 * Creates a new review. Author info comes from JWT via gateway headers.
 */
async function createReview(req, res) {
    try {
        const authorId = req.headers['x-user-id'] || req.user?.id;
        const authorUsername = req.headers['x-user-username'] || req.user?.username || 'Unknown User';

        if (!authorId) {
            return res.status(401).json({ success: false, error: 'Authentication required.' });
        }

        const { comment, rating, listingId } = req.body;

        // Prevent reviewing your own listing (optional — check listing ownership)
        // This would require an HTTP call to the Listing Service
        // For now, we allow it and let the BFF/frontend prevent it

        const review = new Review({
            comment,
            rating,
            listingId,
            authorId,
            authorUsername
        });

        await review.save();

        // Publish event
        if (publishEvent) {
            await publishEvent('review.created', {
                reviewId: review._id.toString(),
                listingId: review.listingId,
                authorId: review.authorId,
                rating: review.rating
            });
        }

        console.log(`[Review] Created: rating ${rating}/5 for listing ${listingId} by ${authorUsername}`);

        res.status(201).json({
            success: true,
            message: 'Review created successfully.',
            data: { review }
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ success: false, error: messages.join(', ') });
        }
        console.error('[Review] createReview error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to create review.' });
    }
}

/**
 * DELETE /reviews/:id
 * Deletes a review. Only the author or admin can delete.
 */
async function deleteReview(req, res) {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, error: 'Review not found.' });
        }

        // Authorization: only author or admin
        const userId = req.headers['x-user-id'] || req.user?.id;
        const userRole = req.headers['x-user-role'] || req.user?.role;
        if (review.authorId !== userId && userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'You do not have permission to delete this review.' });
        }

        await Review.findByIdAndDelete(req.params.id);

        // Publish event
        if (publishEvent) {
            await publishEvent('review.deleted', {
                reviewId: review._id.toString(),
                listingId: review.listingId,
                authorId: review.authorId
            });
        }

        console.log(`[Review] Deleted: review ${req.params.id}`);

        res.json({
            success: true,
            message: 'Review deleted successfully.'
        });
    } catch (err) {
        console.error('[Review] deleteReview error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to delete review.' });
    }
}

/**
 * GET /reviews/stats/:listingId
 * Returns rating stats for a listing (count + average).
 * Used by the BFF to display star ratings without fetching all reviews.
 */
async function getListingStats(req, res) {
    try {
        const { listingId } = req.params;
        const reviews = await Review.find({ listingId });

        let averageRating = 0;
        if (reviews.length > 0) {
            const total = reviews.reduce((sum, r) => sum + r.rating, 0);
            averageRating = parseFloat((total / reviews.length).toFixed(1));
        }

        res.json({
            success: true,
            data: {
                listingId,
                count: reviews.length,
                averageRating
            }
        });
    } catch (err) {
        console.error('[Review] getListingStats error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch stats.' });
    }
}

module.exports = {
    getReviews,
    getReview,
    createReview,
    deleteReview,
    getListingStats,
    setPublishEvent
};
