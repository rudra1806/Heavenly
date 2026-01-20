const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const ExpressError = require('../utils/ExpressError.js');
const validateListing = require('../utils/validateListing.js');

// Models
const Listing = require('../models/listing.js');

// Index - Show all listings
router.get('/listings', wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render('listings/index.ejs', { listings: allListings });
}));

// New - Show create form
router.get('/listings/new', (req, res) => {
    res.render('listings/new.ejs');
});

// Create - Add new listing
router.post('/listings', validateListing, wrapAsync(async (req, res) => {
    const newListing = new Listing(req.body);
    await newListing.save();
    res.redirect('/listings');
}));

// Show - Display single listing
router.get('/listings/:id', wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, 'Listing not found');
    }
    res.render('listings/show.ejs', { listing: await listing.populate('reviews') }); // Populate reviews for display 
}));

// Edit - Show edit form
router.get('/listings/:id/edit', wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, 'Listing not found');
    }
    res.render('listings/edit.ejs', { listing });
}));

// Update - Modify existing listing
router.put('/listings/:id', validateListing, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findByIdAndUpdate(id, req.body, { runValidators: true, new: true });
    if (!listing) {
        throw new ExpressError(404, 'Listing not found');
    }
    res.redirect(`/listings/${id}`);
}));

// Delete - Remove listing
router.delete('/listings/:id', wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findByIdAndDelete(id);
    if (!listing) {
        throw new ExpressError(404, 'Listing not found');
    }
    res.redirect('/listings');
}));

module.exports = router;