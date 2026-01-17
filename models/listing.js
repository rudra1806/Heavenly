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
            default: 'https://www.pexels.com/photo/a-blank-banner-on-a-brick-wall-12883028/',
            set: (v) => v === '' ? 'https://www.pexels.com/photo/a-blank-banner-on-a-brick-wall-12883028/' : v
        }
    },
    price: { 
        type: Number, 
        required: true 
    },
    location: { 
        type: String, 
        required: true 
    }
});

const Listing = mongoose.model('Listing', listingSchema);

module.exports = Listing;