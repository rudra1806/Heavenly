const Listing = require('../models/listing.js');
const Review = require('../models/review.js');
const User = require('../models/user.js');
const { cloudinary } = require('../cloudConfig.js');

// Dashboard — show platform stats
module.exports.dashboard = async (req, res) => {
    const totalUsers = await User.countDocuments();
    const totalListings = await Listing.countDocuments();
    const totalReviews = await Review.countDocuments();

    // Recent activity
    const recentUsers = await User.find().sort({ _id: -1 }).limit(5);
    const recentListings = await Listing.find().sort({ _id: -1 }).limit(5).populate('owner');
    const recentReviews = await Review.find().sort({ _id: -1 }).limit(5).populate('author');

    res.render('admin/dashboard.ejs', {
        totalUsers,
        totalListings,
        totalReviews,
        recentUsers,
        recentListings,
        recentReviews
    });
};

// All Users — list with search
module.exports.allUsers = async (req, res) => {
    const searchQuery = req.query.search;
    let users;

    if (searchQuery && searchQuery.trim() !== '') {
        // SECURITY: Escape special regex characters to prevent ReDoS attacks or crashes
        // e.g. "C++" becomes "C\+\+" so it matches the literal text instead of regex operators
        const escapedQuery = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedQuery, 'i');
        users = await User.find({
            $or: [
                { username: searchRegex },
                { email: searchRegex }
            ]
        });
    } else {
        users = await User.find();
    }

    res.render('admin/users.ejs', { users, searchQuery: searchQuery || '' });
};

// Delete User — remove user and all their data
module.exports.deleteUser = async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
        req.flash('error', 'User not found!');
        return res.redirect('/admin/users');
    }

    // Prevent admin from deleting themselves
    if (user._id.equals(req.user._id)) {
        req.flash('error', 'You cannot delete your own admin account!');
        return res.redirect('/admin/users');
    }

    // CASCADE DELETE: Listings
    // 1. Find all listings by this user
    // 2. Delete their images from Cloudinary to save storage
    // 3. Delete the listing documents from MongoDB
    const userListings = await Listing.find({ owner: userId });
    for (const listing of userListings) {
        if (listing.image.filename && listing.image.filename !== 'default.jpg') {
            await cloudinary.uploader.destroy(listing.image.filename);
        }
    }
    await Listing.deleteMany({ owner: userId });

    // CASCADE DELETE: Reviews
    // 1. Find all reviews by this user
    // 2. Remove references to these reviews from their respective Listings (using $pull)
    // 3. Delete the review documents themselves
    const userReviews = await Review.find({ author: userId });
    const reviewIds = userReviews.map(r => r._id);

    // Remove review references from listings
    await Listing.updateMany(
        { reviews: { $in: reviewIds } },
        { $pull: { reviews: { $in: reviewIds } } }
    );
    await Review.deleteMany({ author: userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    req.flash('success', `User "${user.username}" and all their data deleted successfully!`);
    res.redirect('/admin/users');
};

// All Listings — list with admin actions
module.exports.allListings = async (req, res) => {
    const searchQuery = req.query.search;
    let listings;

    if (searchQuery && searchQuery.trim() !== '') {
        // SECURITY: Escape special regex characters
        const escapedQuery = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedQuery, 'i');
        listings = await Listing.find({
            $or: [
                { title: searchRegex },
                { location: searchRegex },
                { country: searchRegex }
            ]
        }).populate('owner');
    } else {
        listings = await Listing.find().populate('owner');
    }

    res.render('admin/listings.ejs', { listings, searchQuery: searchQuery || '' });
};

// All Reviews — list with admin actions
module.exports.allReviews = async (req, res) => {
    const searchQuery = req.query.search;
    let reviews;

    if (searchQuery && searchQuery.trim() !== '') {
        const escapedQuery = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escapedQuery, 'i');
        // Search in reviews by comment content (case-insensitive)
        reviews = await Review.find({
            comment: searchRegex
        }).populate('author');
    } else {
        reviews = await Review.find().populate('author');
    }

    // Get listing info for each review
    const reviewsWithListings = await Promise.all(
        reviews.map(async (review) => {
            const listing = await Listing.findOne({ reviews: review._id });
            return {
                ...review.toObject(),
                listing: listing ? { _id: listing._id, title: listing.title } : null
            };
        })
    );

    res.render('admin/reviews.ejs', { reviews: reviewsWithListings, searchQuery: searchQuery || '' });
};

// Delete Review (from admin panel)
module.exports.deleteReview = async (req, res) => {
    const { reviewId } = req.params;
    const review = await Review.findById(reviewId);

    if (!review) {
        req.flash('error', 'Review not found!');
        return res.redirect('/admin/reviews');
    }

    // Remove review reference from the listing
    await Listing.updateMany(
        { reviews: reviewId },
        { $pull: { reviews: reviewId } }
    );

    await Review.findByIdAndDelete(reviewId);

    req.flash('success', 'Review deleted successfully!');
    res.redirect('/admin/reviews');
};
