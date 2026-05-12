/**
 * Booking Service — Entry Point
 * 
 * Responsibilities:
 *   - Booking CRUD with date overlap detection
 *   - Simulated payment processing
 *   - Listing validation via HTTP call to Listing Service
 *   - Event publishing: booking.created, booking.payment.completed, booking.cancelled
 *   - Event consuming: listing.deleted & user.deleted → cancel active bookings
 * 
 * Port: 3004
 * Database: heavenly_bookings
 */

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');

const bookingRoutes = require('./routes/booking.js');
const bookingController = require('./controllers/booking.js');
const { setupConsumers } = require('./events/consumers.js');
const { initializeRazorpay } = require('./utils/razorpay.js');

let connectRabbitMQ, publishEvent, consumeEvent, serviceClient;
try {
    ({ connectRabbitMQ, publishEvent, consumeEvent, serviceClient } = require('../../../shared'));
} catch {
    ({ connectRabbitMQ, publishEvent, consumeEvent, serviceClient } = require('/app/shared'));
}

const app = express();
const PORT = process.env.PORT || 3004;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/heavenly_bookings';

// ===== Middleware =====
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
app.use(cors());
app.use(express.json());

// ===== Health Check =====
app.get('/health', (req, res) => {
    res.json({
        service: 'booking-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ===== Routes =====
app.use('/', bookingRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
    console.error(`[Booking Service Error] ${req.method} ${req.originalUrl}:`, err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? 'Internal server error' : err.message
    });
});

// ===== Startup =====
async function startService() {
    try {
        await mongoose.connect(MONGO_URL);
        console.log('[Booking Service] Connected to MongoDB');

        // Initialize Razorpay
        initializeRazorpay();

        let mqConnected = false;
        if (process.env.RABBITMQ_URL) {
            try {
                await connectRabbitMQ(process.env.RABBITMQ_URL);
                mqConnected = true;
                console.log('[Booking Service] Connected to RabbitMQ');
            } catch (mqErr) {
                console.warn('[Booking Service] RabbitMQ unavailable:', mqErr.message);
            }
        }

        // Inject dependencies into controller
        bookingController.setDependencies({
            serviceClient,
            publishEvent: mqConnected ? publishEvent : null,
            listingServiceUrl: process.env.LISTING_SERVICE_URL || ''
        });

        if (mqConnected) {
            await setupConsumers(consumeEvent);
        }

        app.listen(PORT, () => {
            console.log(`[Booking Service] Running on port ${PORT}`);
        });
    } catch (err) {
        console.error('[Booking Service] Failed to start:', err.message);
        process.exit(1);
    }
}

// ===== Graceful Shutdown =====
async function shutdown(signal) {
    console.log(`[Booking Service] ${signal} received. Shutting down...`);
    try { await mongoose.connection.close(); } catch {}
    process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startService();

module.exports = app;
