const Listing = require('../models/listing.js');
const { cloudinary } = require('../cloudConfig.js');
const geocode = require('../utils/geocode.js');

// Index - Show all listings with optional search
module.exports.index = async (req, res) => {
    const searchQuery = req.query.search; // Get the search query from the URL (e.g., /listings?search=malibu)
    let allListings;
    let searchPerformed = false;
    
    if (searchQuery && searchQuery.trim() !== '') { // Only perform search if query is not empty
        searchPerformed = true;
        // Escape special regex characters to prevent regex errors
        const escapedQuery = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Case-insensitive search across title, location, country, and description
        const searchRegex = new RegExp(escapedQuery, 'i'); // 'i' for case-insensitive
        allListings = await Listing.find({
            $or: [
                { title: searchRegex },
                { location: searchRegex },
                { country: searchRegex },
                { description: searchRegex }
            ]
        });
    } else {
        allListings = await Listing.find({});
    }
    
    res.render('listings/index.ejs', { 
        listings: allListings, 
        searchQuery: searchQuery || '',
        searchPerformed 
    });
};

// new - Show create form
module.exports.newForm = (req, res) => {
    res.render('listings/new.ejs');
};

// create - Add new listing
module.exports.create = async (req, res) => {
    const newListing = new Listing(req.body);
    
    // Geocode the location using Nominatim (free OpenStreetMap geocoder)
    // Converts "Malibu, United States" → { type: 'Point', coordinates: [-118.78, 34.03] }
    // geocode() handles errors internally and returns default [0,0] on failure
    newListing.geometry = await geocode(`${req.body.location}, ${req.body.country}`);
    
    // If file was uploaded, update the image URL and filename
    if (req.file) {
        newListing.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }
    
    newListing.owner = req.user._id; // Set the owner to current logged in user
    await newListing.save();
    req.flash('success', 'Successfully created a new listing!');
    res.redirect('/listings');
}

// show - Display single listing
module.exports.show = async (req, res) => {
    const listing = await Listing.findById(req.params.id)
        .populate({ path: 'reviews', populate: { path: 'author' } })
        .populate('owner');
    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }
    res.render('listings/show.ejs', { listing });
};

//edit - Show edit form
module.exports.editForm = async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }
    res.render('listings/edit.ejs', { listing });
};

//update - modify existing listing

module.exports.update = async (req, res) => {
    const { id } = req.params;
    
    // Get the existing listing first to check if it exists
    const existingListing = await Listing.findById(id);
    if (!existingListing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }
    
    // Remove empty image object from req.body to prevent overwriting existing image
    if (req.body.image && !req.file) {
        delete req.body.image;
    }
    
    const listing = await Listing.findByIdAndUpdate(id, req.body, { runValidators: true, new: true });
    
    // Re-geocode if location or country changed
    if (req.body.location || req.body.country) {
        listing.geometry = await geocode(
            `${req.body.location || listing.location}, ${req.body.country || listing.country}`
        );
        await listing.save();
    }
    
    // If a new file was uploaded, update the image URL and filename
    if (req.file) {
        // Delete old image from Cloudinary if it exists and is not the default
        if (existingListing.image.filename && existingListing.image.filename !== 'default.jpg') {
            await cloudinary.uploader.destroy(existingListing.image.filename);
        }
        
        listing.image = {
            url: req.file.path,
            filename: req.file.filename
        };
        await listing.save();
    }
    
    req.flash('success', 'Successfully updated the listing!');
    res.redirect(`/listings/${id}`);
};

//delete - remove listing
module.exports.delete = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findByIdAndDelete(id);
    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
    }
    
    // Delete image from Cloudinary if it exists and is not the default
    if (listing.image.filename && listing.image.filename !== 'default.jpg') {
        await cloudinary.uploader.destroy(listing.image.filename);
    }
    
    req.flash('success', 'Successfully deleted the listing!');
    res.redirect('/listings');
};