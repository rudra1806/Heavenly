const Booking = require('../models/booking.js');
const Listing = require('../models/listing.js');

// Show booking form
module.exports.bookingForm = async (req, res) => {
    const listing = await Listing.findById(req.params.id).populate('owner');
    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }
    // Check if listing is available for booking
    if (!listing.isAvailable) {
        req.flash('error', 'This listing is currently unavailable for booking.');
        return res.redirect(`/listings/${listing._id}`);
    }
    res.render('bookings/new.ejs', { listing });
};

// Create booking with simulated payment
module.exports.createBooking = async (req, res) => {
    const { checkIn, checkOut, guests } = req.body;
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }

    // Check if listing is available for booking
    if (!listing.isAvailable) {
        req.flash('error', 'This listing is currently unavailable for booking.');
        return res.redirect(`/listings/${listing._id}`);
    }

    // Validate dates are in the future
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
        req.flash('error', 'Check-in date must be today or in the future.');
        return res.redirect(`/listings/${listing._id}/book`);
    }

    // Prevent owner from booking their own listing
    if (listing.owner.equals(req.user._id)) {
        req.flash('error', 'You cannot book your own listing!');
        return res.redirect(`/listings/${listing._id}`);
    }

    // Validate guest count against listing's max
    const maxGuests = listing.maxGuests || 4;
    if (parseInt(guests) > maxGuests) {
        req.flash('error', `This property allows a maximum of ${maxGuests} guests.`);
        return res.redirect(`/listings/${listing._id}/book`);
    }

    // Calculate total price (including 10% service fee)
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const subtotal = nights * listing.price;
    const serviceFee = Math.round(subtotal * 0.10);
    const totalPrice = subtotal + serviceFee;

    // Check for overlapping bookings
    const overlappingBooking = await Booking.findOne({
        listing: listing._id,
        bookingStatus: { $ne: 'cancelled' },
        $or: [
            { checkIn: { $lte: checkOutDate }, checkOut: { $gte: checkInDate } }
        ]
    });

    if (overlappingBooking) {
        req.flash('error', 'This property is already booked for the selected dates!');
        return res.redirect(`/listings/${listing._id}/book`);
    }

    // Create booking
    const booking = new Booking({
        listing: listing._id,
        user: req.user._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
        totalPrice,
        paymentStatus: 'pending'
    });

    await booking.save();

    // Redirect to payment page
    res.redirect(`/bookings/${booking._id}/payment`);
};

// Show payment page (simulated)
module.exports.paymentPage = async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate('listing')
        .populate('user');

    if (!booking) {
        req.flash('error', 'Booking not found!');
        return res.redirect('/listings');
    }

    if (!booking.user._id.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to access this booking!');
        return res.redirect('/listings');
    }

    res.render('bookings/payment.ejs', { booking });
};

// Process simulated payment
module.exports.processPayment = async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
        req.flash('error', 'Booking not found!');
        return res.redirect('/listings');
    }

    if (!booking.user.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to access this booking!');
        return res.redirect('/listings');
    }

    // Simulate successful payment (Razorpay will replace this later)
    booking.paymentStatus = 'completed';
    booking.paymentId = 'SIM_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    await booking.save();

    // Return JSON for AJAX requests (used by the new payment UI)
    if (req.headers['content-type'] === 'application/json' || req.xhr) {
        return res.json({
            success: true,
            paymentId: booking.paymentId,
            bookingId: booking._id
        });
    }

    req.flash('success', 'Payment successful! Your booking is confirmed.');
    res.redirect(`/bookings/${booking._id}`);
};

// Show single booking
module.exports.showBooking = async (req, res) => {
    const booking = await Booking.findById(req.params.id)
        .populate('listing')
        .populate('user');

    if (!booking) {
        req.flash('error', 'Booking not found!');
        return res.redirect('/bookings');
    }

    if (!booking.user._id.equals(req.user._id) && req.user.role !== 'admin') {
        req.flash('error', 'You do not have permission to view this booking!');
        return res.redirect('/bookings');
    }

    res.render('bookings/show.ejs', { booking });
};

// Show all user bookings
module.exports.userBookings = async (req, res) => {
    const bookingsRaw = await Booking.find({
        user: req.user._id,
        isVisibleToUser: true
    })
        .populate('listing')
        .sort({ createdAt: -1 });
    // Filter out bookings whose listing was deleted (populate returns null)
    const bookings = bookingsRaw.filter(b => b.listing != null);

    res.render('bookings/index.ejs', { bookings });
};

// Cancel booking
module.exports.cancelBooking = async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
        req.flash('error', 'Booking not found!');
        return res.redirect('/bookings');
    }

    if (!booking.user.equals(req.user._id) && req.user.role !== 'admin') {
        req.flash('error', 'You do not have permission to cancel this booking!');
        return res.redirect('/bookings');
    }

    booking.bookingStatus = 'cancelled';
    if (booking.paymentStatus === 'completed') {
        booking.paymentStatus = 'refunded';
    }
    await booking.save();

    req.flash('success', 'Booking cancelled successfully!');
    res.redirect('/bookings');
};

// Delete (remove) a cancelled booking permanently
module.exports.deleteBooking = async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
        req.flash('error', 'Booking not found!');
        return res.redirect('/bookings');
    }

    // Only allow the booking owner to delete
    if (!booking.user.equals(req.user._id) && req.user.role !== 'admin') {
        req.flash('error', 'You do not have permission to remove this booking.');
        return res.redirect('/bookings');
    }

    // Only allow deletion of cancelled bookings
    if (booking.bookingStatus !== 'cancelled') {
        req.flash('error', 'Only cancelled bookings can be removed.');
        return res.redirect('/bookings');
    }

    // Admin performs hard delete (removes from DB)
    if (req.user.role === 'admin') {
        await Booking.findByIdAndDelete(req.params.id);
        req.flash('success', 'Booking deleted permanently.');
    } else {
        // User performs soft delete (hides from view)
        booking.isVisibleToUser = false;
        await booking.save();
        req.flash('success', 'Booking hidden from your view.');
    }

    res.redirect('/bookings');
};
