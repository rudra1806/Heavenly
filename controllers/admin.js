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
    // IMPORTANT: We must delete listings individually (not with deleteMany) to trigger
    // the listingSchema.post('findOneAndDelete') middleware hook defined in models/listing.js
    // 
    // WHY THIS MATTERS:
    // - The post-hook automatically deletes all reviews associated with each listing
    // - Using Listing.deleteMany() bypasses middleware hooks (bulk operations don't trigger them)
    // - Without the hook, reviews on the deleted user's listings would become orphaned in the database
    // - This includes reviews written by OTHER users, not just the deleted user's own reviews
    // 
    // PROCESS:
    // 1. Find all listings owned by this user
    // 2. For each listing:
    //    a. Delete the listing's image from Cloudinary (to free up storage)
    //    b. Delete the listing using findByIdAndDelete (triggers the middleware hook)
    //    c. The hook then automatically deletes all associated reviews
    const userListings = await Listing.find({ owner: userId });
    for (const listing of userListings) {
        // Clean up Cloudinary storage (skip default images)
        if (listing.image.filename && listing.image.filename !== 'default.jpg') {
            await cloudinary.uploader.destroy(listing.image.filename);
        }
        // Delete listing individually to trigger post('findOneAndDelete') hook
        // This ensures all reviews on this listing are also deleted automatically
        await Listing.findByIdAndDelete(listing._id);
    }

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

    // PERFORMANCE OPTIMIZATION: Fetch listing info for each review efficiently
    // 
    // PROBLEM (N+1 Query Pattern):
    // - The original code used Promise.all with reviews.map(async review => Listing.findOne(...))
    // - This creates one database query PER review (if 100 reviews = 100 queries!)
    // - As review count grows, this becomes extremely slow and resource-intensive
    // 
    // SOLUTION (Single Bulk Query):
    // - Make ONE query to fetch all listings that contain any of our review IDs
    // - Build a Map for O(1) constant-time lookups when matching reviews to listings
    // - This scales efficiently: 10 reviews or 10,000 reviews = still just 1 query
    // 
    // PERFORMANCE COMPARISON:
    // - Old approach: O(n) queries where n = number of reviews
    // - New approach: O(1) query regardless of review count
    
    const reviewIds = reviews.map((review) => review._id);
    let listingByReviewId = new Map();
    
    if (reviewIds.length > 0) {
        // Single query: Find all listings that contain any of these review IDs
        // Using $in operator to match multiple review IDs at once
        const listings = await Listing.find({
            reviews: { $in: reviewIds }
        }).select('_id title reviews'); // Only fetch fields we need (optimization)
        
        // Build a Map: reviewId -> listing info
        // Map provides O(1) lookup time vs O(n) for array.find()
        listings.forEach((listing) => {
            if (!Array.isArray(listing.reviews)) return;
            listing.reviews.forEach((revId) => {
                const key = revId.toString();
                // Preserve "first match" behavior (same as original findOne logic)
                // If a review somehow appears in multiple listings, use the first one found
                if (!listingByReviewId.has(key)) {
                    listingByReviewId.set(key, { _id: listing._id, title: listing.title });
                }
            });
        });
    }
    
    // Map each review to include its associated listing info
    // Fast O(1) lookup from our Map instead of querying the database
    const reviewsWithListings = reviews.map((review) => {
        const listing = listingByReviewId.get(review._id.toString()) || null;
        return {
            ...review.toObject(),
            listing
        };
    });

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
