/**
 * Razorpay Integration Utility
 * 
 * Handles Razorpay order creation and payment verification.
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpayInstance = null;

/**
 * Initialize Razorpay instance
 */
function initializeRazorpay() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        console.warn('[Razorpay] Credentials not found. Payment will use simulation mode.');
        return null;
    }

    try {
        razorpayInstance = new Razorpay({
            key_id: keyId,
            key_secret: keySecret
        });
        console.log('[Razorpay] Initialized successfully');
        return razorpayInstance;
    } catch (err) {
        console.error('[Razorpay] Initialization failed:', err.message);
        return null;
    }
}

/**
 * Create a Razorpay order
 * @param {Object} options - Order options
 * @param {number} options.amount - Amount in INR (will be converted to paise)
 * @param {string} options.currency - Currency code (default: INR)
 * @param {string} options.receipt - Unique receipt ID (booking ID)
 * @param {Object} options.notes - Additional notes
 * @returns {Promise<Object>} Razorpay order object
 */
async function createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    if (!razorpayInstance) {
        throw new Error('Razorpay not initialized. Check your credentials.');
    }

    try {
        // Razorpay expects amount in paise (smallest currency unit)
        const amountInPaise = Math.round(amount * 100);

        const order = await razorpayInstance.orders.create({
            amount: amountInPaise,
            currency,
            receipt,
            notes,
            payment_capture: 1 // Auto-capture payment
        });

        console.log(`[Razorpay] Order created: ${order.id} for ₹${amount}`);
        return order;
    } catch (err) {
        console.error('[Razorpay] Order creation failed:', err.message);
        throw new Error(`Failed to create Razorpay order: ${err.message}`);
    }
}

/**
 * Verify Razorpay payment signature
 * @param {Object} params - Payment verification params
 * @param {string} params.razorpay_order_id - Order ID from Razorpay
 * @param {string} params.razorpay_payment_id - Payment ID from Razorpay
 * @param {string} params.razorpay_signature - Signature from Razorpay
 * @returns {boolean} True if signature is valid
 */
function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
    if (!razorpayInstance) {
        throw new Error('Razorpay not initialized. Check your credentials.');
    }

    try {
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        
        // Create expected signature
        const generatedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        const isValid = generatedSignature === razorpay_signature;
        
        if (isValid) {
            console.log(`[Razorpay] Payment verified: ${razorpay_payment_id}`);
        } else {
            console.warn(`[Razorpay] Payment verification failed for: ${razorpay_payment_id}`);
        }

        return isValid;
    } catch (err) {
        console.error('[Razorpay] Signature verification error:', err.message);
        return false;
    }
}

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} Payment details
 */
async function fetchPayment(paymentId) {
    if (!razorpayInstance) {
        throw new Error('Razorpay not initialized. Check your credentials.');
    }

    try {
        const payment = await razorpayInstance.payments.fetch(paymentId);
        return payment;
    } catch (err) {
        console.error('[Razorpay] Failed to fetch payment:', err.message);
        throw new Error(`Failed to fetch payment: ${err.message}`);
    }
}

/**
 * Create a refund for a payment
 * @param {string} paymentId - Razorpay payment ID
 * @param {number} amount - Amount to refund in INR (optional, full refund if not provided)
 * @returns {Promise<Object>} Refund details
 */
async function createRefund(paymentId, amount = null) {
    if (!razorpayInstance) {
        throw new Error('Razorpay not initialized. Check your credentials.');
    }

    try {
        const refundData = {};
        if (amount) {
            refundData.amount = Math.round(amount * 100); // Convert to paise
        }

        const refund = await razorpayInstance.payments.refund(paymentId, refundData);
        console.log(`[Razorpay] Refund created: ${refund.id} for payment ${paymentId}`);
        return refund;
    } catch (err) {
        console.error('[Razorpay] Refund creation failed:', err.message);
        throw new Error(`Failed to create refund: ${err.message}`);
    }
}

/**
 * Check if Razorpay is enabled
 * @returns {boolean}
 */
function isRazorpayEnabled() {
    return razorpayInstance !== null;
}

module.exports = {
    initializeRazorpay,
    createOrder,
    verifyPaymentSignature,
    fetchPayment,
    createRefund,
    isRazorpayEnabled
};
