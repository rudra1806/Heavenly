// Middleware to check if the current user has admin privileges

module.exports = function isAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        req.flash('error', 'Admin access required!');
        return res.redirect('/listings');
    }
    next();
};
