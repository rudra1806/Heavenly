const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user.js');
const wrapAsync = require('../utils/wrapAsync');
const { saveRedirectTo } = require('../utils/isLoggedIn.js');

// Register route
router.get('/signup', (req, res) => {
    res.render('../views/users/signup.ejs');
});

// Handle user registration
router.post('/signup', saveRedirectTo, wrapAsync(async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to Heavenly!');
            const redirectUrl = res.locals.redirectTo || '/listings';
            delete req.session.redirectTo; // Clear after successful signup
            res.redirect(redirectUrl);
        });
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/signup');
    }
}));

// Login routes 
router.get('/login', (req, res) => {
    res.render('../views/users/login.ejs');
});

// Handle user login 
router.post('/login', saveRedirectTo, passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    const redirectUrl = res.locals.redirectTo || '/listings';
    delete req.session.redirectTo; // Clear after successful login
    req.flash('success', 'Welcome back!');
    res.redirect(redirectUrl);
});


// logout route 
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Logged you out!');
        res.redirect('/listings');
    });
});

module.exports = router;