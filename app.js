const express = require('express');
const app = express();
const port = 8080;
const mongoose = require('mongoose');
const MONGO_URL = 'mongodb://127.0.0.1:27017/heavenly';
const Listing = require('./models/listing');

main()
.then(() => console.log('Successfully Connected to MongoDB'))
.catch(err => console.log(err));

async function main() {
  await mongoose.connect(MONGO_URL);
}

app.get('/', (req, res) => {
    res.send('Hello, server is up and running!');
});

// demo route to create a listing
app.get('/listing', async (req, res) => {
    const newListing = new Listing({
        title: 'Cozy Cottage',
        description: 'A cozy cottage in the countryside.',
        image: '',
        price: 150,
        location: 'Countryside'
    });

    try {
        const savedListing = await newListing.save();
        res.json(savedListing);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.listen(port,()=>{
    console.log(`Server is running on http://localhost:${port}`);
});
