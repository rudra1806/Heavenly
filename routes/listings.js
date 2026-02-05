const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const ExpressError = require('../utils/ExpressError.js');
const validateListing = require('../utils/validateListing.js');
const isLoggedIn = require('../utils/isLoggedIn.js');
const isOwner = require('../utils/isOwner.js');

// Models
const Listing = require('../models/listing.js');

// controllers

const listingController = require('../controllers/listing.js');

// Multer and Cloudinary setup for image uploads
const multer  = require('multer');
const { storage } = require('../cloudConfig.js');
const upload = multer({ storage });

// Here we could use router.route() for cleaner code, but keeping it explicit for clarity and ease of understanding.



// Index - Show all listings
router.get('/listings', wrapAsync(listingController.index));

// New - Show create form
router.get('/listings/new',isLoggedIn, listingController.newForm);

// Create - Add new listing
router.post('/listings', isLoggedIn, upload.single('image[url]'), validateListing, wrapAsync(listingController.create));

// Show - Display single listing
router.get('/listings/:id', wrapAsync(listingController.show));

// Edit - Show edit form
router.get('/listings/:id/edit', isLoggedIn, isOwner, wrapAsync(listingController.editForm));

// Update - Modify existing listing
router.put('/listings/:id', isLoggedIn, isOwner, upload.single('image[url]'), validateListing, wrapAsync(listingController.update));

// Delete - Remove listing
router.delete('/listings/:id', isLoggedIn, isOwner, wrapAsync(listingController.delete));

module.exports = router;