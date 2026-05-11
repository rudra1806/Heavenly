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
 *   - Global: 500 requests per 15-minute window per user
 *   - Auth endpoints: 20 requests per 15-minute window (prevent brute force)
 * 
 * Key strategy:
 *   In Docker, the BFF is a single container making requests on behalf of all
 *   users. Using raw IP would apply a single rate limit to ALL users combined.
 *   Instead, we use X-User-Id (from JWT validation) when available, falling back
 *   to IP for anonymous requests. This distributes rate limits per actual user.
 */

const rateLimit = require('express-rate-limit');

// Global rate limiter — baseline protection for all routes
const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500,                  // 500 requests per window per key
    standardHeaders: true,     // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,      // Disable `X-RateLimit-*` headers

    // Use authenticated user ID when available, fall back to IP
    // This prevents the BFF single-IP problem where all users share one limit
    keyGenerator: (req) => {
        return req.user?.id || req.ip || req.connection?.remoteAddress || 'anonymous';
    },

    // Custom response when rate limit is exceeded
    handler: (req, res) => {
        console.warn(`[Rate Limit] Exceeded for key: ${req.user?.id || req.ip} on ${req.method} ${req.originalUrl}`);
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
