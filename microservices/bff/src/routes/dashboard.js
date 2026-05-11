/**
 * BFF Dashboard Routes — user dashboard (host + guest views).
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

// GET /dashboard — main dashboard
router.get('/dashboard', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user?.id;
        console.log('[Dashboard] Fetching dashboard for userId:', userId);

        // Fetch listings and bookings in parallel (don't fail if one errors)
        const [listingsRes, guestBookingsRes, reviewsRes] = await Promise.allSettled([
            apiCall(`/api/listings?ownerId=${userId}`, { session: req.session }),
            apiCall(`/api/bookings?userId=${userId}`, { session: req.session }),
            apiCall(`/api/reviews?authorId=${userId}`, { session: req.session })
        ]);

        const listings = listingsRes.status === 'fulfilled' ? (listingsRes.value.data?.listings || []) : [];
        const guestBookings = guestBookingsRes.status === 'fulfilled' ? (guestBookingsRes.value.data?.bookings || []).map(transformBooking) : [];
        const reviews = reviewsRes.status === 'fulfilled' ? (reviewsRes.value.data?.reviews || []) : [];

        console.log('[Dashboard] Found bookings:', guestBookings.length);
        if (guestBookingsRes.status === 'rejected') {
            console.error('[Dashboard] Bookings fetch failed:', guestBookingsRes.reason);
        }

        // Compute host stats
        const activeListings = listings.filter(l => l.isAvailable !== false).length;
        const inactiveListings = listings.length - activeListings;
        const totalRevenue = guestBookings
            .filter(b => b.bookingStatus === 'confirmed' || b.bookingStatus === 'completed')
            .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        // Compute guest stats
        const activeGuestBookings = guestBookings.filter(b => b.bookingStatus === 'confirmed').length;

        // Recent bookings (last 5)
        const recentGuestBookings = guestBookings.slice(0, 5).map(b => ({
            ...b,
            checkIn: new Date(b.checkIn),
            checkOut: new Date(b.checkOut)
        }));

        res.render('dashboard/index.ejs', {
            totalListings: listings.length,
            activeListings,
            inactiveListings,
            totalRevenue,
            hostBookingsCount: 0,
            activeHostBookings: 0,
            totalGuestBookings: guestBookings.length,
            activeGuestBookings,
            totalReviews: reviews.length,
            recentGuestBookings,
            recentHostBookings: []
        });
    } catch (err) {
        console.error('[Dashboard] Error:', err);
        req.flash('error', 'Failed to load dashboard.');
        res.redirect('/listings');
    }
});

// GET /dashboard/listings — my listings
router.get('/dashboard/listings', isLoggedIn, async (req, res) => {
    try {
        const listings = (await apiCall(`/api/listings?ownerId=${req.session.user?.id}`, { session: req.session })).data?.listings || [];

        // Template expects listingData: array of { listing, bookingCount, reviewCount }
        const listingData = listings.map(listing => ({
            listing,
            bookingCount: 0,
            reviewCount: 0
        }));

        res.render('dashboard/listings.ejs', { listingData });
    } catch (err) {
        req.flash('error', 'Failed to load your listings.');
        res.redirect('/dashboard');
    }
});

// POST /dashboard/listings/:id/toggle-availability — toggle availability
// (template form posts to toggle-availability, not just toggle)
router.post('/dashboard/listings/:id/toggle-availability', isLoggedIn, async (req, res) => {
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
        const data = await apiCall(`/api/bookings?userId=${req.session.user?.id}`, { session: req.session });
        // Convert date strings to Date objects for template .toLocaleDateString()
        const bookings = (data.data?.bookings || []).map(b => {
            const transformed = transformBooking(b);
            return {
                ...transformed,
                checkIn: new Date(transformed.checkIn),
                checkOut: new Date(transformed.checkOut)
            };
        });
        res.render('dashboard/bookings.ejs', { bookings });
    } catch (err) {
        req.flash('error', 'Failed to load your bookings.');
        res.redirect('/dashboard');
    }
});

// GET /dashboard/listings/:id/bookings — bookings on my listing (as host)
router.get('/dashboard/listings/:id/bookings', isLoggedIn, async (req, res) => {
    try {
        const [listingRes, bookingsRes] = await Promise.all([
            apiCall(`/api/listings/${req.params.id}`, { session: req.session }),
            apiCall(`/api/bookings?listingId=${req.params.id}`, { session: req.session })
        ]);

        const listing = listingRes.data?.listing || { _id: req.params.id, title: 'Listing', location: '', country: '', price: 0, maxGuests: 0, isAvailable: true, image: { url: '' } };
        // Convert date strings to Date objects for template
        const bookings = (bookingsRes.data?.bookings || []).map(b => {
            const transformed = transformBooking(b);
            return {
                ...transformed,
                checkIn: new Date(transformed.checkIn),
                checkOut: new Date(transformed.checkOut),
                user: transformed.user || { username: transformed.userUsername || transformed.guestUsername || 'Guest', email: transformed.userEmail || '' }
            };
        });

        res.render('dashboard/listing-bookings.ejs', { listing, bookings });
    } catch (err) {
        req.flash('error', 'Failed to load bookings for this listing.');
        res.redirect('/dashboard/listings');
    }
});

// POST /dashboard/listings/:id/bookings/:bookingId/cancel — cancel guest booking (host action)
router.post('/dashboard/listings/:id/bookings/:bookingId/cancel', isLoggedIn, async (req, res) => {
    try {
        await apiCall(`/api/bookings/${req.params.bookingId}/cancel`, {
            method: 'POST',
            session: req.session
        });
        req.flash('success', 'Booking cancelled.');
    } catch (err) {
        req.flash('error', err.message || 'Failed to cancel booking.');
    }
    res.redirect(`/dashboard/listings/${req.params.id}/bookings`);
});

module.exports = router;
