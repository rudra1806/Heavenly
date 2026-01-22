const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user.js');
const wrapAsync = require('../utils/wrapAsync');

// Register route
router.get('/signup', (req, res) => {
    res.render('../views/users/signup.ejs');
});

// Handle user registration
router.post('/signup',wrapAsync(async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to Heavenly!');
            res.redirect('/listings');
        });
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/signup');
    }
}));

router.get('/login', (req, res) => {
    res.render('../views/users/login.ejs');
});

router.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Welcome back!');
    res.redirect('/listings');
});

module.exports = router;