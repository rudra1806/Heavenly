// middleware to check if user is logged in or not

module.exports = function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        req.session.redirectTo = req.originalUrl; // Store the original URL
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
    }
    next();
}

module.exports.saveRedirectTo = function(req, res, next) {
    if (req.session.redirectTo) {
        res.locals.redirectTo = req.session.redirectTo;
        // Don't delete here - will be cleared after successful login/signup in route handler
    }
    next();
}