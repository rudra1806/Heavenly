/**
 * Admin/Dashboard Aggregator — Entry Point
 * 
 * Responsibilities:
 *   - Platform dashboard (cross-service stats aggregation)
 *   - User dashboard (host + guest views)
 *   - Admin CRUD operations (delegates to owning services)
 * 
 * This is a PURE AGGREGATION SERVICE:
 *   - Owns NO data (no database)
 *   - Owns NO events (no RabbitMQ)
 *   - Only makes HTTP calls to other services
 * 
 * Port: 3007
 */

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const adminRoutes = require('./routes/admin.js');
const adminController = require('./controllers/admin.js');

// Shared utilities
let serviceClient;
try {
    ({ serviceClient } = require('../../../shared'));
} catch {
    ({ serviceClient } = require('/app/shared'));
}

let setupMetrics;
try {
    ({ setupMetrics } = require('../../../shared/src/metrics'));
} catch {
    ({ setupMetrics } = require('/app/shared/src/metrics'));
}

const app = express();
const PORT = process.env.PORT || 3007;

// ===== Middleware =====
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
setupMetrics(app, 'admin-service');
app.use(cors());
app.use(express.json());

// ===== Health Check =====
app.get('/health', (req, res) => {
    res.json({
        service: 'admin-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        type: 'aggregator (no database, no message broker)'
    });
});

// ===== Routes =====
app.use('/', adminRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
    console.error(`[Admin Service Error] ${req.method} ${req.originalUrl}:`, err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? 'Internal server error' : err.message
    });
});

// ===== Startup =====
function startService() {
    // Inject dependencies
    adminController.setDependencies({
        serviceClient,
        authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        listingServiceUrl: process.env.LISTING_SERVICE_URL || 'http://localhost:3002',
        reviewServiceUrl: process.env.REVIEW_SERVICE_URL || 'http://localhost:3003',
        bookingServiceUrl: process.env.BOOKING_SERVICE_URL || 'http://localhost:3004'
    });

    app.listen(PORT, () => {
        console.log(`[Admin Service] Running on port ${PORT}`);
        console.log(`[Admin Service] Type: Pure aggregator (no DB, no MQ)`);
    });
}

// ===== Graceful Shutdown =====
process.on('SIGTERM', () => {
    console.log('[Admin Service] SIGTERM received. Shutting down...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('[Admin Service] SIGINT received. Shutting down...');
    process.exit(0);
});

startService();

module.exports = app;
