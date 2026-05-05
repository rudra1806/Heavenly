/**
 * Rate limiter middleware for the API Gateway.
 * 
 * Protects backend services from excessive requests.
 * Uses a sliding window approach with in-memory store (default).
 * 
 * In production, you'd swap this for a Redis-backed store
 * so rate limits are shared across multiple gateway instances.
 * 
 * Configuration:
 *   - Global: 100 requests per 15-minute window per IP
 *   - Auth endpoints could have stricter limits (prevent brute force)
 */

const rateLimit = require('express-rate-limit');

// Global rate limiter — baseline protection for all routes
const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,                  // 100 requests per window per IP
    standardHeaders: true,     // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,      // Disable `X-RateLimit-*` headers

    // Custom response when rate limit is exceeded
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        });
    },

    // Skip rate limiting for health checks
    skip: (req) => req.path === '/health'
});

// Stricter rate limiter for auth endpoints (brute force protection)
const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                   // 20 login/register attempts per window
    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
        res.status(429).json({
            success: false,
            error: 'Too many authentication attempts. Please try again in 15 minutes.'
        });
    }
});

module.exports = { rateLimiter, authRateLimiter };
