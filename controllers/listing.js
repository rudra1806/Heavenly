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
    const listing = await Listing.findByIdAndUpdate(id, req.body, { runValidators: true, new: true });
    if (!listing) {
        req.flash('error', 'Listing not found!');
        return res.redirect('/listings');
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