/**
 * Media Service — Entry Point
 * 
 * Responsibilities:
 *   - Image upload to Cloudinary
 *   - Image deletion from Cloudinary
 * 
 * This is the simplest service — no database, no message broker.
 * Just an Express server wrapping Cloudinary operations.
 * 
 * Port: 3005
 */

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

// Routes
const mediaRoutes = require('./routes/media.js');

let setupMetrics;
try {
    ({ setupMetrics } = require('../../../shared/src/metrics'));
} catch {
    ({ setupMetrics } = require('/app/shared/src/metrics'));
}

const app = express();
const PORT = process.env.PORT || 3005;

// ===== Middleware =====
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
setupMetrics(app, 'media-service');
app.use(cors());
app.use(express.json());

// ===== Health Check =====
app.get('/health', (req, res) => {
    res.json({
        service: 'media-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        cloudinary: process.env.CLOUD_NAME ? 'configured' : 'not configured'
    });
});

// ===== Routes =====
app.use('/', mediaRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
    console.error(`[Media Service Error] ${req.method} ${req.originalUrl}:`, err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        error: statusCode === 500 ? 'Internal server error' : err.message
    });
});

// ===== Start Server =====
app.listen(PORT, () => {
    console.log(`[Media Service] Running on port ${PORT}`);
    console.log(`[Media Service] Cloudinary: ${process.env.CLOUD_NAME || 'NOT CONFIGURED'}`);
});

module.exports = app;
