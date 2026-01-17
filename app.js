const express = require('express');
const app = express();
const port = 8080;
const mongoose = require('mongoose');
const MONGO_URL = 'mongodb://127.0.0.1:27017/heavenly';
const Listing = require('./models/listing');
const path = require('path');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

app.listen(port,()=>{
    console.log(`Server is running on http://localhost:${port}`);
});