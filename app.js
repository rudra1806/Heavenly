const express = require('express');
const app = express();
const port = 8080;
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');


// Custom utilities
const wrapAsync = require('./utils/wrapAsync.js');
const ExpressError = require('./utils/ExpressError.js');
const validateListing = require('./utils/validateListing.js');
const validateReview = require('./utils/validateReview.js');

// Models
const Listing = require('./models/listing.js');
const Review = require('./models/review.js');

// Database connection
const MONGO_URL = 'mongodb://127.0.0.1:27017/heavenly';

// ===== Middleware Setup =====
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// ===== Database Connection =====
mongoose.connect(MONGO_URL)
    .then(() => console.log('Successfully Connected to MongoDB'))
    .catch(err => console.log('MongoDB Connection Error:', err));

// ===== Routes =====

// Home
app.get('/', (req, res) => {
    res.send('Hello, server is up and running!');
});

// Index - Show all listings
app.get('/listings', wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render('listings/index.ejs', { listings: allListings });
}));

// New - Show create form
app.get('/listings/new', (req, res) => {
    res.render('listings/new.ejs');
});

// Create - Add new listing
app.post('/listings', validateListing, wrapAsync(async (req, res) => {
    const newListing = new Listing(req.body);
    await newListing.save();
    res.redirect('/listings');
}));

// Show - Display single listing
app.get('/listings/:id', wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, 'Listing not found');
    }
    res.render('listings/show.ejs', { listing: await listing.populate('reviews') }); // Populate reviews for display 
}));

// Edit - Show edit form
app.get('/listings/:id/edit', wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, 'Listing not found');
    }
    res.render('listings/edit.ejs', { listing });
}));

// Update - Modify existing listing
app.put('/listings/:id', validateListing, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findByIdAndUpdate(id, req.body, { runValidators: true, new: true });
    if (!listing) {
        throw new ExpressError(404, 'Listing not found');
    }
    res.redirect(`/listings/${id}`);
}));

// Delete - Remove listing
app.delete('/listings/:id', wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findByIdAndDelete(id);
    if (!listing) {
        throw new ExpressError(404, 'Listing not found');
    }
    res.redirect('/listings');
}));

// Review Route
app.post('/listings/:id/reviews',validateReview, wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    const review = new Review(req.body.review);
    console.log(review); // Debugging line to check review data
    listing.reviews.push(review);
    await review.save();
    await listing.save();
    res.redirect(`/listings/${listing._id}`);
}));

//delete review
app.delete('/listings/:id/reviews/:reviewId', wrapAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } }); // Remove review reference from listing
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/listings/${id}`);
}));


// ===== Error Handling =====

// 404 - Catch unmatched routes
app.use((req, res, next) => {
    next(new ExpressError(404, 'Page Not Found'));
});

// Global error handler
app.use((err, req, res, next) => {
    const { statusCode = 500, message = 'Something went wrong!' } = err;
    res.status(statusCode).render('error.ejs', { statusCode, message });
});

// ===== Start Server =====
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});