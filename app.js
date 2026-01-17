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

app.get('/', (req, res) => {
    res.send('Hello, server is up and running!');
});

app.get('/listings', async (req, res) => {
    try{
        let allListings = await Listing.find({});
        res.render('listings/index.ejs', { listings: allListings });
    }catch(err){
        res.status(500).send('Error retrieving listings');
    }
});

app.listen(port,()=>{
    console.log(`Server is running on http://localhost:${port}`);
});