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

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const initData = require('./data.js');

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
        username: ADMIN_CREDENTIALS.username,
        email: ADMIN_CREDENTIALS.email,
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

async function main() {
    try {
        // Seed auth service first to get user IDs
        const { admin, users } = await seedAuthService();
        
        // Seed listing service with admin as owner
        const listings = await seedListingService(admin._id.toString());
        
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
