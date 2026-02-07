const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const User = require("../models/user.js");
const MONGO_URL = 'mongodb://127.0.0.1:27017/heavenly';

// Superuser credentials
const SUPERUSER = {
    username: 'admin',
    email: 'admin@heavenly.com',
    password: 'admin123'
};

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
    
    // Create superuser
    const superuser = new User({
        username: SUPERUSER.username,
        email: SUPERUSER.email
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
    .then(() => {
        // Close the database connection after initialization is complete to prevent hanging process and allow graceful exit
        console.log("Closing database connection...");
        mongoose.connection.close();
        process.exit(0);
    })
    .catch((err) => {
        // Log the error and close the database connection to prevent hanging process and allow graceful exit
        console.error("Error during initialization:", err);
        mongoose.connection.close();
        process.exit(1);
    });