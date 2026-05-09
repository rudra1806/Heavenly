/**
 * Listing Service — Entry Point
 * 
 * Responsibilities:
 *   - Property CRUD operations
 *   - Ownership authorization
 *   - Availability toggling
 *   - Inter-service calls: Media (upload), Search (geocode)
 *   - Event publishing: listing.created, listing.updated, listing.deleted
 *   - Event consuming: user.deleted → cascade delete listings
 * 
 * Port: 3002
 * Database: heavenly_listings
 */

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');

// Routes & Controllers
const listingRoutes = require('./routes/listing.js');
const listingController = require('./controllers/listing.js');
const { setupConsumers } = require('./events/consumers.js');

// Shared utilities
let connectRabbitMQ, publishEvent, consumeEvent, eventNames, serviceClient;
try {
    ({ connectRabbitMQ, publishEvent, consumeEvent, eventNames, serviceClient } = require('../../../shared'));
} catch {
    ({ connectRabbitMQ, publishEvent, consumeEvent, eventNames, serviceClient } = require('/app/shared'));
}

const app = express();
const PORT = process.env.PORT || 3002;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/heavenly_listings';

// ===== Middleware =====
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
app.use(cors());
app.use(express.json());

// ===== Health Check =====
app.get('/health', (req, res) => {
    res.json({
        service: 'listing-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ===== Routes =====
app.use('/', listingRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
    console.error(`[Listing Service Error] ${req.method} ${req.originalUrl}:`, err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? 'Internal server error' : err.message
    });
});

// ===== Startup =====
async function startService() {
    try {
        // 1. Connect to MongoDB
        await mongoose.connect(MONGO_URL);
        console.log('[Listing Service] Connected to MongoDB');

        // 2. Connect to RabbitMQ
        let mqConnected = false;
        if (process.env.RABBITMQ_URL) {
            try {
                await connectRabbitMQ(process.env.RABBITMQ_URL);
                mqConnected = true;
                console.log('[Listing Service] Connected to RabbitMQ');
            } catch (mqErr) {
                console.warn('[Listing Service] RabbitMQ unavailable:', mqErr.message);
            }
        }

        // 3. Inject dependencies into controller
        listingController.setDependencies({
            serviceClient,
            publishEvent: mqConnected ? publishEvent : null,
            mediaServiceUrl: process.env.MEDIA_SERVICE_URL || '',
            searchServiceUrl: process.env.SEARCH_SERVICE_URL || ''
        });

        // 4. Setup event consumers
        if (mqConnected) {
            await setupConsumers(consumeEvent, publishEvent);
        }

        // 5. Start HTTP server
        app.listen(PORT, () => {
            console.log(`[Listing Service] Running on port ${PORT}`);
        });

    } catch (err) {
        console.error('[Listing Service] Failed to start:', err.message);
        process.exit(1);
    }
}

// ===== Graceful Shutdown =====
async function shutdown(signal) {
    console.log(`[Listing Service] ${signal} received. Shutting down gracefully...`);
    try {
        await mongoose.connection.close();
        console.log('[Listing Service] MongoDB connection closed');
    } catch (err) {
        console.error('[Listing Service] Error during shutdown:', err.message);
    }
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startService();

module.exports = app;
