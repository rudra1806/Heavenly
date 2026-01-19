const mongoose = require('mongoose');
const Review = require('./review');
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
            default: 'default.jpg',
            set: (v) => v === '' ? 'default.jpg' : v
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
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ]
});

// Middleware to delete associated reviews when a listing is deleted
listingSchema.post('findOneAndDelete', async (listing) => {
    if (listing) {
        await Review.deleteMany({
            _id: {
                $in: listing.reviews
            }
        });
    }
});

const Listing = mongoose.model('Listing', listingSchema);

module.exports = Listing;