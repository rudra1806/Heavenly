#!/usr/bin/env node

/**
 * Seed script for Heavenly Microservices
 * 
 * This script seeds data for all microservices:
 * - Auth Service: Creates admin user and sample users
 * - Listing Service: Creates sample listings
 * - Review Service: Creates sample reviews
 * - Booking Service: Creates sample bookings
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const initData = require('./data.js');
const { connectRabbitMQ, publishEvent, closeRabbitMQ } = require('../shared');

// MongoDB connection URLs
const AUTH_DB = process.env.AUTH_MONGO_URL || 'mongodb://localhost:27017/heavenly_auth';
const LISTING_DB = process.env.LISTING_MONGO_URL || 'mongodb://localhost:27017/heavenly_listings';
const REVIEW_DB = process.env.REVIEW_MONGO_URL || 'mongodb://localhost:27017/heavenly_reviews';
const BOOKING_DB = process.env.BOOKING_MONGO_URL || 'mongodb://localhost:27017/heavenly_bookings';

// Admin credentials from environment or defaults
const ADMIN_CREDENTIALS = {
    username: process.env.ADMIN_USERNAME || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@heavenly.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: 'admin'
};

// Sample user credentials
const SAMPLE_USERS = [
    {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'user'
    },
    {
        username: 'jane_smith',
        email: 'jane@example.com',
        password: 'password123',
        role: 'user'
    }
];

console.log('🌱 Starting Heavenly Microservices Seed Script...\n');

// Warn about default credentials
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  WARNING: Using default admin credentials!');
    console.warn('   Set ADMIN_USERNAME and ADMIN_PASSWORD in .env for security.\n');
}

async function seedAuthService() {
    console.log('📝 Seeding Auth Service...');
    
    const authConn = await mongoose.createConnection(AUTH_DB).asPromise();
    
    // Define User schema
    const UserSchema = new mongoose.Schema({
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
        createdAt: { type: Date, default: Date.now }
    });
    
    const User = authConn.model('User', UserSchema);
    
    // Clear existing users
    await User.deleteMany({});
    console.log('   ✓ Cleared existing users');
    
    // Create admin user
    const hashedAdminPassword = await bcrypt.hash(ADMIN_CREDENTIALS.password, 10);
    const admin = await User.create({
        username: ADMIN_CREDENTIALS.username.toLowerCase(),
        email: ADMIN_CREDENTIALS.email.toLowerCase(),
        password: hashedAdminPassword,
        role: 'admin'
    });
    console.log(`   ✓ Created admin user: ${admin.username}`);
    
    // Create sample users
    const createdUsers = [];
    for (const userData of SAMPLE_USERS) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const user = await User.create({
            ...userData,
            username: userData.username.toLowerCase(),
            email: userData.email.toLowerCase(),
            password: hashedPassword
        });
        createdUsers.push(user);
        console.log(`   ✓ Created user: ${user.username}`);
    }
    
    await authConn.close();
    return { admin, users: createdUsers };
}

async function seedListingService(ownerId) {
    console.log('\n🏠 Seeding Listing Service...');
    
    const listingConn = await mongoose.createConnection(LISTING_DB).asPromise();
    
    // Define Listing schema
    const ListingSchema = new mongoose.Schema({
        title: String,
        description: String,
        image: { url: String, filename: String },
        price: Number,
        location: String,
        country: String,
        geometry: {
            type: { type: String, default: 'Point' },
            coordinates: [Number]
        },
        ownerId: String,
        ownerUsername: String,
        isAvailable: { type: Boolean, default: true },
        maxGuests: { type: Number, default: 4 },
        createdAt: { type: Date, default: Date.now }
    });
    
    const Listing = listingConn.model('Listing', ListingSchema);
    
    // Clear existing listings
    await Listing.deleteMany({});
    console.log('   ✓ Cleared existing listings');
    
    // Sample listings from monolith
    const sampleListings = initData.data.map(listing => ({
        ...listing,
        ownerId: ownerId,
        ownerUsername: ADMIN_CREDENTIALS.username,
        isAvailable: true,
        maxGuests: 4 // Setting default maxGuests to 4
    }));
    
    const createdListings = await Listing.insertMany(sampleListings);
    console.log(`   ✓ Created ${createdListings.length} listings`);
    
    await listingConn.close();
    return createdListings;
}

async function seedReviewService() {
    console.log('\n⭐ Seeding Review Service...');
    
    const reviewConn = await mongoose.createConnection(REVIEW_DB).asPromise();
    
    // Define Review schema
    const ReviewSchema = new mongoose.Schema({
        listingId: String,
        userId: String,
        username: String,
        rating: Number,
        comment: String,
        createdAt: { type: Date, default: Date.now }
    });
    
    const Review = reviewConn.model('Review', ReviewSchema);
    
    // Clear existing reviews
    await Review.deleteMany({});
    console.log('   ✓ Cleared existing reviews');
    
    await reviewConn.close();
}

async function seedBookingService() {
    console.log('\n📅 Seeding Booking Service...');
    
    const bookingConn = await mongoose.createConnection(BOOKING_DB).asPromise();
    
    // Define Booking schema
    const BookingSchema = new mongoose.Schema({
        listingId: String,
        userId: String,
        userEmail: String,
        checkIn: Date,
        checkOut: Date,
        guests: Number,
        totalPrice: Number,
        status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
        createdAt: { type: Date, default: Date.now }
    });
    
    const Booking = bookingConn.model('Booking', BookingSchema);
    
    // Clear existing bookings
    await Booking.deleteMany({});
    console.log('   ✓ Cleared existing bookings');
    
    await bookingConn.close();
}

async function seedSearchService() {
    console.log('\n🔍 Seeding Search Service...');
    
    const searchConn = await mongoose.createConnection(process.env.SEARCH_MONGO_URL || 'mongodb://localhost:27017/heavenly_search').asPromise();
    
    // Define SearchIndex schema
    const SearchIndexSchema = new mongoose.Schema({
        listingId: String,
        title: String,
        description: String,
        location: String,
        country: String,
        price: Number,
        coordinates: [Number],
        image: {
            url: String,
            filename: String
        },
        createdAt: { type: Date, default: Date.now }
    });
    
    const SearchIndex = searchConn.model('SearchIndex', SearchIndexSchema);
    
    // Clear existing search index
    await SearchIndex.deleteMany({});
    console.log('   ✓ Cleared existing search index');
    
    await searchConn.close();
}

async function main() {
    try {
        const rabbitUser = process.env.RABBITMQ_USER || 'heavenly';
        const rabbitPass = process.env.RABBITMQ_PASS || 'heavenly123';
        const defaultRabbitUrl = `amqp://${rabbitUser}:${rabbitPass}@localhost:5672`;
        await connectRabbitMQ(process.env.RABBITMQ_URL || defaultRabbitUrl);

        // Clear all services first
        console.log('🗑️  Clearing all existing data...\n');
        await seedReviewService();
        await seedBookingService();
        await seedSearchService();
        
        // Seed auth service first to get user IDs
        const { admin, users } = await seedAuthService();
        
        // Seed listing service with admin as owner
        const listings = await seedListingService(admin._id.toString());
        
        console.log('\n📡 Publishing listing events to search index...');
        for (const listing of listings) {
            await publishEvent('listing.created', {
                listingId: listing._id.toString(),
                title: listing.title,
                description: listing.description,
                location: listing.location,
                country: listing.country,
                price: listing.price,
                coordinates: listing.geometry?.coordinates,
                image: listing.image
            });
        }
        
        await closeRabbitMQ();

        console.log('\n✅ Seed completed successfully!\n');
        console.log('═══════════════════════════════════════════');
        console.log('📋 ADMIN CREDENTIALS:');
        console.log('═══════════════════════════════════════════');
        console.log(`   Username: ${ADMIN_CREDENTIALS.username}`);
        console.log(`   Email:    ${ADMIN_CREDENTIALS.email}`);
        console.log(`   Password: ${ADMIN_CREDENTIALS.password}`);
        console.log('═══════════════════════════════════════════');
        console.log('\n📋 SAMPLE USER CREDENTIALS:');
        console.log('═══════════════════════════════════════════');
        SAMPLE_USERS.forEach(user => {
            console.log(`   Username: ${user.username}`);
            console.log(`   Email:    ${user.email}`);
            console.log(`   Password: ${user.password}`);
            console.log('   ---');
        });
        console.log('═══════════════════════════════════════════');
        console.log('\n🚀 You can now:');
        console.log('   1. Login at: http://localhost:8080/login');
        console.log('   2. Admin panel: http://localhost:8080/admin');
        console.log('   3. Browse listings: http://localhost:8080/listings\n');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Seed failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

main();
