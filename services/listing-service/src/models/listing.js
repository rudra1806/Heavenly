/**
 * Listing model for the Listing Service.
 * 
 * Key differences from the monolith:
 *   - NO `reviews[]` array — reviews are owned by the Review Service
 *   - `ownerId` stored as a plain String (not ObjectId ref) — no cross-DB populate
 *   - No cascade delete middleware — handled via RabbitMQ events
 *   - GeoJSON geometry preserved for map features
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const listingSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters'],
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    image: {
        filename: {
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
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true
    },
    maxGuests: {
        type: Number,
        default: 4,
        min: [1, 'Must allow at least 1 guest'],
        max: [50, 'Cannot exceed 50 guests']
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    // Owner ID stored as string — references a user in the Auth Service's DB
    // No Mongoose populate possible (different database), use HTTP call to Auth Service instead
    ownerId: {
        type: String,
        required: [true, 'Owner ID is required']
    },
    // GeoJSON Point — stores [longitude, latitude] from geocoding
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0]
        }
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
listingSchema.index({ ownerId: 1 });
listingSchema.index({ isAvailable: 1 });
listingSchema.index({ location: 'text', title: 'text', country: 'text', description: 'text' });

module.exports = mongoose.model('Listing', listingSchema);
