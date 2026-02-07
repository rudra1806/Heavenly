const Listing = require('../models/listing.js');
const Review = require('../models/review.js');
const User = require('../models/user.js');
const { reviewSchema } = require('../schemas.js');

//Register route
module.exports.renderSignupForm =  (req, res) => {
    // Save the referer URL if user came from a listing page (voluntary signup from navbar)
    if (!req.session.redirectTo && req.get('Referer')) {
        const referer = req.get('Referer');
        const url = new URL(referer);
        // Only save if it's a local path (not login/signup pages)
        if (url.pathname && !url.pathname.includes('/login') && !url.pathname.includes('/signup')) {
            req.session.redirectTo = url.pathname;
        }
    }
    res.render('../views/users/signup.ejs');
};

//handle user registration

module.exports.handleUserRegistration = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, async (err) => {
            if (err) return next(err);
            
            // Check if there's a pending review to submit
            if (res.locals.pendingReview) {
                const { listingId, reviewData } = res.locals.pendingReview;
                const listing = await Listing.findById(listingId);
                // Validate the review data before saving
                const { error } = reviewSchema.validate(reviewData);
                if (listing && reviewData && !error) {
                    const review = new Review(reviewData);
                    review.author = registeredUser._id; // Associate review with new user
                    listing.reviews.push(review);
                    await review.save();
                    await listing.save();
                    delete req.session.pendingReview;
                    delete req.session.redirectTo;
                    req.flash('success', 'Welcome to Heavenly! Your review has been added.');
                    return res.redirect(`/listings/${listingId}`);
                } else {
                    delete req.session.pendingReview;
                    // If validation failed, redirect to listing so they can try again
                    if (error) {
                        req.flash('error', 'Review validation failed. Please try again.');
                        return res.redirect(`/listings/${listingId}`);
                    }
                }
            }
            
            req.flash('success', 'Welcome to Heavenly!');
            const redirectUrl = res.locals.redirectTo || '/listings';
            delete req.session.redirectTo; // Clear after successful signup
            res.redirect(redirectUrl);
        });
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/signup');
    }
};


//login route
module.exports.renderLoginForm =  (req, res) => {
    // Save the referer URL if user came from a listing page (voluntary login from navbar)
    if (!req.session.redirectTo && req.get('Referer')) {
        const referer = req.get('Referer');
        const url = new URL(referer);
        // Only save if it's a local path (not login/signup pages)
        if (url.pathname && !url.pathname.includes('/login') && !url.pathname.includes('/signup')) {
            req.session.redirectTo = url.pathname;
        }
    }
    res.render('../views/users/login.ejs');
};

//handle user login
module.exports.handleUserLogin = async (req, res) => {
    // Check if there's a pending review to submit
    if (res.locals.pendingReview) {
        const { listingId, reviewData } = res.locals.pendingReview;
        const listing = await Listing.findById(listingId);
        // Validate the review data before saving
        const { error } = reviewSchema.validate(reviewData);
        if (listing && reviewData && !error) {
            const review = new Review(reviewData);
            review.author = req.user._id; // Associate review with logged-in user
            listing.reviews.push(review);
            await review.save();
            await listing.save();
            delete req.session.pendingReview;
            delete req.session.redirectTo;
            req.flash('success', 'Welcome back! Your review has been added.');
            return res.redirect(`/listings/${listingId}`);
        } else {
            delete req.session.pendingReview;
            // If validation failed, redirect to listing so they can try again
            if (error) {
                req.flash('error', 'Review validation failed. Please try again.');
                return res.redirect(`/listings/${listingId}`);
            }
        }
    }
    
    const redirectUrl = res.locals.redirectTo || '/listings';
    // console.log('Redirecting to:', redirectUrl); // Debugging line
    delete req.session.redirectTo; // Clear after successful login
    req.flash('success', 'Welcome back!');
    res.redirect(redirectUrl);
};

//logout route
module.exports.handleUserLogout =  (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Logged you out!');
        res.redirect('/listings');
    });
};