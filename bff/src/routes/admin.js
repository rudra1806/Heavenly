/**
 * BFF Admin Routes — admin dashboard and CRUD via API.
 */

const express = require('express');
const router = express.Router();
const { apiCall } = require('../utils/apiClient.js');
const { isLoggedIn, isAdmin } = require('../middleware.js');

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

// GET /admin — redirect to dashboard (matches navbar link)
router.get('/admin', isLoggedIn, isAdmin, (req, res) => {
    res.redirect('/admin/dashboard');
});

// GET /admin/dashboard — admin dashboard
router.get('/admin/dashboard', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const data = await apiCall('/api/admin/dashboard', { session: req.session });
        const apiData = data.data || {};
        
        // Flatten the nested structure from API
        const stats = apiData.stats || {};
        const recent = apiData.recent || {};
        
        // Transform recent bookings if they exist
        const recentBookings = (recent.bookings || []).map(transformBooking);
        
        // Prepare flat data structure for template
        const dashboardData = {
            // Stats (flat)
            totalUsers: stats.totalUsers || 0,
            totalListings: stats.totalListings || 0,
            totalReviews: stats.totalReviews || 0,
            totalBookings: stats.totalBookings || 0,
            confirmedBookings: stats.confirmedBookings || 0,
            cancelledBookings: stats.cancelledBookings || 0,
            completedBookings: stats.completedBookings || 0,
            pendingBookings: stats.pendingBookings || 0,
            paidBookings: stats.paidBookings || 0,
            pendingPayments: stats.pendingPayments || 0,
            refundedPayments: stats.refundedPayments || 0,
            platformRevenue: stats.platformRevenue || 0,  // 15% platform fee
            totalRevenue: stats.totalRevenue || 0,  // Total transaction volume
            totalGuests: stats.totalGuests || 0,
            // Recent activity
            recentUsers: recent.users || [],
            recentListings: recent.listings || [],
            recentReviews: recent.reviews || [],
            recentBookings: recentBookings
        };
        
        res.render('admin/dashboard.ejs', dashboardData);
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
        const search = req.query.search || '';
        const status = req.query.status || '';
        
        // Build API URL with query parameters
        let url = '/api/admin/bookings';
        const params = [];
        if (search) params.push(`search=${encodeURIComponent(search)}`);
        if (status) params.push(`status=${encodeURIComponent(status)}`);
        if (params.length > 0) url += '?' + params.join('&');
        
        const data = await apiCall(url, { session: req.session });
        const bookings = (data.data?.bookings || []).map(booking => {
            const transformed = transformBooking(booking);
            // Convert date strings to Date objects for template methods
            transformed.checkIn = new Date(transformed.checkIn);
            transformed.checkOut = new Date(transformed.checkOut);
            transformed.createdAt = new Date(transformed.createdAt);
            return transformed;
        });
        
        res.render('admin/bookings.ejs', { 
            bookings,
            searchQuery: search,
            statusFilter: status
        });
    } catch (err) {
        req.flash('error', 'Failed to load bookings.');
        res.redirect('/admin/dashboard');
    }
});

// POST /admin/bookings/:id/cancel — cancel booking
router.post('/admin/bookings/:id/cancel', isLoggedIn, isAdmin, async (req, res) => {
    try {
        await apiCall(`/api/bookings/${req.params.id}/cancel`, {
            method: 'POST',
            session: req.session
        });
        req.flash('success', 'Booking cancelled successfully.');
    } catch (err) {
        req.flash('error', err.message || 'Failed to cancel booking.');
    }
    res.redirect('/admin/bookings');
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
