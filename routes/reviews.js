const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const validateReview = require('../utils/validateReview.js');
const isLoggedIn = require('../utils/isLoggedIn.js');
const isAuthor = require('../utils/isAuthor.js');

// Models
const Listing = require('../models/listing.js');
const Review = require('../models/review.js');

//controllers
const reviewController = require('../controllers/review.js');

// Review Route
router.post('/listings/:id/reviews',isLoggedIn, validateReview, wrapAsync(reviewController.createReview));

//delete review
router.delete('/listings/:id/reviews/:reviewId',isLoggedIn,isAuthor, wrapAsync(reviewController.deleteReview));

module.exports = router;