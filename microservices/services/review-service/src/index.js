/**
 * Review Service — Entry Point
 * 
 * Responsibilities:
 *   - Review CRUD (create, read, delete)
 *   - Rating statistics per listing
 *   - Event consuming: listing.deleted & user.deleted → cascade cleanup
 *   - Event publishing: review.created, review.deleted
 * 
 * Port: 3003
 * Database: heavenly_reviews
 */

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');

const reviewRoutes = require('./routes/review.js');
const reviewController = require('./controllers/review.js');
const { setupConsumers } = require('./events/consumers.js');

let connectRabbitMQ, publishEvent, consumeEvent;
try {
    ({ connectRabbitMQ, publishEvent, consumeEvent } = require('../../../shared'));
} catch {
    ({ connectRabbitMQ, publishEvent, consumeEvent } = require('/app/shared'));
}

const app = express();
const PORT = process.env.PORT || 3003;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/heavenly_reviews';

// ===== Middleware =====
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
app.use(cors());
app.use(express.json());

// ===== Health Check =====
app.get('/health', (req, res) => {
    res.json({
        service: 'review-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ===== Routes =====
app.use('/', reviewRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
    console.error(`[Review Service Error] ${req.method} ${req.originalUrl}:`, err.message);
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
        console.log('[Review Service] Connected to MongoDB');

        let mqConnected = false;
        if (process.env.RABBITMQ_URL) {
            try {
                await connectRabbitMQ(process.env.RABBITMQ_URL);
                mqConnected = true;
                console.log('[Review Service] Connected to RabbitMQ');
            } catch (mqErr) {
                console.warn('[Review Service] RabbitMQ unavailable:', mqErr.message);
            }
        }

        if (mqConnected) {
            reviewController.setPublishEvent(publishEvent);
            await setupConsumers(consumeEvent);
        }

        app.listen(PORT, () => {
            console.log(`[Review Service] Running on port ${PORT}`);
        });
    } catch (err) {
        console.error('[Review Service] Failed to start:', err.message);
        process.exit(1);
    }
}

// ===== Graceful Shutdown =====
async function shutdown(signal) {
    console.log(`[Review Service] ${signal} received. Shutting down...`);
    try { await mongoose.connection.close(); } catch {}
    process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startService();

module.exports = app;
