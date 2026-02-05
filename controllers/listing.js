const Listing = require('../models/listing.js');

// Index - Show all listings
module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render('listings/index.ejs', { listings: allListings });
};

// new - Show create form
module.exports.newForm = (req, res) => {
    res.render('listings/new.ejs');
};

// create - Add new listing
module.exports.create = async (req, res) => {
    const newListing = new Listing(req.body);
    
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
    
    // If a new file was uploaded, update the image URL and filename
    if (req.file) {
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
    req.flash('success', 'Successfully deleted the listing!');
    res.redirect('/listings');
};