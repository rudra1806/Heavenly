/**
 * BFF Listing Routes — renders EJS templates with data from Listing Service.
 */

const express = require('express');
const router = express.Router();
const { apiCall } = require('../utils/apiClient.js');
const { isLoggedIn } = require('../middleware.js');

// GET /listings — index page
router.get('/listings', async (req, res) => {
    try {
        const data = await apiCall('/api/listings');
        res.render('listings/index.ejs', {
            listings: data.data?.listings || []
        });
    } catch (err) {
        req.flash('error', 'Failed to load listings.');
        res.redirect('/');
    }
});

// GET /listings/new — new listing form
router.get('/listings/new', isLoggedIn, (req, res) => {
    res.render('listings/new.ejs');
});

// GET /listings/:id — show listing
router.get('/listings/:id', async (req, res) => {
    try {
        const [listingRes, reviewsRes] = await Promise.all([
            apiCall(`/api/listings/${req.params.id}`),
            apiCall(`/api/reviews?listingId=${req.params.id}`)
        ]);

        const listing = listingRes.data?.listing;
        if (!listing) {
            req.flash('error', 'Listing not found.');
            return res.redirect('/listings');
        }

        // Fetch owner info
        let owner = null;
        if (listing.ownerId) {
            try {
                const ownerRes = await apiCall(`/api/auth/users/${listing.ownerId}`, { session: req.session });
                owner = ownerRes.data?.user;
            } catch { /* owner fetch failed — show listing without owner info */ }
        }

        res.render('listings/show.ejs', {
            listing,
            reviews: reviewsRes.data?.reviews || [],
            averageRating: reviewsRes.data?.averageRating || 0,
            owner
        });
    } catch (err) {
        req.flash('error', 'Failed to load listing.');
        res.redirect('/listings');
    }
});

// POST /listings — create listing
router.post('/listings', isLoggedIn, async (req, res) => {
    try {
        await apiCall('/api/listings', {
            method: 'POST',
            body: req.body,
            session: req.session
        });
        req.flash('success', 'Listing created successfully!');
        res.redirect('/listings');
    } catch (err) {
        req.flash('error', err.message || 'Failed to create listing.');
        res.redirect('/listings/new');
    }
});

// GET /listings/:id/edit — edit form
router.get('/listings/:id/edit', isLoggedIn, async (req, res) => {
    try {
        const data = await apiCall(`/api/listings/${req.params.id}`);
        const listing = data.data?.listing;
        if (!listing) {
            req.flash('error', 'Listing not found.');
            return res.redirect('/listings');
        }
        res.render('listings/edit.ejs', { listing });
    } catch (err) {
        req.flash('error', 'Failed to load listing.');
        res.redirect('/listings');
    }
});

// PUT /listings/:id — update listing
router.put('/listings/:id', isLoggedIn, async (req, res) => {
    try {
        await apiCall(`/api/listings/${req.params.id}`, {
            method: 'PUT',
            body: req.body,
            session: req.session
        });
        req.flash('success', 'Listing updated successfully!');
        res.redirect(`/listings/${req.params.id}`);
    } catch (err) {
        req.flash('error', err.message || 'Failed to update listing.');
        res.redirect(`/listings/${req.params.id}/edit`);
    }
});

// DELETE /listings/:id — delete listing
router.delete('/listings/:id', isLoggedIn, async (req, res) => {
    try {
        await apiCall(`/api/listings/${req.params.id}`, {
            method: 'DELETE',
            session: req.session
        });
        req.flash('success', 'Listing deleted successfully!');
        res.redirect('/listings');
    } catch (err) {
        req.flash('error', err.message || 'Failed to delete listing.');
        res.redirect(`/listings/${req.params.id}`);
    }
});

module.exports = router;
