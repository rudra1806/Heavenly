/**
 * BFF Auth Routes — session ↔ JWT translation layer.
 * 
 * Browser sends forms → BFF calls Auth Service API → stores JWT in session.
 */

const express = require('express');
const router = express.Router();
const { login, register, logout } = require('../utils/apiClient.js');

// GET /signup — render signup form
router.get('/signup', (req, res) => {
    if (req.session.user) return res.redirect('/listings');
    res.render('users/signup.ejs');
});

// POST /signup — register user
router.post('/signup', async (req, res) => {
    try {
        await register(req.body, req.session);
        req.flash('success', 'Welcome to Heavenly!');
        res.redirect('/listings');
    } catch (err) {
        req.flash('error', err.message || 'Registration failed.');
        res.redirect('/signup');
    }
});

// GET /login — render login form
router.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/listings');
    res.render('users/login.ejs');
});

// POST /login — authenticate user
router.post('/login', async (req, res) => {
    try {
        const redirectUrl = req.session.redirectUrl || '/listings';
        await login(req.body, req.session);
        req.flash('success', 'Welcome back!');
        res.redirect(redirectUrl);
    } catch (err) {
        req.flash('error', err.message || 'Login failed.');
        res.redirect('/login');
    }
});

// GET /logout — clear session
router.get('/logout', async (req, res) => {
    await logout(req.session);
    req.flash('success', 'Logged out successfully.');
    res.redirect('/listings');
});

module.exports = router;
