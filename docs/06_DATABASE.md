## Section 6 — Database Documentation

### 6.1 — Database Overview

| Property | Value | Evidence |
|---|---|---|
| Type | MongoDB / NoSQL | `docker-compose.yml` defines `mongodb` with image `mongo:7` |
| ODM | Mongoose | `mongoose` dependencies in service/script package files and model files |
| Schema files | `services/auth-service/src/models/user.js`, `services/listing-service/src/models/listing.js`, `services/review-service/src/models/review.js`, `services/booking-service/src/models/booking.js` | Model files exist |
| Migration tool | Custom Node/Mongoose scripts | `scripts/migrate.js`, `services/booking-service/scripts/migrate-platform-fee.js` |
| Seed tool | Custom Node/shell scripts | `scripts/seed-microservices.js`, `scripts/seed-data.sh`, `Makefile` `seed` target |

| Service | Database / Connection | Evidence |
|---|---|---|
| Auth Service | `MONGO_URL`, default `mongodb://localhost:27017/heavenly_auth`; Compose `mongodb://mongodb:27017/heavenly_auth` | `services/auth-service/src/index.js`, `docker-compose.yml` |
| Listing Service | `MONGO_URL`, default `mongodb://localhost:27017/heavenly_listings`; Compose `mongodb://mongodb:27017/heavenly_listings` | `services/listing-service/src/index.js`, `docker-compose.yml` |
| Review Service | `MONGO_URL`, default `mongodb://localhost:27017/heavenly_reviews`; Compose `mongodb://mongodb:27017/heavenly_reviews` | `services/review-service/src/index.js`, `docker-compose.yml` |
| Booking Service | `MONGO_URL`, default `mongodb://localhost:27017/heavenly_bookings`; Compose `mongodb://mongodb:27017/heavenly_bookings` | `services/booking-service/src/index.js`, `docker-compose.yml` |
| Search seed script only | `SEARCH_MONGO_URL`, default `mongodb://localhost:27017/heavenly_search` | `scripts/seed-microservices.js`; no Search Service Mongoose model found |


### 6.2 — Schema Reference

Table/Collection: `users`

Model file: `services/auth-service/src/models/user.js`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `username` | `String` | required, unique, trim, lowercase, min 3, max 30 | Login/display username |
| `email` | `String` | required, unique, trim, lowercase | User email |
| `password` | `String` | required, min 6; hashed in `pre('save')` | Password hash; removed from JSON output |
| `role` | `String` | enum `user` / `admin`, default `user` | Authorization role |
| `createdAt` | `Date` | timestamps enabled | Auto-managed by Mongoose |
| `updatedAt` | `Date` | timestamps enabled | Auto-managed by Mongoose |

Indexes found: `{ email: 1 }`, `{ username: 1 }`; `unique: true` is also set on `email` and `username`.

Relations: No Mongoose `ref` relation defined.

Table/Collection: `listings`

Model file: `services/listing-service/src/models/listing.js`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `title` | `String` | required, trim, min 3, max 100 | Listing title |
| `description` | `String` | required, trim, min 10, max 1000 | Listing description |
| `image.filename` | `String` | default `default.jpg`, empty string maps to default | Cloudinary/public image filename |
| `image.url` | `String` | default Pexels URL, empty string maps to default | Image URL |
| `price` | `Number` | required, min 0 | Price per night |
| `location` | `String` | required, trim | Location text |
| `country` | `String` | required, trim | Country text |
| `maxGuests` | `Number` | default 4, min 1, max 50 | Capacity |
| `isAvailable` | `Boolean` | default `true` | Availability flag |
| `ownerId` | `String` | required | User ID stored as plain string from Auth Service |
| `geometry.type` | `String` | enum `Point`, default `Point` | GeoJSON type |
| `geometry.coordinates` | `[Number]` | default `[0, 0]` | GeoJSON coordinates `[longitude, latitude]` |
| `createdAt` | `Date` | timestamps enabled | Auto-managed by Mongoose |
| `updatedAt` | `Date` | timestamps enabled | Auto-managed by Mongoose |

Indexes found: `{ ownerId: 1 }`, `{ isAvailable: 1 }`, text index on `{ location, title, country, description }`.

Relations: `ownerId` stores a user ID string; no Mongoose `ref` relation defined.

Table/Collection: `reviews`

Model file: `services/review-service/src/models/review.js`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `comment` | `String` | required, trim, min 5, max 500 | Review text |
| `rating` | `Number` | required, min 1, max 5 | Rating value |
| `listingId` | `String` | required, indexed | Listing ID stored as plain string |
| `authorId` | `String` | required, indexed | User ID stored as plain string |
| `authorUsername` | `String` | default `Unknown User` | Denormalized username |
| `createdAt` | `Date` | timestamps enabled | Auto-managed by Mongoose |
| `updatedAt` | `Date` | timestamps enabled | Auto-managed by Mongoose |

Indexes found: inline indexes on `listingId` and `authorId`; compound index `{ listingId: 1, createdAt: -1 }`.

Relations: `listingId` and `authorId` store string IDs; no Mongoose `ref` relation defined.

Table/Collection: `bookings`

Model file: `services/booking-service/src/models/booking.js`

| Field | Type | Constraints | Description |
|---|---|---|---|
| `listingId` | `String` | required, indexed | Listing ID stored as plain string |
| `userId` | `String` | required, indexed | Guest user ID stored as plain string |
| `listingTitle` | `String` | default empty string | Denormalized listing title |
| `listingImage` | `String` | default empty string | Denormalized listing image URL |
| `listingLocation` | `String` | default empty string | Denormalized listing location |
| `ownerUsername` | `String` | default empty string | Denormalized owner username |
| `guestUsername` | `String` | default empty string | Denormalized guest username |
| `guestEmail` | `String` | default empty string | Denormalized guest email |
| `checkIn` | `Date` | required | Start date |
| `checkOut` | `Date` | required | End date |
| `guests` | `Number` | required, min 1 | Guest count |
| `pricePerNight` | `Number` | required, min 0 | Price copied at booking time |
| `totalPrice` | `Number` | required, min 0 | Booking total |
| `platformFee` | `Number` | default 0, min 0 | Platform fee |
| `hostEarnings` | `Number` | default 0, min 0 | Host earnings |
| `status` | `String` | enum `pending`, `confirmed`, `cancelled`, `completed`; default `pending` | Booking status |
| `isHidden` | `Boolean` | default `false` | Soft-delete flag for user history |
| `payment.status` | `String` | enum `pending`, `completed`, `refunded`, `failed`; default `pending` | Payment status |
| `payment.method` | `String` | enum `simulated`, `razorpay`, `stripe`; default `simulated` | Payment method value allowed by schema |
| `payment.transactionId` | `String` | default `null` | Payment transaction ID |
| `payment.razorpayOrderId` | `String` | default `null` | Razorpay order ID |
| `payment.refundId` | `String` | default `null` | Refund ID |
| `payment.paidAt` | `Date` | default `null` | Payment timestamp |
| `createdAt` | `Date` | timestamps enabled | Auto-managed by Mongoose |
| `updatedAt` | `Date` | timestamps enabled | Auto-managed by Mongoose |

Indexes found: inline indexes on `listingId` and `userId`; compound indexes `{ listingId: 1, checkIn: 1, checkOut: 1 }` and `{ userId: 1, createdAt: -1 }`.

Relations: `listingId` and `userId` store string IDs; no Mongoose `ref` relation defined.


### 6.3 — ER Diagram

> **Not present:** ER Diagram
> Evidence: No Mongoose `ref` relations or relational database foreign keys found in repository.


### 6.4 — Migrations

Migration files found:

| File | Purpose | Command |
|---|---|---|
| `scripts/migrate.js` | Migrates monolith MongoDB data into auth/listing/review/booking service databases | `cd scripts && npm run migrate` |
| `scripts/migrate.js` | Dry-run mode for the same migration | `cd scripts && npm run migrate:dry` |
| `services/booking-service/scripts/migrate-platform-fee.js` | Adds/calculates `platformFee` and `hostEarnings` on existing bookings | `node services/booking-service/scripts/migrate-platform-fee.js` |

Migration configuration from `scripts/migrate.js`:

| Variable | Default |
|---|---|
| `MONOLITH_MONGO_URL` / `--source=` | `mongodb://127.0.0.1:27017/heavenly` |
| `AUTH_MONGO_URL` | `mongodb://127.0.0.1:27017/heavenly-auth` |
| `LISTING_MONGO_URL` | `mongodb://127.0.0.1:27017/heavenly-listings` |
| `REVIEW_MONGO_URL` | `mongodb://127.0.0.1:27017/heavenly-reviews` |
| `BOOKING_MONGO_URL` | `mongodb://127.0.0.1:27017/heavenly-bookings` |

Platform-fee migration configuration:

| Variable | Default |
|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/heavenly_bookings` |

Rollback: no rollback command or rollback script was found for either migration.

Current migration state: 2 migration script files found.

Seed files found:

| File / Target | Purpose |
|---|---|
| `scripts/seed-microservices.js` | Seeds microservice databases and publishes events through `shared` |
| `scripts/seed-data.sh` | Runs `node seed-microservices.js` from the `scripts/` directory |
| `Makefile` `seed` target | Runs `cd scripts && node seed-microservices.js` |

Seed command:

```bash
make seed
```


### 6.5 — Query Patterns and Performance Notes

Only evidence-backed query patterns are listed here.

| Pattern | Evidence | Note |
|---|---|---|
| User lookup indexes | `services/auth-service/src/models/user.js` indexes `{ email: 1 }` and `{ username: 1 }` | Supports login/search lookups by email or username |
| Listing owner/availability indexes | `services/listing-service/src/models/listing.js` indexes `{ ownerId: 1 }` and `{ isAvailable: 1 }` | Supports owner dashboard and availability filtering |
| Listing text index | `services/listing-service/src/models/listing.js` text index on `location`, `title`, `country`, `description` | Supports text-search-style queries if used directly against MongoDB |
| Review listing/date index | `services/review-service/src/models/review.js` index `{ listingId: 1, createdAt: -1 }` | Supports listing review queries sorted newest first |
| Booking overlap index | `services/booking-service/src/models/booking.js` index `{ listingId: 1, checkIn: 1, checkOut: 1 }` | Supports overlap detection in booking creation |
| Booking user/date index | `services/booking-service/src/models/booking.js` index `{ userId: 1, createdAt: -1 }` | Supports user booking history sorted newest first |
| Cross-service denormalization | `services/booking-service/src/models/booking.js` stores `listingTitle`, `listingImage`, `listingLocation`, `guestUsername`, `guestEmail`; `services/review-service/src/models/review.js` stores `authorUsername` | Avoids some cross-service reads during display |
| No cross-database populate | Model comments in listing/review/booking schemas state IDs are stored as strings and no cross-DB populate is used | Cross-service lookups happen via HTTP or denormalized fields |

No MongoDB aggregation pipelines, query planner hints, or explicit database-level caching were found in model files.

