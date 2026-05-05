const Listing = require('../models/listing.js');
const Booking = require('../models/booking.js');
const Review = require('../models/review.js');

// Dashboard overview — show user stats
module.exports.index = async (req, res) => {
    const userId = req.user._id;

    // Host stats — listings owned by this user
    const myListings = await Listing.find({ owner: userId });
    const listingIds = myListings.map(l => l._id);

    const totalListings = myListings.length;
    const activeListings = myListings.filter(l => l.isAvailable).length;
    const inactiveListings = totalListings - activeListings;

    // Total reviews across all my listings
    const totalReviews = myListings.reduce((sum, l) => sum + l.reviews.length, 0);

    // Bookings ON my listings (host perspective)
    const hostBookingsCount = await Booking.countDocuments({ listing: { $in: listingIds } });
    const activeHostBookings = await Booking.countDocuments({
        listing: { $in: listingIds },
        bookingStatus: 'confirmed'
    });

    // Revenue earned from bookings on my listings (completed payments only)
    const revenueResult = await Booking.aggregate([
        { $match: { listing: { $in: listingIds }, paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Guest stats — my bookings as a traveler
    const totalGuestBookings = await Booking.countDocuments({ user: userId });
    const activeGuestBookings = await Booking.countDocuments({
        user: userId,
        bookingStatus: 'confirmed'
    });

    // Recent bookings (as guest) — latest 5
    const recentGuestBookingsRaw = await Booking.find({ user: userId, isVisibleToUser: true })
        .populate('listing')
        .sort({ createdAt: -1 })
        .limit(5);
    // Filter out bookings whose listing was deleted (populate returns null)
    const recentGuestBookings = recentGuestBookingsRaw.filter(b => b.listing != null);

    // Recent bookings on my listings (as host) — latest 5
    const recentHostBookingsRaw = await Booking.find({ listing: { $in: listingIds } })
        .populate('listing')
        .populate('user')
        .sort({ createdAt: -1 })
        .limit(5);
    // Filter out bookings with deleted listings or users
    const recentHostBookings = recentHostBookingsRaw.filter(b => b.listing != null && b.user != null);

    res.render('dashboard/index.ejs', {
        totalListings,
        activeListings,
        inactiveListings,
        totalReviews,
        hostBookingsCount,
        activeHostBookings,
        totalRevenue,
        totalGuestBookings,
        activeGuestBookings,
        recentGuestBookings,
        recentHostBookings
    });
};

// My bookings as a guest
module.exports.myBookings = async (req, res) => {
    const bookingsRaw = await Booking.find({
        user: req.user._id,
        isVisibleToUser: true
    })
        .populate('listing')
        .sort({ createdAt: -1 });
    // Filter out bookings whose listing was deleted
    const bookings = bookingsRaw.filter(b => b.listing != null);

    res.render('dashboard/bookings.ejs', { bookings });
};

// My listings as a host
module.exports.myListings = async (req, res) => {
    const listings = await Listing.find({ owner: req.user._id });

    // Get booking count per listing efficiently
    const listingIds = listings.map(l => l._id);
    const bookingCounts = await Booking.aggregate([
        { $match: { listing: { $in: listingIds }, bookingStatus: { $ne: 'cancelled' } } },
        { $group: { _id: '$listing', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    bookingCounts.forEach(b => { countMap[b._id.toString()] = b.count; });

    const listingData = listings.map(listing => ({
        listing,
        bookingCount: countMap[listing._id.toString()] || 0,
        reviewCount: listing.reviews.length
    }));

    res.render('dashboard/listings.ejs', { listingData });
};

// Toggle listing availability
module.exports.toggleAvailability = async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/dashboard/listings');
    }

    if (!listing.owner.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect('/dashboard/listings');
    }

    listing.isAvailable = !listing.isAvailable;
    await listing.save();

    req.flash('success', `Listing marked as ${listing.isAvailable ? 'available' : 'unavailable'}.`);
    res.redirect('/dashboard/listings');
};

// See all bookings on a specific listing (host view — see guest details)
module.exports.listingBookings = async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/dashboard/listings');
    }

    if (!listing.owner.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to view this!');
        return res.redirect('/dashboard/listings');
    }

    const bookingsRaw = await Booking.find({ listing: listing._id })
        .populate('user')
        .sort({ createdAt: -1 });
    // Filter out bookings with deleted users
    const bookings = bookingsRaw.filter(b => b.user != null);

    res.render('dashboard/listing-bookings.ejs', { listing, bookings });
};

// Owner cancels a guest's booking on their listing
module.exports.cancelGuestBooking = async (req, res) => {
    const { id, bookingId } = req.params;
    const listing = await Listing.findById(id);

    if (!listing || !listing.owner.equals(req.user._id)) {
        req.flash('error', 'Permission denied!');
        return res.redirect('/dashboard/listings');
    }

    const booking = await Booking.findById(bookingId);

    if (!booking || !booking.listing.equals(listing._id)) {
        req.flash('error', 'Booking not found!');
        return res.redirect(`/dashboard/listings/${id}/bookings`);
    }

    if (booking.bookingStatus === 'cancelled') {
        req.flash('error', 'This booking is already cancelled.');
        return res.redirect(`/dashboard/listings/${id}/bookings`);
    }

    booking.bookingStatus = 'cancelled';
    if (booking.paymentStatus === 'completed') {
        booking.paymentStatus = 'refunded';
    }
    await booking.save();

    req.flash('success', 'Guest booking cancelled successfully!');
    res.redirect(`/dashboard/listings/${id}/bookings`);
};
