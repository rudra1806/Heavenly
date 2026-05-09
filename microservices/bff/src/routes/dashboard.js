/**
 * BFF Dashboard Routes — user dashboard (host + guest views).
 */

const express = require('express');
const router = express.Router();
const { apiCall } = require('../utils/apiClient.js');
const { isLoggedIn } = require('../middleware.js');

// GET /dashboard — main dashboard
router.get('/dashboard', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user?.id;
        const data = await apiCall(`/api/admin/user-dashboard/${userId}`, { session: req.session });
        res.render('dashboard/index.ejs', {
            host: data.data?.host || {},
            guest: data.data?.guest || {}
        });
    } catch (err) {
        // If admin endpoint fails, try fetching data directly
        try {
            const [listingsRes, bookingsRes] = await Promise.all([
                apiCall(`/api/listings?ownerId=${req.session.user?.id}`),
                apiCall(`/api/bookings?userId=${req.session.user?.id}`)
            ]);
            res.render('dashboard/index.ejs', {
                host: { listings: listingsRes.data?.listings || [], totalListings: listingsRes.data?.listings?.length || 0 },
                guest: { bookings: bookingsRes.data?.bookings || [], totalBookingsMade: bookingsRes.data?.bookings?.length || 0 }
            });
        } catch {
            req.flash('error', 'Failed to load dashboard.');
            res.redirect('/listings');
        }
    }
});

// GET /dashboard/listings — my listings
router.get('/dashboard/listings', isLoggedIn, async (req, res) => {
    try {
        const data = await apiCall(`/api/listings?ownerId=${req.session.user?.id}`);
        res.render('dashboard/listings.ejs', {
            listings: data.data?.listings || []
        });
    } catch (err) {
        req.flash('error', 'Failed to load your listings.');
        res.redirect('/dashboard');
    }
});

// POST /dashboard/listings/:id/toggle — toggle availability
router.post('/dashboard/listings/:id/toggle', isLoggedIn, async (req, res) => {
    try {
        await apiCall(`/api/listings/${req.params.id}/toggle-availability`, {
            method: 'POST',
            session: req.session
        });
        req.flash('success', 'Availability toggled!');
    } catch (err) {
        req.flash('error', err.message || 'Failed to toggle availability.');
    }
    res.redirect('/dashboard/listings');
});

// GET /dashboard/bookings — my bookings (as guest)
router.get('/dashboard/bookings', isLoggedIn, async (req, res) => {
    try {
        const data = await apiCall(`/api/bookings?userId=${req.session.user?.id}`);
        res.render('dashboard/bookings.ejs', {
            bookings: data.data?.bookings || []
        });
    } catch (err) {
        req.flash('error', 'Failed to load your bookings.');
        res.redirect('/dashboard');
    }
});

// GET /dashboard/listings/:id/bookings — bookings on my listing (as host)
router.get('/dashboard/listings/:id/bookings', isLoggedIn, async (req, res) => {
    try {
        const data = await apiCall(`/api/bookings?listingId=${req.params.id}`);
        res.render('dashboard/listing-bookings.ejs', {
            bookings: data.data?.bookings || [],
            listingId: req.params.id
        });
    } catch (err) {
        req.flash('error', 'Failed to load bookings for this listing.');
        res.redirect('/dashboard/listings');
    }
});

module.exports = router;
