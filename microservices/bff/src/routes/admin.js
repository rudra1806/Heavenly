/**
 * BFF Admin Routes — admin dashboard and CRUD via API.
 */

const express = require('express');
const router = express.Router();
const { apiCall } = require('../utils/apiClient.js');
const { isLoggedIn, isAdmin } = require('../middleware.js');

// GET /admin/dashboard — admin dashboard
router.get('/admin/dashboard', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const data = await apiCall('/api/admin/dashboard', { session: req.session });
        res.render('admin/dashboard.ejs', data.data || {});
    } catch (err) {
        req.flash('error', 'Failed to load admin dashboard.');
        res.redirect('/listings');
    }
});

// GET /admin/users — manage users
router.get('/admin/users', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const search = req.query.search || '';
        const url = search ? `/api/admin/users?search=${encodeURIComponent(search)}` : '/api/admin/users';
        const data = await apiCall(url, { session: req.session });
        res.render('admin/users.ejs', {
            users: data.data?.users || [],
            searchQuery: search
        });
    } catch (err) {
        req.flash('error', 'Failed to load users.');
        res.redirect('/admin/dashboard');
    }
});

// DELETE /admin/users/:id — delete user
router.delete('/admin/users/:id', isLoggedIn, isAdmin, async (req, res) => {
    try {
        await apiCall(`/api/admin/users/${req.params.id}`, {
            method: 'DELETE',
            session: req.session
        });
        req.flash('success', 'User deleted successfully.');
    } catch (err) {
        req.flash('error', err.message || 'Failed to delete user.');
    }
    res.redirect('/admin/users');
});

// GET /admin/listings — manage listings
router.get('/admin/listings', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const search = req.query.search || '';
        const url = search ? `/api/admin/listings?search=${encodeURIComponent(search)}` : '/api/admin/listings';
        const data = await apiCall(url, { session: req.session });
        res.render('admin/listings.ejs', {
            listings: data.data?.listings || [],
            searchQuery: search
        });
    } catch (err) {
        req.flash('error', 'Failed to load listings.');
        res.redirect('/admin/dashboard');
    }
});

// DELETE /admin/listings/:id — delete listing
router.delete('/admin/listings/:id', isLoggedIn, isAdmin, async (req, res) => {
    try {
        await apiCall(`/api/admin/listings/${req.params.id}`, {
            method: 'DELETE',
            session: req.session
        });
        req.flash('success', 'Listing deleted successfully.');
    } catch (err) {
        req.flash('error', err.message || 'Failed to delete listing.');
    }
    res.redirect('/admin/listings');
});

// GET /admin/reviews — manage reviews
router.get('/admin/reviews', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const search = req.query.search || '';
        const url = search ? `/api/admin/reviews?search=${encodeURIComponent(search)}` : '/api/admin/reviews';
        const data = await apiCall(url, { session: req.session });
        res.render('admin/reviews.ejs', {
            reviews: data.data?.reviews || [],
            searchQuery: search
        });
    } catch (err) {
        req.flash('error', 'Failed to load reviews.');
        res.redirect('/admin/dashboard');
    }
});

// DELETE /admin/reviews/:id — delete review
router.delete('/admin/reviews/:id', isLoggedIn, isAdmin, async (req, res) => {
    try {
        await apiCall(`/api/admin/reviews/${req.params.id}`, {
            method: 'DELETE',
            session: req.session
        });
        req.flash('success', 'Review deleted successfully.');
    } catch (err) {
        req.flash('error', err.message || 'Failed to delete review.');
    }
    res.redirect('/admin/reviews');
});

// GET /admin/bookings — manage bookings
router.get('/admin/bookings', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const data = await apiCall('/api/admin/bookings', { session: req.session });
        res.render('admin/bookings.ejs', {
            bookings: data.data?.bookings || []
        });
    } catch (err) {
        req.flash('error', 'Failed to load bookings.');
        res.redirect('/admin/dashboard');
    }
});

// DELETE /admin/bookings/:id — delete booking
router.delete('/admin/bookings/:id', isLoggedIn, isAdmin, async (req, res) => {
    try {
        await apiCall(`/api/admin/bookings/${req.params.id}`, {
            method: 'DELETE',
            session: req.session
        });
        req.flash('success', 'Booking deleted successfully.');
    } catch (err) {
        req.flash('error', err.message || 'Failed to delete booking.');
    }
    res.redirect('/admin/bookings');
});

module.exports = router;
