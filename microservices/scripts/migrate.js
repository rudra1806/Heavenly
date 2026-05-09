#!/usr/bin/env node

/**
 * Data Migration Script — Monolith DB → Microservice Databases
 * 
 * Reads from the monolith's single MongoDB database and writes to
 * per-service databases, transforming documents to match microservice schemas.
 * 
 * SOURCE:  mongodb://localhost:27017/heavenly (monolith)
 * TARGETS:
 *   - mongodb://localhost:27017/heavenly-auth     (users)
 *   - mongodb://localhost:27017/heavenly-listings  (listings)
 *   - mongodb://localhost:27017/heavenly-reviews   (reviews)
 *   - mongodb://localhost:27017/heavenly-bookings  (bookings)
 * 
 * Usage:
 *   node scripts/migrate.js
 *   node scripts/migrate.js --dry-run     # Preview without writing
 *   node scripts/migrate.js --source mongodb://host/db
 * 
 * IMPORTANT: Run this AFTER docker-compose up (MongoDB must be running).
 * This script is IDEMPOTENT — re-running will skip existing documents.
 */

const mongoose = require('mongoose');

// ===== Configuration =====
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SOURCE_URL = args.find(a => a.startsWith('--source='))?.split('=')[1]
    || process.env.MONOLITH_MONGO_URL
    || 'mongodb://127.0.0.1:27017/heavenly';

const TARGET_URLS = {
    auth: process.env.AUTH_MONGO_URL || 'mongodb://127.0.0.1:27017/heavenly-auth',
    listings: process.env.LISTING_MONGO_URL || 'mongodb://127.0.0.1:27017/heavenly-listings',
    reviews: process.env.REVIEW_MONGO_URL || 'mongodb://127.0.0.1:27017/heavenly-reviews',
    bookings: process.env.BOOKING_MONGO_URL || 'mongodb://127.0.0.1:27017/heavenly-bookings'
};

// ===== Helpers =====
function log(icon, msg) { console.log(`  ${icon} ${msg}`); }
function header(msg) { console.log(`\n${'='.repeat(60)}\n  ${msg}\n${'='.repeat(60)}`); }

// ===== Migration Functions =====

/**
 * Migrate Users: monolith → auth-service database.
 * 
 * Transformations:
 *   - passport-local-mongoose fields (salt, hash) → password (bcrypt)
 *   - Since passport stores hash/salt differently, we set a temp password
 *     and require users to reset. Or if bcrypt hash exists, copy directly.
 */
async function migrateUsers(sourceDb, targetDb) {
    header('Migrating Users');

    const sourceUsers = sourceDb.collection('users');
    const targetUsers = targetDb.collection('users');

    const users = await sourceUsers.find({}).toArray();
    log('📊', `Found ${users.length} users in monolith`);

    let migrated = 0, skipped = 0;

    for (const user of users) {
        // Check if already migrated
        const exists = await targetUsers.findOne({ _id: user._id });
        if (exists) {
            skipped++;
            continue;
        }

        const migratedUser = {
            _id: user._id,
            username: (user.username || '').toLowerCase(),
            email: (user.email || '').toLowerCase(),
            // passport-local-mongoose stores hash+salt separately
            // We copy the hash field. Users may need to reset password.
            password: user.hash || user.password || '$2b$12$placeholder_requires_reset',
            role: user.role || 'user',
            createdAt: user._id.getTimestamp(),
            updatedAt: new Date()
        };

        if (!DRY_RUN) {
            await targetUsers.insertOne(migratedUser);
        }
        migrated++;
    }

    log('✅', `Migrated: ${migrated}, Skipped (existing): ${skipped}`);
    return { migrated, skipped, total: users.length };
}

/**
 * Migrate Listings: monolith → listing-service database.
 * 
 * Transformations:
 *   - owner (ObjectId ref) → ownerId (string)
 *   - reviews[] array REMOVED (owned by Review Service)
 *   - geometry preserved as-is (GeoJSON Point)
 */
async function migrateListings(sourceDb, targetDb, userLookup) {
    header('Migrating Listings');

    const sourceListings = sourceDb.collection('listings');
    const targetListings = targetDb.collection('listings');

    const listings = await sourceListings.find({}).toArray();
    log('📊', `Found ${listings.length} listings in monolith`);

    let migrated = 0, skipped = 0;

    for (const listing of listings) {
        const exists = await targetListings.findOne({ _id: listing._id });
        if (exists) {
            skipped++;
            continue;
        }

        const ownerId = listing.owner ? listing.owner.toString() : null;

        const migratedListing = {
            _id: listing._id,
            title: listing.title,
            description: listing.description,
            image: listing.image || { filename: 'default.jpg', url: 'https://images.pexels.com/photos/12883028/pexels-photo-12883028.jpeg' },
            price: listing.price,
            location: listing.location,
            country: listing.country,
            ownerId,
            ownerUsername: userLookup[ownerId] || 'unknown',
            // Preserve GeoJSON geometry
            geometry: listing.geometry || { type: 'Point', coordinates: [0, 0] },
            maxGuests: listing.maxGuests || 1,
            isAvailable: listing.isAvailable !== false,
            createdAt: listing.createdAt || listing._id.getTimestamp(),
            updatedAt: listing.updatedAt || new Date()
            // NOTE: reviews[] array intentionally omitted — owned by Review Service
        };

        if (!DRY_RUN) {
            await targetListings.insertOne(migratedListing);
        }
        migrated++;
    }

    log('✅', `Migrated: ${migrated}, Skipped (existing): ${skipped}`);
    return { migrated, skipped, total: listings.length };
}

/**
 * Migrate Reviews: monolith → review-service database.
 * 
 * Transformations:
 *   - author (ObjectId ref) → authorId (string) + authorUsername (denormalized)
 *   - Need to find the listingId by checking which listing contained this review
 */
async function migrateReviews(sourceDb, targetDb, userLookup, reviewToListingMap) {
    header('Migrating Reviews');

    const sourceReviews = sourceDb.collection('reviews');
    const targetReviews = targetDb.collection('reviews');

    const reviews = await sourceReviews.find({}).toArray();
    log('📊', `Found ${reviews.length} reviews in monolith`);

    let migrated = 0, skipped = 0, orphaned = 0;

    for (const review of reviews) {
        const exists = await targetReviews.findOne({ _id: review._id });
        if (exists) {
            skipped++;
            continue;
        }

        const authorId = review.author ? review.author.toString() : null;
        const listingId = reviewToListingMap[review._id.toString()];

        if (!listingId) {
            log('⚠️', `Orphaned review ${review._id} — no listing found, skipping`);
            orphaned++;
            continue;
        }

        const migratedReview = {
            _id: review._id,
            comment: review.comment,
            rating: review.rating,
            listingId,
            authorId,
            authorUsername: userLookup[authorId] || 'deleted-user',
            createdAt: review.createdAt || review._id.getTimestamp(),
            updatedAt: new Date()
        };

        if (!DRY_RUN) {
            await targetReviews.insertOne(migratedReview);
        }
        migrated++;
    }

    log('✅', `Migrated: ${migrated}, Skipped: ${skipped}, Orphaned: ${orphaned}`);
    return { migrated, skipped, orphaned, total: reviews.length };
}

/**
 * Migrate Bookings: monolith → booking-service database.
 * 
 * Transformations:
 *   - listing (ObjectId ref) → listingId (string) + denormalized fields
 *   - user (ObjectId ref) → userId (string) + guestUsername
 *   - bookingStatus/paymentStatus → status + payment subdocument
 */
async function migrateBookings(sourceDb, targetDb, userLookup, listingLookup) {
    header('Migrating Bookings');

    const sourceBookings = sourceDb.collection('bookings');
    const targetBookings = targetDb.collection('bookings');

    const bookings = await sourceBookings.find({}).toArray();
    log('📊', `Found ${bookings.length} bookings in monolith`);

    let migrated = 0, skipped = 0;

    for (const booking of bookings) {
        const exists = await targetBookings.findOne({ _id: booking._id });
        if (exists) {
            skipped++;
            continue;
        }

        const listingId = booking.listing ? booking.listing.toString() : null;
        const userId = booking.user ? booking.user.toString() : null;
        const listingInfo = listingLookup[listingId] || {};

        const migratedBooking = {
            _id: booking._id,
            listingId,
            userId,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            guests: booking.guests || 1,
            pricePerNight: booking.pricePerNight || (booking.totalPrice / Math.max(1, Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / 86400000))),
            totalPrice: booking.totalPrice,
            status: booking.bookingStatus || booking.status || 'confirmed',
            // Denormalized fields
            listingTitle: listingInfo.title || 'Deleted Listing',
            listingImage: listingInfo.image || { filename: 'default.jpg', url: '' },
            listingLocation: listingInfo.location || 'Unknown',
            guestUsername: userLookup[userId] || 'deleted-user',
            // Payment subdocument
            payment: {
                status: booking.paymentStatus || 'pending',
                method: 'simulated',
                transactionId: booking.transactionId || null,
                paidAt: booking.paymentStatus === 'completed' ? (booking.updatedAt || new Date()) : null
            },
            createdAt: booking.createdAt || booking._id.getTimestamp(),
            updatedAt: booking.updatedAt || new Date()
        };

        if (!DRY_RUN) {
            await targetBookings.insertOne(migratedBooking);
        }
        migrated++;
    }

    log('✅', `Migrated: ${migrated}, Skipped (existing): ${skipped}`);
    return { migrated, skipped, total: bookings.length };
}

// ===== Main =====
async function main() {
    console.log('\n🚀 Heavenly Data Migration — Monolith → Microservices\n');
    console.log(`   Source:  ${SOURCE_URL}`);
    console.log(`   Mode:   ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '✏️  LIVE (writing to targets)'}`);
    console.log(`   Targets:`);
    Object.entries(TARGET_URLS).forEach(([k, v]) => console.log(`     ${k}: ${v}`));

    // Connect to source
    const sourceConn = await mongoose.createConnection(SOURCE_URL).asPromise();
    const sourceDb = sourceConn.db;
    log('🔗', 'Connected to source (monolith)');

    // Connect to targets
    const targetConns = {};
    for (const [name, url] of Object.entries(TARGET_URLS)) {
        targetConns[name] = await mongoose.createConnection(url).asPromise();
    }
    log('🔗', 'Connected to all target databases');

    // Build lookup maps
    log('🔨', 'Building lookup maps...');

    // User lookup: ObjectId → username
    const users = await sourceDb.collection('users').find({}, { projection: { username: 1 } }).toArray();
    const userLookup = {};
    users.forEach(u => { userLookup[u._id.toString()] = (u.username || '').toLowerCase(); });
    log('📋', `User lookup: ${Object.keys(userLookup).length} entries`);

    // Listing lookup: ObjectId → { title, image, location }
    const listings = await sourceDb.collection('listings').find({}, {
        projection: { title: 1, image: 1, location: 1, reviews: 1 }
    }).toArray();
    const listingLookup = {};
    const reviewToListingMap = {};
    listings.forEach(l => {
        listingLookup[l._id.toString()] = { title: l.title, image: l.image, location: l.location };
        // Map each review ObjectId → listing ObjectId
        (l.reviews || []).forEach(rid => {
            reviewToListingMap[rid.toString()] = l._id.toString();
        });
    });
    log('📋', `Listing lookup: ${Object.keys(listingLookup).length} entries`);
    log('📋', `Review→Listing map: ${Object.keys(reviewToListingMap).length} entries`);

    // Run migrations
    const results = {};
    results.users = await migrateUsers(sourceDb, targetConns.auth.db);
    results.listings = await migrateListings(sourceDb, targetConns.listings.db, userLookup);
    results.reviews = await migrateReviews(sourceDb, targetConns.reviews.db, userLookup, reviewToListingMap);
    results.bookings = await migrateBookings(sourceDb, targetConns.bookings.db, userLookup, listingLookup);

    // Summary
    header('Migration Summary');
    console.log('');
    console.log('  Collection  │ Source │ Migrated │ Skipped │ Notes');
    console.log('  ────────────┼────────┼──────────┼─────────┼──────────');
    Object.entries(results).forEach(([name, r]) => {
        const notes = r.orphaned ? `${r.orphaned} orphaned` : '';
        console.log(`  ${name.padEnd(12)}│ ${String(r.total).padStart(6)} │ ${String(r.migrated).padStart(8)} │ ${String(r.skipped).padStart(7)} │ ${notes}`);
    });
    console.log('');

    if (DRY_RUN) {
        log('🔍', 'DRY RUN complete — no data was written.');
        log('💡', 'Run without --dry-run to perform the actual migration.');
    } else {
        log('✅', 'Migration complete!');
    }

    // Cleanup
    await sourceConn.close();
    for (const conn of Object.values(targetConns)) {
        await conn.close();
    }
    log('🔗', 'All connections closed.');
}

main().catch(err => {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
});
