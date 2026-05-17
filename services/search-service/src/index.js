/**
 * Search & Geocoding Service — Entry Point
 * 
 * Responsibilities:
 *   - Geocoding via Nominatim with Redis caching (7 day TTL)
 *   - Full-text search across an in-memory listing index
 *   - Keeping the index updated via RabbitMQ events
 * 
 * Port: 3006
 * Database: None (in-memory index + Redis cache)
 */

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { createClient } = require('redis');

// Routes & Controller
const searchRoutes = require('./routes/search.js');
const searchController = require('./controllers/search.js');
const { setupConsumers } = require('./events/consumers.js');

// Shared utilities
let connectRabbitMQ, consumeEvent, serviceClient;
try {
    ({ connectRabbitMQ, consumeEvent, serviceClient } = require('../../../shared'));
} catch {
    ({ connectRabbitMQ, consumeEvent, serviceClient } = require('/app/shared'));
}

let setupMetrics;
try {
    ({ setupMetrics } = require('../../../shared/src/metrics'));
} catch {
    ({ setupMetrics } = require('/app/shared/src/metrics'));
}

const app = express();
const PORT = process.env.PORT || 3006;

// ===== Middleware =====
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
setupMetrics(app, 'search-service');
app.use(cors());
app.use(express.json());

// ===== Health Check =====
app.get('/health', (req, res) => {
    res.json({
        service: 'search-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        searchIndexSize: searchController.getIndexSize()
    });
});

// ===== Routes =====
app.use('/', searchRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
    console.error(`[Search Service Error] ${req.method} ${req.originalUrl}:`, err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? 'Internal server error' : err.message
    });
});

// ===== Startup =====
async function startService() {
    try {
        // 1. Connect to Redis (for geocoding cache)
        if (process.env.REDIS_URL) {
            try {
                const redisClient = createClient({ url: process.env.REDIS_URL });
                redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));
                await redisClient.connect();
                searchController.setRedisClient(redisClient);
                console.log('[Search Service] Connected to Redis');
            } catch (redisErr) {
                console.warn('[Search Service] Redis unavailable — geocode caching disabled:', redisErr.message);
            }
        }

        // 2. Connect to RabbitMQ (for index updates)
        if (process.env.RABBITMQ_URL) {
            try {
                await connectRabbitMQ(process.env.RABBITMQ_URL);
                await setupConsumers(consumeEvent);
                console.log('[Search Service] Connected to RabbitMQ');
            } catch (mqErr) {
                console.warn('[Search Service] RabbitMQ unavailable — index updates disabled:', mqErr.message);
            }
        }

        // 3. Sync initial listings from Listing Service
        const LISTING_SERVICE_URL = process.env.LISTING_SERVICE_URL || 'http://localhost:3002';
        try {
            console.log(`[Search Service] Syncing listings from ${LISTING_SERVICE_URL}...`);
            // Add a small delay to ensure listing-service is ready in docker-compose environments
            await new Promise(resolve => setTimeout(resolve, 2000));
            const response = await serviceClient.get(`${LISTING_SERVICE_URL}/listings`);
            if (response.success && response.data?.listings) {
                response.data.listings.forEach(listing => {
                    searchController.indexListing({
                        listingId: listing._id,
                        title: listing.title,
                        description: listing.description,
                        location: listing.location,
                        country: listing.country,
                        price: listing.price,
                        coordinates: listing.geometry?.coordinates,
                        isAvailable: listing.isAvailable,
                        image: listing.image
                    });
                });
                console.log(`[Search Service] Synced ${response.data.listings.length} listings to index.`);
            }
        } catch (syncErr) {
            console.warn('[Search Service] Failed to sync initial listings (it may not be ready yet):', syncErr.message);
        }

        // 4. Start HTTP server
        app.listen(PORT, () => {
            console.log(`[Search Service] Running on port ${PORT}`);
        });

    } catch (err) {
        console.error('[Search Service] Failed to start:', err.message);
        process.exit(1);
    }
}

// ===== Graceful Shutdown =====
process.on('SIGTERM', () => {
    console.log('[Search Service] SIGTERM received. Shutting down...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('[Search Service] SIGINT received. Shutting down...');
    process.exit(0);
});

startService();

module.exports = app;
