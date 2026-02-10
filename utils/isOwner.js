const Listing = require('../models/listing.js');

// Middleware to check if current user is the owner of the listing
module.exports = async function isOwner(req, res, next) {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }

    // Admin Bypass: "God Mode"
    // Admins can edit/delete ANY listing, regardless of ownership.
    if (req.user.role === 'admin') return next();

    if (!listing.owner.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/listings/${id}`);
    }

    next();
}
