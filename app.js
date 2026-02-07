if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}

const express = require('express');
const app = express();
const port = process.env.PORT || 8080;
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');

// Session management
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const flash = require('connect-flash');

// Authentication
const passport = require('passport');
const LocalStrategy = require('passport-local');

// User model
const User = require('./models/user.js');

// Routes
const listingsRoutes = require('./routes/listings.js');
const reviewsRoutes = require('./routes/reviews.js');
const usersRoutes = require('./routes/users.js');
const pagesRoutes = require('./routes/pages.js');

// Custom utilities
const ExpressError = require('./utils/ExpressError.js');

// Database connection
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/heavenly';

// ===== Middleware Setup =====
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// ===== Database Connection =====
mongoose.connect(MONGO_URL)
    .then(() => console.log('Successfully Connected to MongoDB'))
    .catch(err => console.log('MongoDB Connection Error:', err));


// Session configuration

// Use MongoDB to store session data for better scalability and persistence compared to in-memory store (which is not suitable for production)
const store = MongoStore.create({
    mongoUrl: MONGO_URL,
    crypto: {
        secret: process.env.SESSION_SECRET || 'thisshouldbeabettersecret',
    },
    touchAfter: 24 * 3600, // Lazy update session every 24 hours
});

// Log any session store errors to the console for debugging
store.on('error', function (e) {
    console.log('SESSION STORE ERROR:', e);
});

// Session configuration with secure defaults and environment variable for secret
const sessionOptions = {
    store,
    secret: process.env.SESSION_SECRET || 'thisshouldbeabettersecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 1 week
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};
app.use(session(sessionOptions));
app.use(flash());

// ===== Passport Configuration =====
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ===== Flash Messages Middleware =====

// Flash message middleware
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// ===== Routes =====

// Home
app.get('/', (req, res) => {
    res.render('home.ejs');
});

// User Routes

app.use('/', usersRoutes);


//listings Route

app.use('/', listingsRoutes);

// Review Routes

app.use('/', reviewsRoutes);

// Static Pages Routes

app.use('/', pagesRoutes);

// ===== Error Handling =====

// 404 - Catch unmatched routes
app.use((req, res, next) => {
    next(new ExpressError(404, 'Page Not Found'));
});

// Global error handler
app.use((err, req, res, next) => {
    const { statusCode = 500, message = 'Something went wrong!' } = err;
    res.status(statusCode).render('error.ejs', { statusCode, message });
});

// ===== Start Server =====
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});