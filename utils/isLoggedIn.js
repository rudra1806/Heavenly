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
        } 
        // For DELETE requests to reviews, store the delete operation in session
        else if (req.method === 'DELETE' && req.originalUrl.includes('/reviews')) {
            // Extract listing ID and review ID from URL: /listings/:id/reviews/:reviewId
            // Remove query string before matching
            const urlWithoutQuery = req.originalUrl.split('?')[0]; // Remove query string if present 
            const match = urlWithoutQuery.match(/\/listings\/([^\/]+)\/reviews\/([^\/]+)/); // Regex to capture listing ID and review ID
            if (match) {
                req.session.pendingDeleteReview = {
                    listingId: match[1],
                    reviewId: match[2]
                };
                req.session.redirectTo = `/listings/${match[1]}`;
            }
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
    if (req.session.pendingDeleteReview) {
        res.locals.pendingDeleteReview = req.session.pendingDeleteReview;
    }
    next();
}