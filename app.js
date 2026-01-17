const express = require('express');
const app = express();
const port = 8080;
const mongoose = require('mongoose');
const MONGO_URL = 'mongodb://127.0.0.1:27017/heavenly';
const Listing = require('./models/listing');
const path = require('path');
const methodOverride = require('method-override');

app.use(methodOverride('_method'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

main()
.then(() => console.log('Successfully Connected to MongoDB'))
.catch(err => console.log(err));

async function main() {
  await mongoose.connect(MONGO_URL);
}

// Routes
app.get('/', (req, res) => {
    res.send('Hello, server is up and running!');
});

// Listings Route
app.get('/listings', async (req, res) => {
    try{
        let allListings = await Listing.find({});
        res.render('listings/index.ejs', { listings: allListings });
    }catch(err){
        res.status(500).send('Error retrieving listings');
    }
});

// New Listing Form Route
app.get('/listings/new', (req, res) => {
    res.render('listings/new.ejs');
});

app.post('/listings', async (req, res) => {
    try{
        let newListing = new Listing(req.body);
        await newListing.save();
        res.redirect('/listings');
    }catch(err){
        res.status(500).send('Error creating listing');
    }
});


// Single Listing Route
app.get('/listings/:id', async (req, res) => {
    let id = req.params.id;
    try{
        let listing = await Listing.findById(id);
        if(listing){
            res.render('listings/show.ejs', { listing: listing });
        }else{
            res.status(404).send('Listing not found');
        }
    }catch(err){
        res.status(500).send('Error retrieving listing');
    }
});

// Edit Listing Form Route
app.get('/listings/:id/edit',async (req, res) => {
    let id = req.params.id;
    try{
        let listing = await Listing.findById(id);
        if(listing){
            res.render('listings/edit.ejs', { listing: listing });
        }else{
            res.status(404).send('Listing not found');
        }
    }catch(err){
        res.status(500).send('Error retrieving listing for edit');
    }
});

// Update Listing Route
app.put('/listings/:id', async (req, res) => {
    let id = req.params.id;
    try{
        await Listing.findByIdAndUpdate(id, req.body, { runValidators: true });
        res.redirect(`/listings/${id}`);
    }catch(err){
        res.status(500).send('Error updating listing');
    }
});

app.delete('/listings/:id', async (req, res) => {
    let id = req.params.id;
    try{
        let deletedListing = await Listing.findByIdAndDelete(id);
        console.log('Deleted Listing:', deletedListing); // for debugging
        res.redirect('/listings');
    }catch(err){
        res.status(500).send('Error deleting listing');
    }
});

app.listen(port,()=>{
    console.log(`Server is running on http://localhost:${port}`);
});