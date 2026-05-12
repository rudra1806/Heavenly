/**
 * Booking Controller — reservations, overlap detection, and Razorpay payments.
 * 
 * This is the most complex service due to cross-service validation:
 *   - Must call Listing Service to verify listing exists and get price
 *   - Must check its own DB for date overlaps
 *   - Integrates with Razorpay for real payment processing
 */

const Booking = require('../models/booking.js');
const { createOrder, verifyPaymentSignature, createRefund, isRazorpayEnabled } = require('../utils/razorpay.js');

let serviceClient = null;
let publishEvent = null;
let LISTING_SERVICE_URL = '';

function setDependencies(deps) {
    serviceClient = deps.serviceClient;
    publishEvent = deps.publishEvent;
    LISTING_SERVICE_URL = deps.listingServiceUrl || '';
}

/**
 * GET /bookings
 * Returns bookings filtered by userId, listingId, or ownerId.
 * Hidden bookings are excluded for regular users.
 */
async function getBookings(req, res) {
    try {
        const userId = req.headers['x-user-id'] || req.query.userId;
        const userRole = req.headers['x-user-role'];
        
        console.log('[Booking] getBookings - userId from header:', req.headers['x-user-id']);
        console.log('[Booking] getBookings - userId from query:', req.query.userId);
        console.log('[Booking] getBookings - final userId:', userId);
        
        const filter = {};
        if (req.query.userId) filter.userId = req.query.userId;
        // Support batch query: ?listingIds=id1,id2,id3 (preferred for bulk)
        // Falls back to single: ?listingId=id1
        if (req.query.listingIds) {
            const ids = req.query.listingIds.split(',').map(id => id.trim()).filter(Boolean);
            filter.listingId = { $in: ids };
        } else if (req.query.listingId) {
            filter.listingId = req.query.listingId;
        }

        console.log('[Booking] getBookings - filter:', JSON.stringify(filter));

        // Hide soft-deleted bookings from regular users
        // Admins can see all bookings
        if (userRole !== 'admin') {
            filter.$or = [
                { isHidden: { $ne: true } },
                { isHidden: { $exists: false } }
            ];
        }

        // For host view: get bookings for all listings owned by a user
        // This requires the ownerId query which checks denormalized data
        // The admin/dashboard service handles this by first fetching listings

        const bookings = await Booking.find(filter).sort({ createdAt: -1 });
        console.log('[Booking] getBookings - found bookings:', bookings.length);
        if (bookings.length > 0) {
            console.log('[Booking] getBookings - first booking userId:', bookings[0].userId);
        }
        
        res.json({
            success: true,
            data: { bookings, count: bookings.length }
        });
    } catch (err) {
        console.error('[Booking] getBookings error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch bookings.' });
    }
}

/**
 * GET /bookings/:id
 * Returns a single booking.
 */
async function getBooking(req, res) {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found.' });
        }
        res.json({ success: true, data: { booking } });
    } catch (err) {
        console.error('[Booking] getBooking error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch booking.' });
    }
}

/**
 * POST /bookings
 * Creates a new booking with overlap detection and listing validation.
 * 
 * Flow:
 *   1. Validate listing exists and is available (HTTP → Listing Service)
 *   2. Check date overlap with existing bookings (own DB)
 *   3. Validate guest count
 *   4. Calculate total price
 *   5. Create booking with status 'pending'
 */
async function createBooking(req, res) {
    try {
        const userId = req.headers['x-user-id'] || req.user?.id;
        const guestUsername = req.headers['x-user-username'] || req.user?.username || '';
        const guestEmail = req.headers['x-user-email'] || req.user?.email || '';

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required.' });
        }

        const { listingId, checkIn, checkOut, guests } = req.body;
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        // 1. Validate listing exists and is available
        let listing = null;
        if (LISTING_SERVICE_URL && serviceClient) {
            try {
                const response = await serviceClient.get(`${LISTING_SERVICE_URL}/listings/${listingId}`);
                listing = response.data?.listing;
            } catch (err) {
                return res.status(400).json({
                    success: false,
                    error: `Listing not found or unavailable: ${err.message}`
                });
            }
        }

        if (listing) {
            // Check availability
            if (listing.isAvailable === false) {
                return res.status(400).json({
                    success: false,
                    error: 'This listing is currently unavailable.'
                });
            }

            // Cannot book your own listing
            if (listing.ownerId === userId) {
                return res.status(400).json({
                    success: false,
                    error: 'You cannot book your own listing.'
                });
            }

            // Check guest count
            if (guests > (listing.maxGuests || 4)) {
                return res.status(400).json({
                    success: false,
                    error: `Maximum ${listing.maxGuests || 4} guests allowed for this listing.`
                });
            }
        }

        // 2. Check for date overlap with existing confirmed/pending bookings
        const overlapping = await Booking.findOne({
            listingId,
            status: { $in: ['pending', 'confirmed'] },
            $or: [
                { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }
            ]
        });

        if (overlapping) {
            return res.status(409).json({
                success: false,
                error: 'These dates are already booked. Please choose different dates.',
                conflictDates: {
                    checkIn: overlapping.checkIn,
                    checkOut: overlapping.checkOut
                }
            });
        }

        // 3. Calculate pricing
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        const pricePerNight = listing?.price || 0;
        const totalPrice = pricePerNight * nights;
        
        // Calculate platform fee (15%) and host earnings (85%)
        const platformFee = Math.round(totalPrice * 0.15);
        const hostEarnings = totalPrice - platformFee;

        // 4. Create booking
        const booking = new Booking({
            listingId,
            userId,
            listingTitle: listing?.title || '',
            listingImage: listing?.image?.url || '',
            listingLocation: listing?.location || '',
            guestUsername,
            guestEmail,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests,
            pricePerNight,
            totalPrice,
            platformFee,
            hostEarnings,
            status: 'pending',
            payment: { status: 'pending', method: 'simulated' }
        });

        await booking.save();

        if (publishEvent) {
            await publishEvent('booking.created', {
                bookingId: booking._id.toString(),
                listingId,
                userId,
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                totalPrice
            });
        }

        console.log(`[Booking] Created: ${nights} nights at ${listing?.title || listingId} by ${guestUsername}`);

        res.status(201).json({
            success: true,
            message: 'Booking created successfully.',
            data: { booking }
        });
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ success: false, error: messages.join(', ') });
        }
        console.error('[Booking] createBooking error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to create booking.' });
    }
}

/**
 * POST /bookings/:id/payment
 * Creates a Razorpay order for payment processing.
 * If Razorpay is not configured, falls back to simulated payment.
 */
async function processPayment(req, res) {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found.' });
        }

        const userId = req.headers['x-user-id'] || req.user?.id;
        if (booking.userId !== userId) {
            return res.status(403).json({ success: false, error: 'You can only pay for your own bookings.' });
        }

        if (booking.payment.status === 'completed') {
            return res.status(400).json({ success: false, error: 'Payment already completed.' });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'Cannot pay for a cancelled booking.' });
        }

        // Check if Razorpay is enabled
        if (isRazorpayEnabled()) {
            try {
                // Create Razorpay order
                const razorpayOrder = await createOrder({
                    amount: booking.totalPrice,
                    currency: 'INR',
                    receipt: booking._id.toString(),
                    notes: {
                        bookingId: booking._id.toString(),
                        listingId: booking.listingId,
                        userId: booking.userId,
                        listingTitle: booking.listingTitle
                    }
                });

                // Store Razorpay order ID in booking
                booking.payment.razorpayOrderId = razorpayOrder.id;
                booking.payment.method = 'razorpay';
                await booking.save();

                console.log(`[Booking] Razorpay order created: ${razorpayOrder.id}`);

                return res.json({
                    success: true,
                    message: 'Razorpay order created successfully.',
                    data: {
                        orderId: razorpayOrder.id,
                        amount: razorpayOrder.amount,
                        currency: razorpayOrder.currency,
                        bookingId: booking._id.toString(),
                        keyId: process.env.RAZORPAY_KEY_ID
                    }
                });
            } catch (razorpayErr) {
                console.error('[Booking] Razorpay order creation failed:', razorpayErr.message);
                // Fall back to simulation if Razorpay fails
            }
        }

        // Fallback: Simulate payment processing
        booking.payment.status = 'completed';
        booking.payment.method = 'simulated';
        booking.payment.transactionId = `SIM_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        booking.payment.paidAt = new Date();
        booking.status = 'confirmed';

        await booking.save();

        if (publishEvent) {
            await publishEvent('booking.payment.completed', {
                bookingId: booking._id.toString(),
                listingId: booking.listingId,
                userId: booking.userId,
                totalPrice: booking.totalPrice,
                transactionId: booking.payment.transactionId
            });
        }

        console.log(`[Booking] Payment completed (simulated): ${booking.payment.transactionId}`);

        res.json({
            success: true,
            message: 'Payment processed successfully (simulated).',
            data: { booking }
        });
    } catch (err) {
        console.error('[Booking] processPayment error:', err.message);
        res.status(500).json({ success: false, error: 'Payment processing failed.' });
    }
}

/**
 * POST /bookings/:id/verify-payment
 * Verifies Razorpay payment signature and updates booking status.
 */
async function verifyPayment(req, res) {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found.' });
        }

        const userId = req.headers['x-user-id'] || req.user?.id;
        if (booking.userId !== userId) {
            return res.status(403).json({ success: false, error: 'Unauthorized.' });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing payment verification parameters.' 
            });
        }

        // Verify payment signature
        const isValid = verifyPaymentSignature({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        });

        if (!isValid) {
            return res.status(400).json({ 
                success: false, 
                error: 'Payment verification failed. Invalid signature.' 
            });
        }

        // Update booking with payment details
        booking.payment.status = 'completed';
        booking.payment.method = 'razorpay';
        booking.payment.transactionId = razorpay_payment_id;
        booking.payment.razorpayOrderId = razorpay_order_id;
        booking.payment.paidAt = new Date();
        booking.status = 'confirmed';

        await booking.save();

        if (publishEvent) {
            await publishEvent('booking.payment.completed', {
                bookingId: booking._id.toString(),
                listingId: booking.listingId,
                userId: booking.userId,
                totalPrice: booking.totalPrice,
                transactionId: razorpay_payment_id
            });
        }

        console.log(`[Booking] Payment verified and completed: ${razorpay_payment_id}`);

        res.json({
            success: true,
            message: 'Payment verified successfully.',
            data: { booking }
        });
    } catch (err) {
        console.error('[Booking] verifyPayment error:', err.message);
        res.status(500).json({ success: false, error: 'Payment verification failed.' });
    }
}

/**
 * POST /bookings/:id/cancel
 * Cancels a booking and processes refund via Razorpay if applicable.
 */
async function cancelBooking(req, res) {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found.' });
        }

        const userId = req.headers['x-user-id'] || req.user?.id;
        const userRole = req.headers['x-user-role'] || req.user?.role;
        if (booking.userId !== userId && userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'You do not have permission to cancel this booking.' });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'Booking is already cancelled.' });
        }

        // Process refund if payment was completed via Razorpay
        if (booking.payment.status === 'completed' && booking.payment.method === 'razorpay' && booking.payment.transactionId) {
            try {
                if (isRazorpayEnabled()) {
                    const refund = await createRefund(booking.payment.transactionId);
                    booking.payment.refundId = refund.id;
                    console.log(`[Booking] Razorpay refund created: ${refund.id}`);
                }
            } catch (refundErr) {
                console.error('[Booking] Refund failed:', refundErr.message);
                // Continue with cancellation even if refund fails
                // Admin can manually process refund
            }
        }

        booking.status = 'cancelled';
        if (booking.payment.status === 'completed') {
            booking.payment.status = 'refunded';
        }

        await booking.save();

        if (publishEvent) {
            await publishEvent('booking.cancelled', {
                bookingId: booking._id.toString(),
                listingId: booking.listingId,
                userId: booking.userId
            });
        }

        console.log(`[Booking] Cancelled: ${booking._id}`);

        res.json({
            success: true,
            message: 'Booking cancelled successfully.',
            data: { booking }
        });
    } catch (err) {
        console.error('[Booking] cancelBooking error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to cancel booking.' });
    }
}

/**
 * DELETE /bookings/:id
 * Users can soft-delete (hide) their own cancelled bookings.
 * Admins can hard-delete any booking.
 */
async function deleteBooking(req, res) {
    try {
        const userId = req.headers['x-user-id'] || req.user?.id;
        const userRole = req.headers['x-user-role'] || req.user?.role;
        
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found.' });
        }

        // Check permissions
        const isOwner = booking.userId === userId;
        const isAdmin = userRole === 'admin';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have permission to remove this booking.' 
            });
        }

        // Users can only delete their own cancelled bookings
        if (!isAdmin && booking.status !== 'cancelled') {
            return res.status(400).json({ 
                success: false, 
                error: 'Only cancelled bookings can be removed.' 
            });
        }

        // Admin performs hard delete (removes from DB)
        if (isAdmin) {
            await Booking.findByIdAndDelete(req.params.id);
            console.log(`[Booking] Hard deleted by admin: ${req.params.id}`);
            return res.json({
                success: true,
                message: 'Booking permanently deleted.'
            });
        }

        // User performs soft delete by adding isHidden flag
        booking.isHidden = true;
        await booking.save();
        
        console.log(`[Booking] Soft deleted by user: ${req.params.id}`);

        res.json({
            success: true,
            message: 'Booking removed from your history.'
        });
    } catch (err) {
        console.error('[Booking] deleteBooking error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to delete booking.' });
    }
}

module.exports = {
    getBookings,
    getBooking,
    createBooking,
    processPayment,
    verifyPayment,
    cancelBooking,
    deleteBooking,
    setDependencies
};
