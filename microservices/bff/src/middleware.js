/**
 * BFF Middleware — replaces Passport.js middleware from monolith.
 * 
 * Instead of passport.authenticate(), we check for JWT tokens stored in session.
 */

const { apiCall } = require('./utils/apiClient.js');

// Cache to avoid checking user existence on every request
// Format: { userId: { lastChecked: timestamp, exists: boolean } }
const userValidationCache = new Map();
const VALIDATION_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes (reduced from 60s)

/**
 * isLoggedIn — replaces Passport's isAuthenticated()
 * Checks if the session has a valid JWT token and periodically verifies user still exists.
 * 
 * Resilience: validation failures are non-blocking. If the auth service is
 * temporarily down, the cached session data is used. Only a confirmed 404
 * (user deleted) triggers session destruction.
 */
async function isLoggedIn(req, res, next) {
    if (!req.session?.user || !req.session?.accessToken) {
        req.session.redirectUrl = req.originalUrl;
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
    }

    const userId = req.session.user.id || req.session.user._id;
    const now = Date.now();
    const cached = userValidationCache.get(userId);

    // Check if we need to validate (no cache or cache expired)
    const needsValidation = !cached || (now - cached.lastChecked) > VALIDATION_INTERVAL;

    if (needsValidation) {
        try {
            const response = await apiCall(`/api/auth/users/${userId}`, { session: req.session });
            
            if (!response.success || !response.data?.user) {
                // User has been deleted - clear cache, destroy session, redirect
                userValidationCache.delete(userId);
                const errorMsg = 'Your account has been deleted. Please contact support if this is an error.';
                req.session.destroy((err) => {
                    if (err) console.error('Session destroy error:', err);
                });
                // Use a redirect with a query param since flash won't work after session.destroy()
                return res.redirect('/login?error=' + encodeURIComponent(errorMsg));
            }

            // Update cache
            userValidationCache.set(userId, {
                lastChecked: now,
                exists: true
            });

            // Update session with latest user data and normalize id field
            const user = response.data.user;
            user.id = user._id || user.id; // Ensure id field exists
            req.session.user = user;
        } catch (err) {
            // If user fetch fails (404 = deleted)
            if (err.statusCode === 404 || err.message?.includes('not found')) {
                userValidationCache.delete(userId);
                const errorMsg = 'Your account has been deleted. Please contact support if this is an error.';
                req.session.destroy((destroyErr) => {
                    if (destroyErr) console.error('Session destroy error:', destroyErr);
                });
                // Use redirect with query param instead of flash (session is destroyed)
                return res.redirect('/login?error=' + encodeURIComponent(errorMsg));
            }
            // For other errors (503, timeout, etc.), log but allow through
            // The cached session data is still valid — don't break the user's experience
            // over a temporary API issue
            console.warn('[Middleware] User validation error (non-blocking):', err.message);
            // Update cache timestamp to prevent hammering a failing service
            userValidationCache.set(userId, {
                lastChecked: now,
                exists: true
            });
        }
    }

    next();
}

/**
 * isAdmin — checks if the logged-in user has admin role.
 */
function isAdmin(req, res, next) {
    if (req.session?.user?.role !== 'admin') {
        req.flash('error', 'You do not have admin access.');
        return res.redirect('/listings');
    }
    next();
}

module.exports = { isLoggedIn, isAdmin };
