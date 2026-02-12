if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const User = require("../models/user.js");
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/heavenly';

// Superuser credentials from environment variables
// Best Practice: Use environment variables for sensitive admin credentials
// to avoid hardcoding secrets in the codebase.
// SECURITY: Require admin credentials in production to prevent weak defaults
if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_USERNAME || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
    console.error('ERROR: ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in production!');
    process.exit(1);
}

const SUPERUSER = {
    username: process.env.ADMIN_USERNAME || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@heavenly.com',
    password: process.env.ADMIN_PASSWORD || 'admin123'
};

// Warn if using default credentials in non-production environments
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.warn('WARNING: Using default admin credentials. Set ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD in .env for security.');
}

main()
    .then(() => console.log('Successfully Connected to MongoDB'))
    .catch(err => console.log(err));

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    // Clear existing data
    await Listing.deleteMany({});
    await Review.deleteMany({});
    await User.deleteMany({});

    // Create superuser with admin role
    const superuser = new User({
        username: SUPERUSER.username,
        email: SUPERUSER.email,
        role: 'admin'
    });
    const registeredUser = await User.register(superuser, SUPERUSER.password);
    console.log(`Superuser '${SUPERUSER.username}' created successfully!`);

    // Add owner to all listings
    const listingsWithOwner = initData.data.map((listing) => ({
        ...listing,
        owner: registeredUser._id
    }));

    await Listing.insertMany(listingsWithOwner);
    console.log("Data was initialized successfully!");
    console.log(`All listings owned by superuser: ${SUPERUSER.username}`);
};

initDB()
    .then(async () => {
        // Close the database connection after initialization is complete to prevent hanging process and allow graceful exit
        console.log("Closing database connection...");
        await mongoose.connection.close();
        process.exit(0);
    })
    .catch(async (err) => {
        // Log the error and close the database connection to prevent hanging process and allow graceful exit
        console.error("Error during initialization:", err);
        await mongoose.connection.close();
        process.exit(1);
    });