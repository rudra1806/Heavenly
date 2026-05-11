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
        // Ensure listing object exists with denormalized data
        listing: booking.listing || {
            _id: booking.listingId,
            title: booking.listingTitle || '',
            image: { url: booking.listingImage || '' },
            location: booking.listingLocation || '',
            country: ''
        },
        // Ensure guest username is available
        guestUsername: booking.guestUsername || 'Guest'
    };
}

// GET /dashboard — main dashboard
router.get('/dashboard', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user?.id;
        console.log('[Dashboard] Fetching dashboard for userId:', userId);

        // Fetch listings first to get listing IDs
        const listingsRes = await apiCall(`/api/listings?ownerId=${userId}`, { session: req.session }).catch(() => ({ data: { listings: [] } }));
        const listings = listingsRes.data?.listings || [];
        const listingIds = listings.map(l => l._id);

        // Fetch guest bookings
        const guestBookingsRes = await apiCall(`/api/bookings?userId=${userId}`, { session: req.session }).catch(() => ({ data: { bookings: [] } }));
        const guestBookings = (guestBookingsRes.data?.bookings || []).map(transformBooking);

        // Fetch host bookings - need to fetch for each listing individually
        let hostBookings = [];
        if (listingIds.length > 0) {
            console.log('[Dashboard] Fetching bookings for', listingIds.length, 'listings');
            const hostBookingPromises = listingIds.map(listingId =>
                apiCall(`/api/bookings?listingId=${listingId}`, { session: req.session })
                    .then(res => res.data?.bookings || [])
                    .catch(err => {
                        console.error(`[Dashboard] Failed to fetch bookings for listing ${listingId}:`, err.message);
                        return [];
                    })
            );
            const hostBookingArrays = await Promise.all(hostBookingPromises);
            hostBookings = hostBookingArrays.flat().map(transformBooking);
            console.log('[Dashboard] Total host bookings found:', hostBookings.length);
        }

        // Fetch reviews
        const reviewsRes = await apiCall(`/api/reviews?authorId=${userId}`, { session: req.session }).catch(() => ({ data: { reviews: [] } }));
        const reviews = reviewsRes.data?.reviews || [];

        console.log('[Dashboard] Guest bookings:', guestBookings.length, 'Host bookings:', hostBookings.length);

        // Compute host stats (revenue from bookings on YOUR listings)
        const activeListings = listings.filter(l => l.isAvailable !== false).length;
        const inactiveListings = listings.length - activeListings;
        const totalRevenue = hostBookings
            .filter(b => b.bookingStatus === 'confirmed' || b.bookingStatus === 'completed')
            .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        const activeHostBookings = hostBookings.filter(b => b.bookingStatus === 'confirmed').length;

        // Compute guest stats (your travel bookings)
        const activeGuestBookings = guestBookings.filter(b => b.bookingStatus === 'confirmed').length;
        const completedGuestBookings = guestBookings.filter(b => b.bookingStatus === 'completed').length;
        const totalSpent = guestBookings
            .filter(b => b.bookingStatus === 'confirmed' || b.bookingStatus === 'completed')
            .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
        
        // Count unique places visited (completed bookings)
        const uniquePlaces = new Set(
            guestBookings
                .filter(b => b.bookingStatus === 'completed')
                .map(b => b.listing?.location || b.listingLocation)
        ).size;

        // Recent bookings (last 5)
        const recentGuestBookings = guestBookings.slice(0, 5).map(b => ({
            ...b,
            checkIn: new Date(b.checkIn),
            checkOut: new Date(b.checkOut)
        }));

        const recentHostBookings = hostBookings.slice(0, 5).map(b => ({
            ...b,
            checkIn: new Date(b.checkIn),
            checkOut: new Date(b.checkOut)
        }));

        res.render('dashboard/index.ejs', {
            // Host stats
            totalListings: listings.length,
            activeListings,
            inactiveListings,
            totalRevenue,
            hostBookingsCount: hostBookings.length,
            activeHostBookings,
            totalReviews: reviews.length,
            recentHostBookings,
            // Guest stats
            totalGuestBookings: guestBookings.length,
            activeGuestBookings,
            completedGuestBookings,
            totalSpent,
            uniquePlaces,
            recentGuestBookings
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
