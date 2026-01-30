const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user.js');
const wrapAsync = require('../utils/wrapAsync');
const { saveRedirectTo } = require('../utils/isLoggedIn.js');
const Listing = require('../models/listing.js');
const Review = require('../models/review.js');
const { reviewSchema } = require('../schemas.js');

//controllers
const userController = require('../controllers/user.js');
const user = require('../models/user.js');


// Register route
router.get('/signup', userController.renderSignupForm);

// Handle user registration
router.post('/signup', saveRedirectTo, wrapAsync(userController.handleUserRegistration));

// Login routes 
router.get('/login', userController.renderLoginForm);

// Handle user login 
router.post('/login', saveRedirectTo, passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), wrapAsync(userController.handleUserLogin));


// logout route 
router.get('/logout', userController.handleUserLogout);

module.exports = router;