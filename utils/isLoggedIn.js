// middleware to check if user is logged in or not

module.exports = function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        // For POST requests to reviews, store the review data in session
        if (req.method === 'POST' && req.originalUrl.includes('/reviews')) {
            // Extract listing ID from URL: /listings/:id/reviews
            const match = req.originalUrl.match(/\/listings\/([^\/]+)\/reviews/); // Regex to capture listing ID
            const listingId = match ? match[1] : req.params.id; // Fallback to req.params.id if regex fails
            req.session.pendingReview = {
                listingId: listingId,
                reviewData: req.body.review
            };
            req.session.redirectTo = `/listings/${listingId}`;
        } else {
            req.session.redirectTo = req.originalUrl;
        }
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
    if (req.session.pendingReview) {
        res.locals.pendingReview = req.session.pendingReview;
    }
    next();
}