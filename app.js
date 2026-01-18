const express = require('express');
const app = express();
const port = 8080;
const mongoose = require('mongoose');
const MONGO_URL = 'mongodb://127.0.0.1:27017/heavenly';
const Listing = require('./models/listing');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate'); // Import ejs-mate for EJS template layouts
const wrapAsync = require('./utils/wrapAsync'); // Import error handling wrapper
const ExpressError = require('./utils/ExpressError.js'); // Import custom error class


app.engine('ejs', ejsMate); // Use ejs-mate for EJS templates

app.use(methodOverride('_method'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory

main()
.then(() => console.log('Successfully Connected to MongoDB'))
.catch(err => console.log(err));

async function main() {
  await mongoose.connect(MONGO_URL);
}

//Home Routes
app.get('/', (req, res) => {
    res.send('Hello, server is up and running!');
});

// Listings Route
app.get('/listings', wrapAsync(async (req, res) => {
    let allListings = await Listing.find({});
    res.render('listings/index.ejs', { listings: allListings });
}));

// New Listing Form Route
app.get('/listings/new', (req, res) => {
    res.render('listings/new.ejs');
});

// Create Listing Route
app.post('/listings', wrapAsync(async (req, res) => {
    const { title, description, price, location, country } = req.body;
    
    // Validate required fields
    if (!title?.trim() || !description?.trim() || !price || !location?.trim() || !country?.trim()) {
        throw new ExpressError(400, 'All fields are required and cannot be empty');
    }

    // Validate numeric values
    if (price <= 0) {
        throw new ExpressError(400, 'Price must be a positive number');
    }
    
    let newListing = new Listing(req.body);
    await newListing.save();
    res.redirect('/listings');
}));

// Single Listing Route
app.get('/listings/:id', wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, 'Listing not found');
    }
    res.render('listings/show.ejs', { listing });
}));

// Edit Listing Form Route
app.get('/listings/:id/edit', wrapAsync(async (req, res) => {
    let listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, 'Listing not found');
    }
    res.render('listings/edit.ejs', { listing });
}));

// Update Listing Route
app.put('/listings/:id', wrapAsync(async (req, res) => {
    const { title, description, price, location, country, image } = req.body;
    
    // Validate required fields
    if (!title?.trim() || !description?.trim() || !price || !location?.trim() || !country?.trim()) {
        throw new ExpressError(400, 'All fields are required and cannot be empty');
    }

    // Validate numeric values
    if (price <= 0) {
        throw new ExpressError(400, 'Price must be a positive number');
    }
    
    // Validate image fields
    if (!image || !image.url || !image.filename) {
        throw new ExpressError(400, 'Image URL and filename are required');
    }

    // Validate if ID exists
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, 'Listing not found');
    }
    
    await Listing.findByIdAndUpdate(req.params.id, req.body, { runValidators: true });
    res.redirect(`/listings/${req.params.id}`);
}));

// Delete Listing Route
app.delete('/listings/:id', wrapAsync(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, 'Listing not found');
    }
    await Listing.findByIdAndDelete(req.params.id);
    res.redirect('/listings');
}));

// 404 Handler for unmatched routes
app.use((req, res, next) => {
    next(new ExpressError(404, 'Page Not Found'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    let { statusCode = 500, message = 'Something went wrong!' } = err;
    res.render('error.ejs', { statusCode, message });
});

app.listen(port,()=>{
    console.log(`Server is running on http://localhost:${port}`);
});