const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const ExpressError = require('../utils/ExpressError.js');
const validateListing = require('../utils/validateListing.js');
const isLoggedIn = require('../utils/isLoggedIn.js');
const isOwner = require('../utils/isOwner.js');

// Models
const Listing = require('../models/listing.js');

// Index - Show all listings
router.get('/listings', wrapAsync(async (req, res) => {
    const allListings = await Listing.find({});
    res.render('listings/index.ejs', { listings: allListings });
}));

// New - Show create form
router.get('/listings/new',isLoggedIn, (req, res) => {
    res.render('listings/new.ejs');
});

// Create - Add new listing
router.post('/listings', isLoggedIn, validateListing, wrapAsync(async (req, res) => {
    const newListing = new Listing(req.body);
    newListing.owner = req.user._id; // Set the owner to current logged in user
    await newListing.save();
    req.flash('success', 'Successfully created a new listing!');
    res.redirect('/listings');
}));

// Show - Display single listing
router.get('/listings/:id', wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id)
        .populate('reviews')
        .populate('owner');
    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }
    res.render('listings/show.ejs', { listing });
}));

// Edit - Show edit form
router.get('/listings/:id/edit', isLoggedIn, isOwner, wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }
    res.render('listings/edit.ejs', { listing });
}));

// Update - Modify existing listing
router.put('/listings/:id', isLoggedIn, isOwner, validateListing, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findByIdAndUpdate(id, req.body, { runValidators: true, new: true });
    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }
    req.flash('success', 'Successfully updated the listing!');
    res.redirect(`/listings/${id}`);
}));

// Delete - Remove listing
router.delete('/listings/:id', isLoggedIn, isOwner, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findByIdAndDelete(id);
    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }
    req.flash('success', 'Successfully deleted the listing!');
    res.redirect('/listings');
}));

module.exports = router;