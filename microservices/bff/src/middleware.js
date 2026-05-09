/**
 * BFF Middleware — replaces Passport.js middleware from monolith.
 * 
 * Instead of passport.authenticate(), we check for JWT tokens stored in session.
 */

/**
 * isLoggedIn — replaces Passport's isAuthenticated()
 * Checks if the session has a valid JWT token.
 */
function isLoggedIn(req, res, next) {
    if (!req.session?.user || !req.session?.accessToken) {
        req.session.redirectUrl = req.originalUrl;
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
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
