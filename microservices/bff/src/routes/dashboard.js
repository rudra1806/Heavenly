/**
 * BFF Dashboard Routes — user dashboard (host + guest views).
 * 
 * Performance optimizations:
 *   - Batch API calls: uses ?listingIds=id1,id2,id3 instead of N individual calls
 *   - Short-lived cache: 30s TTL prevents redundant fetches during tab navigation
 *   - Parallel fetching: independent API calls run concurrently via Promise.all
 *   - Cache invalidation: write operations (POST/PUT/DELETE) clear user cache
 */

const express = require('express');
const router = express.Router();
const { apiCall } = require('../utils/apiClient.js');
const { isLoggedIn } = require('../middleware.js');
const dashCache = require('../utils/dashboardCache.js');

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

/**
 * Fetch user's listings (with cache).
 * This is the most commonly needed data across dashboard routes.
 */
async function fetchUserListings(userId, session) {
    return dashCache.fetchWithCache(`${userId}:listings`, async () => {
        const res = await apiCall(`/api/listings?ownerId=${userId}`, { session })
            .catch(() => ({ data: { listings: [] } }));
        return res.data?.listings || [];
    });
}

/**
 * Fetch bookings for multiple listings in a single batch call.
 * Uses the new ?listingIds=id1,id2,id3 query parameter.
 */
async function fetchHostBookingsBatch(listingIds, session) {
    if (!listingIds.length) return [];
    const idsParam = listingIds.join(',');
    const cacheKey = `batch:bookings:${idsParam}`;
    return dashCache.fetchWithCache(cacheKey, async () => {
        const res = await apiCall(`/api/bookings?listingIds=${idsParam}`, { session })
            .catch(() => ({ data: { bookings: [] } }));
        return (res.data?.bookings || []).map(transformBooking);
    });
}

/**
 * Fetch reviews for multiple listings in a single batch call.
 * Uses the new ?listingIds=id1,id2,id3 query parameter.
 */
async function fetchHostReviewsBatch(listingIds, session) {
    if (!listingIds.length) return [];
    const idsParam = listingIds.join(',');
    const cacheKey = `batch:reviews:${idsParam}`;
    return dashCache.fetchWithCache(cacheKey, async () => {
        const res = await apiCall(`/api/reviews?listingIds=${idsParam}`, { session })
            .catch(() => ({ data: { reviews: [] } }));
        return res.data?.reviews || [];
    });
}

/**
 * Fetch guest bookings for a user (with cache).
 */
async function fetchGuestBookings(userId, session) {
    return dashCache.fetchWithCache(`${userId}:guestBookings`, async () => {
        const res = await apiCall(`/api/bookings?userId=${userId}`, { session })
            .catch(() => ({ data: { bookings: [] } }));
        return (res.data?.bookings || []).map(transformBooking);
    });
}

// GET /dashboard — main dashboard
router.get('/dashboard', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user?.id;
        console.log('[Dashboard] Fetching dashboard for userId:', userId);

        // Step 1: Fetch listings (1 API call)
        const listings = await fetchUserListings(userId, req.session);
        const listingIds = listings.map(l => l._id);

        // Step 2: Fetch guest bookings + host bookings + host reviews in parallel (max 3 API calls)
        const [guestBookings, hostBookings, hostReviews] = await Promise.all([
            fetchGuestBookings(userId, req.session),
            fetchHostBookingsBatch(listingIds, req.session),
            fetchHostReviewsBatch(listingIds, req.session)
        ]);

        console.log('[Dashboard] Guest bookings:', guestBookings.length, 'Host bookings:', hostBookings.length, 'Host reviews:', hostReviews.length);

        // Compute host stats (revenue from bookings on YOUR listings)
        const activeListings = listings.filter(l => l.isAvailable !== false).length;
        const inactiveListings = listings.length - activeListings;
        
        // Calculate host earnings (85% after platform fee) from confirmed/completed bookings
        const totalRevenue = hostBookings
            .filter(b => b.bookingStatus === 'confirmed' || b.bookingStatus === 'completed')
            .reduce((sum, b) => {
                // Use hostEarnings if available (new bookings), otherwise calculate 85% (old bookings)
                const earnings = b.hostEarnings !== undefined ? b.hostEarnings : Math.round((b.totalPrice || 0) * 0.85);
                return sum + earnings;
            }, 0);
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
            totalReviews: hostReviews.length,
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
        const userId = req.session.user?.id;

        // Step 1: Fetch listings (1 API call)
        const listings = await fetchUserListings(userId, req.session);
        const listingIds = listings.map(l => l._id);

        // Step 2: Batch-fetch bookings and reviews for ALL listings (2 API calls instead of 2N)
        const [allBookings, allReviews] = await Promise.all([
            fetchHostBookingsBatch(listingIds, req.session),
            fetchHostReviewsBatch(listingIds, req.session)
        ]);

        // Group bookings and reviews by listingId for per-listing counts
        const bookingsByListing = new Map();
        const reviewsByListing = new Map();

        for (const b of allBookings) {
            const lid = b.listingId;
            bookingsByListing.set(lid, (bookingsByListing.get(lid) || 0) + 1);
        }
        for (const r of allReviews) {
            const lid = r.listingId;
            reviewsByListing.set(lid, (reviewsByListing.get(lid) || 0) + 1);
        }

        const listingData = listings.map(listing => ({
            listing,
            bookingCount: bookingsByListing.get(listing._id) || 0,
            reviewCount: reviewsByListing.get(listing._id) || 0
        }));

        res.render('dashboard/listings.ejs', { listingData });
    } catch (err) {
        console.error('[Dashboard] Error loading listings:', err);
        req.flash('error', 'Failed to load your listings.');
        res.redirect('/dashboard');
    }
});

// POST /dashboard/listings/:id/toggle-availability — toggle availability
// (template form posts to toggle-availability, not just toggle)
router.post('/dashboard/listings/:id/toggle-availability', isLoggedIn, async (req, res) => {
    try {
        // Invalidate cache since listing data changed
        dashCache.invalidateUser(req.session.user?.id);
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
        const guestBookings = await fetchGuestBookings(req.session.user?.id, req.session);
        // Convert date strings to Date objects for template .toLocaleDateString()
        const bookings = guestBookings.map(b => ({
            ...b,
            checkIn: new Date(b.checkIn),
            checkOut: new Date(b.checkOut)
        }));
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

// GET /dashboard/host-bookings — all bookings received on my listings (as host)
router.get('/dashboard/host-bookings', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user?.id;
        
        // Step 1: Fetch listings (1 API call)
        const listings = await fetchUserListings(userId, req.session);
        const listingIds = listings.map(l => l._id);

        // Step 2: Batch-fetch all host bookings (1 API call instead of N)
        const hostBookings = await fetchHostBookingsBatch(listingIds, req.session);

        // Create a listing map for quick lookup
        const listingMap = new Map(listings.map(l => [l._id, l]));

        // Convert date strings to Date objects and enrich with listing data
        const bookings = hostBookings.map(b => ({
            ...b,
            checkIn: new Date(b.checkIn),
            checkOut: new Date(b.checkOut),
            listing: listingMap.get(b.listingId) || b.listing || {
                _id: b.listingId,
                title: b.listingTitle || 'Listing',
                image: { url: b.listingImage || '' },
                location: b.listingLocation || '',
                country: ''
            }
        }));

        res.render('dashboard/host-bookings.ejs', { bookings });
    } catch (err) {
        console.error('[Dashboard] Error loading host bookings:', err);
        req.flash('error', 'Failed to load your bookings.');
        res.redirect('/dashboard');
    }
});

// GET /dashboard/host-reviews — all reviews received on my listings (as host)
router.get('/dashboard/host-reviews', isLoggedIn, async (req, res) => {
    try {
        const userId = req.session.user?.id;
        
        // Step 1: Fetch listings (1 API call)
        const listings = await fetchUserListings(userId, req.session);
        const listingIds = listings.map(l => l._id);

        // Step 2: Batch-fetch all host reviews (1 API call instead of N)
        const hostReviews = await fetchHostReviewsBatch(listingIds, req.session);

        // Create a listing map for quick lookup
        const listingMap = new Map(listings.map(l => [l._id, l]));

        // Enrich reviews with listing data and convert dates
        const reviews = hostReviews.map(r => ({
            ...r,
            createdAt: new Date(r.createdAt),
            listing: listingMap.get(r.listingId) || {
                _id: r.listingId,
                title: 'Listing',
                image: { url: '' },
                location: '',
                country: ''
            }
        }));

        res.render('dashboard/host-reviews.ejs', { reviews });
    } catch (err) {
        console.error('[Dashboard] Error loading host reviews:', err);
        req.flash('error', 'Failed to load your reviews.');
        res.redirect('/dashboard');
    }
});

// POST /dashboard/listings/:id/bookings/:bookingId/cancel — cancel guest booking (host action)
router.post('/dashboard/listings/:id/bookings/:bookingId/cancel', isLoggedIn, async (req, res) => {
    try {
        // Invalidate cache since booking data changed
        dashCache.invalidateUser(req.session.user?.id);
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
