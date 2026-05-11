/**
 * Admin/Dashboard Aggregator Controller
 * 
 * This service owns NO data. It's a pure aggregation layer that calls
 * Auth, Listing, Review, and Booking services to compile:
 *   - Platform-wide dashboard statistics
 *   - User dashboard (host + guest views)
 *   - Admin CRUD operations (delegates to owning services)
 */

let serviceClient = null;
let AUTH_URL = '';
let LISTING_URL = '';
let REVIEW_URL = '';
let BOOKING_URL = '';

function setDependencies(deps) {
    serviceClient = deps.serviceClient;
    AUTH_URL = deps.authServiceUrl || '';
    LISTING_URL = deps.listingServiceUrl || '';
    REVIEW_URL = deps.reviewServiceUrl || '';
    BOOKING_URL = deps.bookingServiceUrl || '';
}

// ===== Helper: safe service call (returns null on failure) =====
async function safeGet(url, headers = {}) {
    try {
        return await serviceClient.get(url, { headers });
    } catch {
        return null;
    }
}

/**
 * GET /admin/dashboard
 * 
 * Platform-wide statistics aggregated from all services.
 * Mirrors the monolith's admin dashboard but via HTTP calls.
 */
async function getDashboard(req, res) {
    try {
        // Parallel calls to all services for stats
        const [usersRes, listingsRes, reviewsRes, bookingsRes] = await Promise.all([
            safeGet(`${AUTH_URL}/auth/users`, { authorization: req.headers.authorization }),
            safeGet(`${LISTING_URL}/listings`),
            safeGet(`${REVIEW_URL}/reviews`),
            safeGet(`${BOOKING_URL}/bookings`)
        ]);

        const users = usersRes?.data?.users || [];
        const listings = listingsRes?.data?.listings || [];
        const reviews = reviewsRes?.data?.reviews || [];
        const bookings = bookingsRes?.data?.bookings || [];

        // Create lookup maps for enrichment
        const userMap = new Map(users.map(u => [u._id?.toString() || u.id?.toString(), u]));
        const listingMap = new Map(listings.map(l => [l._id?.toString() || l.id?.toString(), l]));

        // Enrich listings with owner data
        const enrichedListings = listings.map(listing => ({
            ...listing,
            owner: userMap.get(listing.ownerId?.toString()) || null
        }));

        // Enrich bookings with user and listing data
        const enrichedBookings = bookings.map(booking => ({
            ...booking,
            user: userMap.get(booking.userId?.toString()) || null,
            listing: listingMap.get(booking.listingId?.toString()) || null
        }));

        // Enrich reviews with author data
        const enrichedReviews = reviews.map(review => ({
            ...review,
            author: userMap.get(review.authorId?.toString()) || null
        }));

        // Booking status breakdown
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
        const completedBookings = bookings.filter(b => b.status === 'completed').length;
        const pendingBookings = bookings.filter(b => b.status === 'pending').length;

        // Payment stats
        const paidBookings = bookings.filter(b => b.payment?.status === 'completed').length;
        const pendingPayments = bookings.filter(b => b.payment?.status === 'pending').length;
        const refundedPayments = bookings.filter(b => b.payment?.status === 'refunded').length;

        // Revenue calculation
        const totalRevenue = bookings
            .filter(b => b.payment?.status === 'completed')
            .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        // Total guests served (non-cancelled bookings)
        const totalGuests = bookings
            .filter(b => b.status !== 'cancelled')
            .reduce((sum, b) => sum + (b.guests || 0), 0);

        // Recent activity (last 5 of each) - use enriched data
        const recentUsers = users.slice(0, 5);
        const recentListings = enrichedListings.slice(0, 5);
        const recentReviews = enrichedReviews.slice(0, 5);
        const recentBookings = enrichedBookings.slice(0, 5);

        res.json({
            success: true,
            data: {
                stats: {
                    totalUsers: users.length,
                    totalListings: listings.length,
                    totalReviews: reviews.length,
                    totalBookings: bookings.length,
                    confirmedBookings,
                    cancelledBookings,
                    completedBookings,
                    pendingBookings,
                    paidBookings,
                    pendingPayments,
                    refundedPayments,
                    totalRevenue,
                    totalGuests
                },
                recent: {
                    users: recentUsers,
                    listings: recentListings,
                    reviews: recentReviews,
                    bookings: recentBookings
                }
            }
        });
    } catch (err) {
        console.error('[Admin] getDashboard error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to load dashboard.' });
    }
}

/**
 * GET /admin/users?search=X
 * Lists all users (delegates to Auth Service).
 */
async function getAllUsers(req, res) {
    try {
        const search = req.query.search || '';
        const url = search
            ? `${AUTH_URL}/auth/users?search=${encodeURIComponent(search)}`
            : `${AUTH_URL}/auth/users`;

        const response = await serviceClient.get(url, {
            headers: { authorization: req.headers.authorization }
        });

        res.json({
            success: true,
            data: response.data
        });
    } catch (err) {
        console.error('[Admin] getAllUsers error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch users.' });
    }
}

/**
 * DELETE /admin/users/:id
 * Deletes a user via Auth Service (which publishes user.deleted for cascades).
 */
async function deleteUser(req, res) {
    try {
        const response = await serviceClient.delete(
            `${AUTH_URL}/auth/users/${req.params.id}`,
            { headers: { authorization: req.headers.authorization } }
        );

        res.json({
            success: true,
            message: response.message || 'User deleted successfully.'
        });
    } catch (err) {
        console.error('[Admin] deleteUser error:', err.message);
        const status = err.statusCode || 500;
        res.status(status).json({ success: false, error: err.message || 'Failed to delete user.' });
    }
}

/**
 * GET /admin/listings?search=X
 * Lists all listings (delegates to Listing Service).
 */
async function getAllListings(req, res) {
    try {
        const search = req.query.search || '';
        let listings;

        if (search) {
            // Use Search Service for text search
            const searchRes = await safeGet(
                `${LISTING_URL.replace('listing-service:3002', 'search-service:3006')}/search?q=${encodeURIComponent(search)}`
            );
            listings = searchRes?.data?.listings || [];
        } else {
            const response = await serviceClient.get(`${LISTING_URL}/listings`);
            listings = response.data?.listings || [];
        }

        // Fetch users to enrich listings with owner data
        const usersRes = await safeGet(`${AUTH_URL}/auth/users`, { authorization: req.headers.authorization });
        const users = usersRes?.data?.users || [];
        const userMap = new Map(users.map(u => [u._id?.toString() || u.id?.toString(), u]));

        // Enrich listings with owner data
        const enrichedListings = listings.map(listing => ({
            ...listing,
            owner: userMap.get(listing.ownerId?.toString()) || null
        }));

        res.json({
            success: true,
            data: { listings: enrichedListings, count: enrichedListings.length }
        });
    } catch (err) {
        console.error('[Admin] getAllListings error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch listings.' });
    }
}

/**
 * DELETE /admin/listings/:id
 * Deletes a listing via Listing Service (which publishes listing.deleted for cascades).
 */
async function deleteListing(req, res) {
    try {
        const response = await serviceClient.delete(
            `${LISTING_URL}/listings/${req.params.id}`,
            { headers: { authorization: req.headers.authorization } }
        );

        res.json({
            success: true,
            message: response.message || 'Listing deleted successfully.'
        });
    } catch (err) {
        console.error('[Admin] deleteListing error:', err.message);
        const status = err.statusCode || 500;
        res.status(status).json({ success: false, error: err.message || 'Failed to delete listing.' });
    }
}

/**
 * GET /admin/reviews?search=X
 * Lists all reviews (delegates to Review Service).
 */
async function getAllReviews(req, res) {
    try {
        const response = await serviceClient.get(`${REVIEW_URL}/reviews`);

        let reviews = response.data?.reviews || [];

        // Fetch users and listings to enrich reviews
        const [usersRes, listingsRes] = await Promise.all([
            safeGet(`${AUTH_URL}/auth/users`, { authorization: req.headers.authorization }),
            safeGet(`${LISTING_URL}/listings`)
        ]);

        const users = usersRes?.data?.users || [];
        const listings = listingsRes?.data?.listings || [];
        
        const userMap = new Map(users.map(u => [u._id?.toString() || u.id?.toString(), u]));
        const listingMap = new Map(listings.map(l => [l._id?.toString() || l.id?.toString(), l]));

        // Enrich reviews with author and listing data
        reviews = reviews.map(review => ({
            ...review,
            author: userMap.get(review.authorId?.toString()) || null,
            listing: listingMap.get(review.listingId?.toString()) || null
        }));

        // Client-side search filter (Review Service doesn't have search)
        const search = req.query.search;
        if (search && search.trim()) {
            const query = search.toLowerCase().trim();
            reviews = reviews.filter(r =>
                r.comment?.toLowerCase().includes(query) ||
                r.author?.username?.toLowerCase().includes(query)
            );
        }

        res.json({
            success: true,
            data: { reviews, count: reviews.length }
        });
    } catch (err) {
        console.error('[Admin] getAllReviews error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch reviews.' });
    }
}

/**
 * DELETE /admin/reviews/:id
 * Deletes a review via Review Service.
 */
async function deleteReview(req, res) {
    try {
        const response = await serviceClient.delete(
            `${REVIEW_URL}/reviews/${req.params.id}`,
            { headers: { authorization: req.headers.authorization } }
        );

        res.json({
            success: true,
            message: response.message || 'Review deleted successfully.'
        });
    } catch (err) {
        console.error('[Admin] deleteReview error:', err.message);
        const status = err.statusCode || 500;
        res.status(status).json({ success: false, error: err.message || 'Failed to delete review.' });
    }
}

/**
 * GET /admin/bookings
 * Lists all bookings (delegates to Booking Service).
 */
async function getAllBookings(req, res) {
    try {
        const response = await serviceClient.get(`${BOOKING_URL}/bookings`);
        let bookings = response.data?.bookings || [];

        // Fetch users and listings to enrich bookings
        const [usersRes, listingsRes] = await Promise.all([
            safeGet(`${AUTH_URL}/auth/users`, { authorization: req.headers.authorization }),
            safeGet(`${LISTING_URL}/listings`)
        ]);

        const users = usersRes?.data?.users || [];
        const listings = listingsRes?.data?.listings || [];
        
        const userMap = new Map(users.map(u => [u._id?.toString() || u.id?.toString(), u]));
        const listingMap = new Map(listings.map(l => [l._id?.toString() || l.id?.toString(), l]));

        // Enrich bookings with user and listing data
        bookings = bookings.map(booking => ({
            ...booking,
            user: userMap.get(booking.userId?.toString()) || null,
            listing: listingMap.get(booking.listingId?.toString()) || null
        }));

        res.json({
            success: true,
            data: { bookings, count: bookings.length }
        });
    } catch (err) {
        console.error('[Admin] getAllBookings error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch bookings.' });
    }
}

/**
 * DELETE /admin/bookings/:id
 * Hard deletes a booking via Booking Service (admin only).
 */
async function deleteBooking(req, res) {
    try {
        const response = await serviceClient.delete(
            `${BOOKING_URL}/bookings/${req.params.id}`,
            { headers: { authorization: req.headers.authorization } }
        );

        res.json({
            success: true,
            message: response.message || 'Booking deleted successfully.'
        });
    } catch (err) {
        console.error('[Admin] deleteBooking error:', err.message);
        const status = err.statusCode || 500;
        res.status(status).json({ success: false, error: err.message || 'Failed to delete booking.' });
    }
}

/**
 * GET /admin/user-dashboard/:userId
 * 
 * User-specific dashboard stats (host + guest view).
 * Called by the BFF to render the user dashboard page.
 */
async function getUserDashboard(req, res) {
    try {
        const { userId } = req.params;

        // Parallel calls for user-specific data
        const [userListings, userBookings, userReviews] = await Promise.all([
            safeGet(`${LISTING_URL}/listings?ownerId=${userId}`),
            safeGet(`${BOOKING_URL}/bookings?userId=${userId}`),
            safeGet(`${REVIEW_URL}/reviews?authorId=${userId}`)
        ]);

        const listings = userListings?.data?.listings || [];
        const bookings = userBookings?.data?.bookings || [];
        const reviews = userReviews?.data?.reviews || [];

        // Host stats: bookings on MY listings
        const listingIds = listings.map(l => l._id);
        let hostBookings = [];
        for (const lid of listingIds) {
            const lb = await safeGet(`${BOOKING_URL}/bookings?listingId=${lid}`);
            if (lb?.data?.bookings) hostBookings.push(...lb.data.bookings);
        }

        const hostRevenue = hostBookings
            .filter(b => b.payment?.status === 'completed')
            .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        // Guest stats
        const guestSpent = bookings
            .filter(b => b.payment?.status === 'completed')
            .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

        res.json({
            success: true,
            data: {
                host: {
                    totalListings: listings.length,
                    listings: listings.slice(0, 10),
                    totalBookingsReceived: hostBookings.length,
                    revenue: hostRevenue
                },
                guest: {
                    totalBookingsMade: bookings.length,
                    bookings: bookings.slice(0, 10),
                    totalSpent: guestSpent,
                    totalReviews: reviews.length
                }
            }
        });
    } catch (err) {
        console.error('[Admin] getUserDashboard error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to load user dashboard.' });
    }
}

module.exports = {
    getDashboard,
    getAllUsers,
    deleteUser,
    getAllListings,
    deleteListing,
    getAllReviews,
    deleteReview,
    getAllBookings,
    deleteBooking,
    getUserDashboard,
    setDependencies
};
