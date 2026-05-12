/**
 * BFF Booking Routes — booking creation, payment, and cancellation via API.
 */

const express = require('express');
const router = express.Router();
const { apiCall } = require('../utils/apiClient.js');
const { isLoggedIn } = require('../middleware.js');

/**
 * Transform booking data from microservice format to template format.
 * Microservice uses: status, payment.status
 * Templates expect: bookingStatus, paymentStatus
 */
function transformBooking(booking) {
    if (!booking) return booking;
    return {
        ...booking,
        bookingStatus: booking.status,
        paymentStatus: booking.payment?.status || 'pending',
        paymentId: booking.payment?.transactionId || null,
        listing: booking.listing || {
            _id: booking.listingId,
            title: booking.listingTitle || '',
            image: { url: booking.listingImage || '' },
            location: booking.listingLocation || '',
            country: ''
        }
    };
}

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

// POST /listings/:id/book — create booking (form posts here)
router.post('/listings/:id/book', isLoggedIn, async (req, res) => {
    try {
        const data = await apiCall('/api/bookings', {
            method: 'POST',
            body: {
                listingId: req.params.id,
                checkIn: req.body.checkIn,
                checkOut: req.body.checkOut,
                guests: req.body.guests
            },
            session: req.session
        });
        const booking = data.data?.booking;
        // Redirect to payment page instead of confirmation page
        res.redirect(`/bookings/${booking?._id || ''}/payment`);
    } catch (err) {
        req.flash('error', err.message || 'Failed to create booking.');
        res.redirect(`/listings/${req.params.id}`);
    }
});

// POST /bookings — create booking (API-style fallback)
router.post('/bookings', isLoggedIn, async (req, res) => {
    try {
        const data = await apiCall('/api/bookings', {
            method: 'POST',
            body: req.body,
            session: req.session
        });
        const booking = data.data?.booking;
        // Redirect to payment page instead of confirmation page
        res.redirect(`/bookings/${booking?._id || ''}/payment`);
    } catch (err) {
        req.flash('error', err.message || 'Failed to create booking.');
        res.redirect(`/listings/${req.body.listingId}`);
    }
});

// GET /bookings/:id — show booking
router.get('/bookings/:id', isLoggedIn, async (req, res) => {
    try {
        const data = await apiCall(`/api/bookings/${req.params.id}`, { session: req.session });
        let booking = data.data?.booking;
        if (!booking) {
            req.flash('error', 'Booking not found.');
            return res.redirect('/dashboard/bookings');
        }
        
        // Fetch full listing data to ensure we have all required fields
        try {
            const listingData = await apiCall(`/api/listings/${booking.listingId}`, { session: req.session });
            const listing = listingData.data?.listing;
            if (listing) {
                booking.listing = listing;
            }
        } catch (listingErr) {
            console.warn('Failed to fetch listing for booking:', listingErr.message);
            // Continue with denormalized data if listing fetch fails
        }
        
        // Transform booking data for template compatibility
        booking = transformBooking(booking);
        // Convert date strings to Date objects for template methods
        booking.checkIn = new Date(booking.checkIn);
        booking.checkOut = new Date(booking.checkOut);
        booking.createdAt = new Date(booking.createdAt);
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
        let booking = data.data?.booking;
        if (!booking) {
            req.flash('error', 'Booking not found.');
            return res.redirect('/dashboard/bookings');
        }
        
        // If payment is already completed, redirect to confirmation page
        if (booking.payment?.status === 'completed') {
            req.flash('error', 'Payment already completed.');
            return res.redirect(`/bookings/${req.params.id}`);
        }
        
        // Transform booking data for template compatibility
        booking = transformBooking(booking);
        // Convert date strings to Date objects for template methods
        booking.checkIn = new Date(booking.checkIn);
        booking.checkOut = new Date(booking.checkOut);
        res.render('bookings/payment.ejs', { booking });
    } catch (err) {
        req.flash('error', 'Failed to load payment page.');
        res.redirect('/dashboard/bookings');
    }
});

// POST /bookings/:id/payment — process payment
router.post('/bookings/:id/payment', isLoggedIn, async (req, res) => {
    try {
        const result = await apiCall(`/api/bookings/${req.params.id}/payment`, {
            method: 'POST',
            session: req.session
        });
        
        // Check if Razorpay order was created
        if (result.data?.orderId) {
            // Return Razorpay order details for frontend
            return res.json({
                success: true,
                razorpay: true,
                orderId: result.data.orderId,
                amount: result.data.amount,
                currency: result.data.currency,
                keyId: result.data.keyId,
                bookingId: req.params.id
            });
        }
        
        // Fallback: simulated payment completed
        // Return JSON for AJAX requests
        if (req.headers['content-type'] === 'application/json' || req.xhr || req.headers.accept?.includes('application/json')) {
            return res.json({
                success: true,
                razorpay: false,
                paymentId: result.data?.booking?.payment?.transactionId,
                bookingId: req.params.id
            });
        }
        
        req.flash('success', 'Payment successful!');
        res.redirect(`/bookings/${req.params.id}`);
    } catch (err) {
        // Return JSON error for AJAX requests
        if (req.headers['content-type'] === 'application/json' || req.xhr || req.headers.accept?.includes('application/json')) {
            return res.status(400).json({
                success: false,
                error: err.message || 'Payment failed.'
            });
        }
        
        req.flash('error', err.message || 'Payment failed.');
        res.redirect(`/bookings/${req.params.id}/payment`);
    }
});

// POST /bookings/:id/verify-payment — verify Razorpay payment
router.post('/bookings/:id/verify-payment', isLoggedIn, async (req, res) => {
    try {
        const result = await apiCall(`/api/bookings/${req.params.id}/verify-payment`, {
            method: 'POST',
            body: req.body,
            session: req.session
        });
        
        res.json({
            success: true,
            paymentId: result.data?.booking?.payment?.transactionId,
            bookingId: req.params.id
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            error: err.message || 'Payment verification failed.'
        });
    }
});

// POST /bookings/:id/cancel — cancel booking
router.post('/bookings/:id/cancel', isLoggedIn, async (req, res) => {
    try {
        // Invalidate cache since booking data changed
        const dashCache = require('../utils/dashboardCache.js');
        dashCache.invalidateUser(req.session.user?.id);
        
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
