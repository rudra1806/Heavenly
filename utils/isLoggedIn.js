// middleware to check if user is logged in or not

module.exports = function isLoggedIn(req, res, next) {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
    }
    next();
}