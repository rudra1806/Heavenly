const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const validateReview = require('../utils/validateReview.js');
const isLoggedIn = require('../utils/isLoggedIn.js');

// Models
const Listing = require('../models/listing.js');
const Review = require('../models/review.js');

// Review Route
router.post('/listings/:id/reviews',isLoggedIn, validateReview, wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    const review = new Review(req.body.review);
    console.log(review); // Debugging line to check review data
    listing.reviews.push(review);
    await review.save();
    await listing.save();
    req.flash('success', 'Successfully added a new review!');
    res.redirect(`/listings/${listing._id}`);
}));

//delete review
router.delete('/listings/:id/reviews/:reviewId',isLoggedIn, wrapAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } }); // Remove review reference from listing
    await Review.findByIdAndDelete(reviewId);
    req.flash('success', 'Successfully deleted the review!');
    res.redirect(`/listings/${id}`);
}));

module.exports = router;