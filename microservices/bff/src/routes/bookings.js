/**
 * BFF Booking Routes — booking creation, payment, and cancellation via API.
 */

const express = require('express');
const router = express.Router();
const { apiCall } = require('../utils/apiClient.js');
const { isLoggedIn } = require('../middleware.js');

// GET /listings/:id/book — booking form
router.get('/listings/:id/book', isLoggedIn, async (req, res) => {
    try {
        const data = await apiCall(`/api/listings/${req.params.id}`);
        const listing = data.data?.listing;
        if (!listing) {
            req.flash('error', 'Listing not found.');
            return res.redirect('/listings');
        }
        res.render('bookings/new.ejs', { listing });
    } catch (err) {
        req.flash('error', 'Failed to load listing.');
        res.redirect('/listings');
    }
});

// POST /bookings — create booking
router.post('/bookings', isLoggedIn, async (req, res) => {
    try {
        const data = await apiCall('/api/bookings', {
            method: 'POST',
            body: req.body,
            session: req.session
        });
        const booking = data.data?.booking;
        req.flash('success', 'Booking created! Proceed to payment.');
        res.redirect(`/bookings/${booking?._id || ''}`);
    } catch (err) {
        req.flash('error', err.message || 'Failed to create booking.');
        res.redirect(`/listings/${req.body.listingId}`);
    }
});

// GET /bookings/:id — show booking
router.get('/bookings/:id', isLoggedIn, async (req, res) => {
    try {
        const data = await apiCall(`/api/bookings/${req.params.id}`, { session: req.session });
        const booking = data.data?.booking;
        if (!booking) {
            req.flash('error', 'Booking not found.');
            return res.redirect('/dashboard/bookings');
        }
        res.render('bookings/show.ejs', { booking });
    } catch (err) {
        req.flash('error', 'Failed to load booking.');
        res.redirect('/dashboard/bookings');
    }
});

// GET /bookings/:id/payment — payment page
router.get('/bookings/:id/payment', isLoggedIn, async (req, res) => {
    try {
        const data = await apiCall(`/api/bookings/${req.params.id}`, { session: req.session });
        const booking = data.data?.booking;
        if (!booking) {
            req.flash('error', 'Booking not found.');
            return res.redirect('/dashboard/bookings');
        }
        res.render('bookings/payment.ejs', { booking });
    } catch (err) {
        req.flash('error', 'Failed to load payment page.');
        res.redirect('/dashboard/bookings');
    }
});

// POST /bookings/:id/payment — process payment
router.post('/bookings/:id/payment', isLoggedIn, async (req, res) => {
    try {
        await apiCall(`/api/bookings/${req.params.id}/payment`, {
            method: 'POST',
            session: req.session
        });
        req.flash('success', 'Payment successful!');
        res.redirect(`/bookings/${req.params.id}`);
    } catch (err) {
        req.flash('error', err.message || 'Payment failed.');
        res.redirect(`/bookings/${req.params.id}/payment`);
    }
});

// POST /bookings/:id/cancel — cancel booking
router.post('/bookings/:id/cancel', isLoggedIn, async (req, res) => {
    try {
        await apiCall(`/api/bookings/${req.params.id}/cancel`, {
            method: 'POST',
            session: req.session
        });
        req.flash('success', 'Booking cancelled.');
        res.redirect('/dashboard/bookings');
    } catch (err) {
        req.flash('error', err.message || 'Failed to cancel booking.');
        res.redirect(`/bookings/${req.params.id}`);
    }
});

module.exports = router;
