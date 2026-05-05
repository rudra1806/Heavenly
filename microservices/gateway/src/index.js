/**
 * API Gateway — the single entry point for all client requests.
 * 
 * Responsibilities:
 *   1. Route proxying — forwards requests to the correct microservice
 *   2. JWT validation — verifies tokens before forwarding to protected routes
 *   3. Rate limiting — protects services from abuse
 *   4. CORS — handles cross-origin requests
 *   5. Request logging — centralized access logs
 * 
 * The Gateway does NOT contain business logic. It is a thin routing layer.
 */

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { setupProxies } = require('./proxy');
const { jwtValidation } = require('./middleware/jwtValidation');
const { rateLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Global Middleware =====

// Request logging
app.use(morgan('[:date[iso]] :method :url :status :res[content-length] - :response-time ms'));

// CORS — allow BFF and frontend to call the gateway
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Parse JSON bodies (needed for some gateway-level operations)
app.use(express.json({ limit: '10mb' }));

// Rate limiting — global baseline
app.use(rateLimiter);

// ===== Health Check =====
app.get('/health', (req, res) => {
    res.json({
        service: 'api-gateway',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// ===== JWT Validation for Protected Routes =====
// Auth routes are PUBLIC (login, register don't need a token)
// All other service routes go through JWT validation
app.use('/api/listings', jwtValidation.optional);   // Listings can be browsed anonymously
app.use('/api/reviews', jwtValidation.optional);     // Reviews can be read anonymously
app.use('/api/search', jwtValidation.optional);      // Search is public
app.use('/api/bookings', jwtValidation.required);    // Bookings require auth
app.use('/api/media', jwtValidation.required);       // Media uploads require auth
app.use('/api/admin', jwtValidation.required, jwtValidation.requireAdmin); // Admin requires admin role

// ===== Proxy Routes =====
setupProxies(app);

// ===== Error Handling =====
app.use(errorHandler);

// ===== Start Server =====
app.listen(PORT, () => {
    console.log(`[Gateway] API Gateway running on port ${PORT}`);
    console.log(`[Gateway] Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
