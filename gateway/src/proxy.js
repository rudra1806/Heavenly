/**
 * Proxy configuration — maps incoming API paths to backend microservices.
 * 
 * Each route prefix is forwarded to the corresponding service URL.
 * The proxy strips the /api prefix and forwards the rest.
 * 
 * Example:
 *   Client: GET /api/listings/abc123
 *   Gateway proxies to: GET http://listing-service:3002/listings/abc123
 */

const { createProxyMiddleware } = require('http-proxy-middleware');

// Service URL configuration (from environment variables)
const SERVICES = {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    listing: process.env.LISTING_SERVICE_URL || 'http://localhost:3002',
    review: process.env.REVIEW_SERVICE_URL || 'http://localhost:3003',
    booking: process.env.BOOKING_SERVICE_URL || 'http://localhost:3004',
    media: process.env.MEDIA_SERVICE_URL || 'http://localhost:3005',
    search: process.env.SEARCH_SERVICE_URL || 'http://localhost:3006',
    admin: process.env.ADMIN_SERVICE_URL || 'http://localhost:3007'
};

/**
 * Route definitions — maps API paths to service targets.
 * 
 * pathRewrite: Strips the /api prefix so services receive clean paths
 *   e.g., /api/auth/login → /auth/login at the auth service
 */
const ROUTES = [
    {
        path: '/api/auth',
        target: SERVICES.auth,
        servicePrefix: '/auth'
    },
    {
        path: '/api/listings',
        target: SERVICES.listing,
        servicePrefix: '/listings'
    },
    {
        path: '/api/reviews',
        target: SERVICES.review,
        servicePrefix: '/reviews'
    },
    {
        path: '/api/bookings',
        target: SERVICES.booking,
        servicePrefix: '/bookings'
    },
    {
        path: '/api/media',
        target: SERVICES.media,
        servicePrefix: '/media'
    },
    {
        path: '/api/search',
        target: SERVICES.search,
        servicePrefix: '/search'
    },
    {
        path: '/api/geocode',
        target: SERVICES.search,
        servicePrefix: '/geocode'
    },
    {
        path: '/api/admin',
        target: SERVICES.admin,
        servicePrefix: '/admin'
    },
    {
        path: '/api/dashboard',
        target: SERVICES.admin,
        servicePrefix: '/dashboard'
    }
];

/**
 * Sets up proxy middleware for each route.
 * 
 * @param {Express} app - Express application instance
 */
function setupProxies(app) {
    ROUTES.forEach(route => {
        const proxyOptions = {
            target: route.target,
            changeOrigin: true,
            // Timeout: don't let requests hang forever if a service is down
            proxyTimeout: 15000,  // 15s timeout for the proxy connection
            timeout: 15000,       // 15s timeout for the incoming request

            // Express strips the mount path (e.g., '/api/listings') from req.url,
            // leaving only the remaining path (e.g., '/' or '/:id').
            // We prepend the service prefix to reconstruct the correct path.
            // Example: mount='/api/listings', req.url='/' → rewritten to '/listings'
            //          mount='/api/listings', req.url='/abc123' → rewritten to '/listings/abc123'
            pathRewrite: (path) => {
                return route.servicePrefix + path;
            },

            // Log proxy activity
            on: {
                proxyReq: (proxyReq, req) => {
                    // Forward user info from JWT validation (set by gateway middleware)
                    if (req.user) {
                        proxyReq.setHeader('X-User-Id', req.user.id);
                        proxyReq.setHeader('X-User-Username', req.user.username);
                        proxyReq.setHeader('X-User-Email', req.user.email);
                        proxyReq.setHeader('X-User-Role', req.user.role);
                    }
                },
                proxyRes: (proxyRes, req) => {
                    console.log(`[Proxy] ${req.method} ${req.originalUrl} → ${route.target} [${proxyRes.statusCode}]`);
                },
                error: (err, req, res) => {
                    console.error(`[Proxy] Error proxying ${req.method} ${req.originalUrl}:`, err.message);
                    if (!res.headersSent) {
                        const isTimeout = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.message?.includes('timeout');
                        res.status(503)
                            .set('Retry-After', '2')  // Tell BFF to retry in 2 seconds
                            .json({
                                success: false,
                                error: isTimeout
                                    ? 'Service request timed out. Please try again.'
                                    : 'Service temporarily unavailable',
                                service: route.path.replace('/api/', '')
                            });
                    }
                }
            }
        };

        app.use(route.path, createProxyMiddleware(proxyOptions));
    });

    console.log('[Gateway] Proxy routes configured:');
    ROUTES.forEach(r => console.log(`  ${r.path} → ${r.target}`));
}

module.exports = { setupProxies, SERVICES, ROUTES };
