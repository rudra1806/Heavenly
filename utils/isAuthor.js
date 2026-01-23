const Review = require('../models/review.js');

// Middleware to check if current user is the owner of the listing
module.exports = async function isAuthor(req, res, next) {
    const { id, reviewId } = req.params;
    const review = await Review.findById(reviewId);
    
    if (!review) {
        req.flash('error', 'Review not found!');
        return res.redirect('/listings');
    }
    
    if (!review.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/listings/${id}`);
    }
    
    next();
}
