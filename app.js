const express = require('express');
const app = express();
const port = 8080;
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');

// Routes
const listingsRoutes = require('./routes/listings.js');
const reviewsRoutes = require('./routes/reviews.js');

// Custom utilities
const ExpressError = require('./utils/ExpressError.js');

// Database connection
const MONGO_URL = 'mongodb://127.0.0.1:27017/heavenly';

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

// ===== Routes =====

// Home
app.get('/', (req, res) => {
    res.send('Hello, server is up and running!');
});

//listings Route

app.use('/', listingsRoutes);

// Review Routes

app.use('/', reviewsRoutes);


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