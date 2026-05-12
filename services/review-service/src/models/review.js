/**
 * Review model for the Review Service.
 * 
 * Key differences from the monolith:
 *   - listingId and authorId stored as plain strings (not ObjectId refs)
 *   - No cross-DB populate — author info fetched via Auth Service HTTP call
 *   - Standalone collection — not embedded in Listing document
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    comment: {
        type: String,
        required: [true, 'Review comment is required'],
        trim: true,
        minlength: [5, 'Comment must be at least 5 characters'],
        maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    // References stored as plain strings — no cross-DB ObjectId refs
    listingId: {
        type: String,
        required: [true, 'Listing ID is required'],
        index: true
    },
    authorId: {
        type: String,
        required: [true, 'Author ID is required'],
        index: true
    },
    // Denormalized author username for display (avoids HTTP call on every read)
    authorUsername: {
        type: String,
        default: 'Unknown User'
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
reviewSchema.index({ listingId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
