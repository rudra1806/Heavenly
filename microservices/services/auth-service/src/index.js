/**
 * Auth Service — Entry Point
 * 
 * Responsibilities:
 *   - User registration and authentication
 *   - JWT token issuance (access + refresh)
 *   - Token invalidation via Redis blacklist
 *   - User CRUD operations
 *   - Publishing user lifecycle events to RabbitMQ
 * 
 * Port: 3001
 * Database: heavenly_auth
 */

const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');
const { createClient } = require('redis');

// Routes
const authRoutes = require('./routes/auth.js');

// Auth controller (for injecting dependencies)
const authController = require('./controllers/auth.js');

// Shared utilities
let connectRabbitMQ, publishEvent, eventNames;
try {
    ({ connectRabbitMQ, publishEvent, eventNames } = require('../../../shared'));
} catch {
    ({ connectRabbitMQ, publishEvent, eventNames } = require('/app/shared'));
}

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/heavenly_auth';

// ===== Middleware =====
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
app.use(cors());
app.use(express.json());

// ===== Health Check =====
app.get('/health', (req, res) => {
    res.json({
        service: 'auth-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// ===== Routes =====
app.use('/', authRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
    console.error(`[Auth Service Error] ${req.method} ${req.originalUrl}:`, err.message);
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
        console.log('[Auth Service] Connected to MongoDB');

        // 2. Connect to Redis (for JWT blacklist)
        let redisClient = null;
        if (process.env.REDIS_URL) {
            try {
                redisClient = createClient({ url: process.env.REDIS_URL });
                redisClient.on('error', (err) => console.error('[Redis] Error:', err.message));
                await redisClient.connect();
                console.log('[Auth Service] Connected to Redis');

                // Inject Redis client into auth controller
                authController.setRedisClient(redisClient);
            } catch (redisErr) {
                console.warn('[Auth Service] Redis unavailable — logout blacklist disabled:', redisErr.message);
            }
        }

        // 3. Connect to RabbitMQ (for event publishing)
        if (process.env.RABBITMQ_URL) {
            try {
                await connectRabbitMQ(process.env.RABBITMQ_URL);
                console.log('[Auth Service] Connected to RabbitMQ');

                // Inject event publisher into deleteUser controller
                authController.deleteUser._publishEvent = publishEvent;
            } catch (mqErr) {
                console.warn('[Auth Service] RabbitMQ unavailable — events disabled:', mqErr.message);
            }
        }

        // 4. Start HTTP server
        app.listen(PORT, () => {
            console.log(`[Auth Service] Running on port ${PORT}`);
        });

    } catch (err) {
        console.error('[Auth Service] Failed to start:', err.message);
        process.exit(1);
    }
}

// ===== Graceful Shutdown =====
async function shutdown(signal) {
    console.log(`[Auth Service] ${signal} received. Shutting down gracefully...`);
    try {
        await mongoose.connection.close();
        console.log('[Auth Service] MongoDB connection closed');
    } catch (err) {
        console.error('[Auth Service] Error during shutdown:', err.message);
    }
    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startService();

module.exports = app;
