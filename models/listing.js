const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const listingSchema = new Schema({
    title: { 
        type: String,
        required: true 
    },
    description: { 
        type: String,
        required: true 
    },
    image: {
        filename : {
            type: String,
            default: ''
        },
        url: {
            type: String,
            default: 'https://images.pexels.com/photos/12883028/pexels-photo-12883028.jpeg',
            set: (v) => v === '' ? 'https://images.pexels.com/photos/12883028/pexels-photo-12883028.jpeg' : v
        }
    },
    price: { 
        type: Number, 
        required: true 
    },
    location: { 
        type: String, 
        required: true 
    },
    country: { 
        type: String, 
        required: true 
    }
});

const Listing = mongoose.model('Listing', listingSchema);

module.exports = Listing;