<div align="center">

# 🏝️ Heavenly

**A Full-Stack Luxury Property Rental Platform**

*Discover and list luxury vacation rentals with interactive maps, real-time reviews, and seamless authentication*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-9.1-880000?style=for-the-badge&logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![EJS](https://img.shields.io/badge/EJS-4.0-B4CA65?style=for-the-badge&logo=ejs&logoColor=black)](https://ejs.co/)
[![Passport](https://img.shields.io/badge/Passport.js-0.7-34E27A?style=for-the-badge&logo=passport&logoColor=white)](http://www.passportjs.org/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Images-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![MapLibre](https://img.shields.io/badge/MapLibre-Maps-396CB2?style=for-the-badge&logo=maplibre&logoColor=white)](https://maplibre.org/)

[Features](#-features) • [Tech Stack](#%EF%B8%8F-tech-stack) • [Quick Start](#-quick-start) • [Architecture](#%EF%B8%8F-architecture) • [API Reference](#-api-reference) • [Seed Data](#-seed-data)

</div>

---

## 📋 Overview

Heavenly is a production-ready, full-stack web application for luxury property rentals built with the **MVC architecture pattern**. Users can browse listings, search across multiple fields, create accounts, post properties with cloud-hosted images, leave star-rated reviews, **book properties with integrated payment processing**, and explore locations on interactive clustered maps—all with automatic geocoding requiring zero API keys.

The app ships with **30 pre-seeded luxury listings** spanning **15+ countries**, a powerful **Admin Dashboard** for platform management, **complete booking system with payment simulation**, production-grade MongoDB-backed sessions, and a polished paradise-inspired UI.

### ✨ Key Highlights

- **Complete Booking System** with date validation, overlap detection, and payment processing
- **Payment Integration** — Simulated payment flow (Razorpay-ready for production)
- **Complete CRUD Operations** for property listings with owner authorization
- **Admin Dashboard** for centralized user, listing, review, and booking management
- **Role-Based Access Control** (RBAC) with specific Admin privileges
- **Regex-Powered Search** across title, description, location, and country
- **Interactive Cluster Maps** using MapLibre GL JS with color-coded marker groups
- **Automatic Geocoding** via Nominatim (OpenStreetMap) — no API keys required
- **Full Image Lifecycle** with Cloudinary (upload, replace with old-image cleanup, delete)
- **Production-Ready Sessions** stored in MongoDB via connect-mongo with lazy touch
- **Pending Review Replay** — guest reviews are saved in session and auto-submitted after login
- **Smart Redirect Preservation** — users return to their previous page after authentication
- **Static Legal Pages** — Privacy Policy, Terms of Service, and Contact form

---

## 🚀 Features

<table>
<tr>
<td width="50%">

### 🏠 Property Management
- Full CRUD with owner-only edit/delete
- Cloud image upload via Cloudinary (`Heavenly_DEV` folder)
- Auto-cleanup of old images on update/delete
- Sanitized filenames with uniqueness suffix to prevent Cloudinary collisions
- Default fallback images via Mongoose setters
- Supports JPG, JPEG, PNG, AVIF formats (`accept="image/*"` on inputs)
- **Max Guest Limits** — Configurable per property (default: 4 guests)

</td>
<td width="50%">

### 📅 Booking System
- **3-Step Booking Flow** — Details → Payment → Confirmation with visual progress stepper
- **Date Validation** — Prevents past dates and validates check-out after check-in
- **Overlap Detection** — Prevents double-booking with real-time availability checks
- **Guest Validation** — Enforces property-specific maximum guest limits
- **Live Price Calculator** — Real-time calculation with nights, subtotal, and service fee (10%)
- **Payment Processing** — Simulated payment with status tracking (Razorpay-ready)
- **Booking Management** — View, track, cancel, and manage all reservations
- **Soft Delete** — Users hide cancelled bookings; admins permanently delete
- **Payment States** — Pending, completed, failed, refunded with visual indicators
- **Booking Status** — Confirmed, cancelled, completed with color-coded badges

</td>
</tr>
<tr>
<td width="50%">

### 🛡️ Admin Dashboard
- **Centralized Control** — Manage Users, Listings, Reviews, and Bookings from one interface
- **Global Permissions** — "God Mode" allows admins to edit/delete ANY listing or review
- **User Management** — View all users, search by email/username, and delete accounts
- **Cascading Deletes** — Deleting a user auto-removes their listings, images, reviews, and bookings
- **Booking Management** — Search, filter, cancel, and delete bookings
- **Revenue Tracking** — Real-time revenue from completed payments
- **Guest Statistics** — Total guests served across all bookings
- **Platform Stats** — Real-time counters for users, listings, reviews, and bookings

</td>
<td width="50%">

### 🗺️ Maps & Geolocation
- MapLibre GL JS with free OSM raster tiles
- Auto-geocoding on listing creation & update
- Re-geocodes when location/country changes
- **Robust geocoding** — handles HTTP errors, timeouts, and rate-limits with safe fallback coordinates
- Individual property maps with red markers & popups
- Index page cluster map with color-coded groups
- GeoJSON Point coordinate storage
- Graceful fallback for unmapped/missing geometry

</td>
</tr>
<tr>
<td width="50%">

### 🔍 Search
- Regex-based search across multiple fields
- Searches title, description, location, and country
- Real-time result counts
- Clear search button
- Case-insensitive matching
- Special characters safely escaped

</td>
<td width="50%">

### ⭐ Reviews System
- 1–5 star ratings with CSS-only interactive picker
- Author tracking with automatic timestamps
- Author-only delete permissions
- Pending review auto-submission for guests
- Client + server-side Joi validation (5–500 char comments)

</td>
</tr>
<tr>
<td width="50%">

### 👤 Authentication & Authorization
- User registration with email validation
- Session-based auth with Passport.js local strategy
- Password hashing via passport-local-mongoose
- MongoDB-backed sessions (connect-mongo) with 7-day cookies
- Lazy session touch every 24 hours
- Smart redirects via `Referer` header capture
- **Role-Based Access** — `user` vs `admin` roles stored in DB
- Five middleware layers: `isLoggedIn`, `isOwner`, `isAuthor`, `isAdmin`, `validateBooking`

</td>
<td width="50%">

### 🛡️ Security & Validation
- Joi schema validation (listing: title 3–100 chars, description 10–1000, positive price; review: rating 1–5, comment 5–500)
- **XSS-safe map popups** — DOM APIs (`setDOMContent` + `textContent`) instead of `setHTML`
- **Orphaned upload cleanup** — failed validations auto-delete uploaded images from Cloudinary
- Authorization middleware at every protected route
- HTTP-only session cookies with encrypted secrets
- Environment variable protection via dotenv (`.env.example` provided, `.env` gitignored)
- Sanitized Cloudinary `public_id` with timestamp suffix to prevent filename collisions
- File type & format restrictions on uploads (`accept="image/*"`, allowed formats enforced)
- Cascading review deletion via Mongoose `post('findOneAndDelete')` hook

</td>
</tr>
<tr>
<td width="50%">

### 🎨 Luxury UI/UX
- Paradise-inspired warm color palette (`#FFFBF4`, gold `#C2A86D`)
- Glassmorphism sticky navbar with backdrop blur
- Full-viewport hero sections with slow-zoom animation
- Split-screen auth pages with feature icons
- **3-Step Progress Stepper** — Visual booking flow with animations
- **Payment UI States** — Default, processing (spinner), success (confetti animation)
- **Status Badges** — Color-coded booking and payment status indicators
- **Empty States** — Friendly messages with CTAs for no bookings/results
- Responsive Bootstrap 5 grid (`col-sm-6 col-md-4 col-lg-3`)
- Google Fonts (Playfair Display, Inter, Poppins)
- Font Awesome 7 icons
- 4,000+ lines of modular custom CSS (13 files)
- CSS custom properties for consistent theming

</td>
<td width="50%">

### 📄 Static Pages
- **Privacy Policy** — comprehensive 8-section policy
- **Terms of Service** — detailed 12-section terms
- **Contact Page** — form with subject dropdown, loading state, and info cards (email, phone, location)
- **Custom Error Page** — styled error display with status code and navigation
- **Landing Page** — hero section, trust cards, featured destinations grid, experience section, testimonial, and CTA

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js 18+ |
| **Backend** | Express.js 5.2, Mongoose 9.1 |
| **Database** | MongoDB (local or Atlas) |
| **Sessions** | express-session, connect-mongo 6, connect-flash |
| **Authentication** | Passport.js 0.7, passport-local, passport-local-mongoose 9 |
| **Validation** | Joi 18 |
| **File Upload** | Multer 2, multer-storage-cloudinary 4, Cloudinary |
| **Geocoding** | Nominatim API (OpenStreetMap) — free, no keys |
| **Maps** | MapLibre GL JS with OSM raster tiles |
| **Templating** | EJS 4, EJS-Mate 4 |
| **Frontend** | Bootstrap 5, Font Awesome 7, Google Fonts, Admin Dashboard, Booking UI |
| **Payment** | Simulated payment system (Razorpay-ready integration) |
| **Dev Tools** | nodemon 3, dotenv 17, method-override 3 |

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or [Atlas](https://www.mongodb.com/atlas))
- [Cloudinary account](https://cloudinary.com/) (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/rudra1806/Heavenly.git
cd Heavenly

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials (see below)

# Seed database with sample data (optional but recommended)
npm run seed

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required — Cloudinary credentials
CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

PORT=8080

# Optional (defaults provided)
MONGO_URL=mongodb://127.0.0.1:27017/heavenly
SESSION_SECRET=your_secure_secret_key
PORT=8080
```

The app runs at `http://localhost:8080`

---

## 🌱 Seed Data

Run `npm run seed` to populate the database with:

- **Admin account** — Superuser created securely via `.env` credentials (`ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- **30 luxury listings** spanning 15+ countries including USA, Italy, Switzerland, Tanzania, Netherlands, Fiji, UK, UAE, Indonesia, Canada, Thailand, Mexico, Japan, Greece, Costa Rica, and the Maldives
- Pre-computed GeoJSON coordinates for every listing
- Existing listings, reviews, bookings, and users are cleared before seeding

---

## 🏗️ Architecture

```
Heavenly/
├── app.js                 # Entry point — middleware, sessions, Passport, routes, error handling
├── cloudConfig.js         # Cloudinary storage + Multer upload config
├── schemas.js             # Joi validation schemas (listing & review)
│
├── controllers/           # Business logic (MVC controllers)
│   ├── listing.js         # Listing CRUD + search + geocoding + image lifecycle
│   ├── review.js          # Review create/delete with author association
│   ├── user.js            # Signup/login/logout + pending review replay + smart redirects
│   ├── booking.js         # Booking CRUD + payment processing + overlap detection
│   └── admin.js           # Dashboard stats + User/Listing/Review/Booking management
│
├── models/                # Mongoose schemas & models
│   ├── listing.js         # Listing (GeoJSON geometry, image defaults, maxGuests, review cascade delete)
│   ├── review.js          # Review (rating, comment, createdAt, author ref)
│   ├── booking.js         # Booking (dates, guests, price, payment/booking status, soft delete)
│   └── user.js            # User (passport-local-mongoose plugin, email, role: 'user'|'admin')
│
├── routes/                # Express routers
│   ├── listings.js        # /listings — CRUD + search + image upload middleware
│   ├── reviews.js         # /listings/:id/reviews — create/delete
│   ├── users.js           # /signup, /login, /logout + redirect middleware
│   ├── bookings.js        # /bookings — CRUD + payment processing
│   ├── admin.js           # /admin — Dashboard & Management routes (including bookings)
│   └── pages.js           # /privacy, /terms, /contact
│
├── utils/                 # Middleware & helper utilities
│   ├── ExpressError.js    # Custom error class (statusCode + message)
│   ├── wrapAsync.js       # Async route handler error wrapper
│   ├── isLoggedIn.js      # Auth check + pending review session storage
│   ├── isOwner.js         # Listing ownership verification (Admin bypass)
│   ├── isAuthor.js        # Review authorship verification (Admin bypass)
│   ├── isAdmin.js         # Admin role verification middleware
│   ├── validateListing.js # Joi listing validation middleware + orphaned upload cleanup
│   ├── validateReview.js  # Joi review validation middleware
│   ├── validateBooking.js # Joi booking validation middleware (dates, guests)
│   └── geocode.js         # Nominatim geocoding with error handling (location → GeoJSON Point)
│
├── views/                 # EJS templates
│   ├── home.ejs           # Landing page (hero, trust cards, destinations, testimonial)
│   ├── error.ejs          # Custom error page
│   ├── layouts/
│   │   └── boilerplate.ejs  # Master layout (fonts, Bootstrap, FA, MapLibre, CSS)
│   ├── listings/
│   │   ├── index.ejs      # All listings (hero stats, search, cluster map, card grid)
│   │   ├── show.ejs       # Single listing (image, details, map, reviews)
│   │   ├── new.ejs        # Create form (image upload + custom filename)
│   │   └── edit.ejs       # Edit form (current image preview + optional replace)
│   ├── users/
│   │   ├── login.ejs      # Split-screen login
│   │   └── signup.ejs     # Split-screen signup (with email)
│   ├── pages/
│   │   ├── privacy.ejs    # Privacy policy (8 sections)
│   │   ├── terms.ejs      # Terms of service (12 sections)
│   │   └── contact.ejs    # Contact form + info cards
│   └── includes/
│       ├── navbar.ejs     # Glassmorphism sticky navbar
│       ├── footer.ejs     # Social links, copyright, legal nav
│       └── flash.ejs      # Auto-dismissible toast alerts
│   ├── bookings/          # Booking Views
│   │   ├── new.ejs        # Booking form (dates, guests, live price calculator)
│   │   ├── payment.ejs    # Payment page (3 states: default, processing, success)
│   │   ├── show.ejs       # Booking confirmation & details
│   │   └── index.ejs      # User's booking list with actions
│   ├── admin/             # Admin Panel Views
│       ├── dashboard.ejs  # Stats & Recent Activity (including booking metrics)
│       ├── users.ejs      # User Management Table
│       ├── listings.ejs   # Listing Management Table
│       ├── reviews.ejs    # Review Management Table
│       └── bookings.ejs   # Booking Management Table (search, filter, actions)
│
├── public/                # Static client-side assets
│   ├── css/               # 13 modular stylesheets (4,000+ lines)
│   │   ├── base.css       # Root variables, global styles
│   │   ├── navbar.css     # Glassmorphism navbar
│   │   ├── footer.css     # Footer styles
│   │   ├── home.css       # Landing page
│   │   ├── listing.css    # Listings index & cards
│   │   ├── show.css       # Single listing page
│   │   ├── form.css       # Create/edit forms
│   │   ├── auth.css       # Split-screen auth pages
│   │   ├── map.css        # Map containers
│   │   ├── pages.css      # Static pages
│   │   ├── booking.css    # Booking forms, payment UI, progress stepper
│   │   ├── admin.css      # Admin dashboard & management tables
│   │   └── flash.css      # Flash message toasts (if present)
│   └── js/
│       ├── clusterMap.js  # Index cluster map (GeoJSON, color-coded markers)
│       ├── showMap.js     # Individual listing map (marker + popup)
│       └── formvalidation.js  # Bootstrap client-side form validation
│
└── init/                  # Database seeding
    ├── data.js            # 30 sample listings (15+ countries, pre-computed coords)
    └── index.js           # Seeder script (creates admin + listings, clears existing data)
```

---

## 📡 API Reference

### Listings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/listings` | List all properties (supports `?search=` query) | Public |
| `GET` | `/listings/new` | Create form | Login required |
| `POST` | `/listings` | Create listing (multipart, image upload) | Login required |
| `GET` | `/listings/:id` | View listing details, map, reviews, and booking widget | Public |
| `GET` | `/listings/:id/edit` | Edit form (with current image preview) | Owner only |
| `PUT` | `/listings/:id` | Update listing (re-geocodes if location changed) | Owner only |
| `DELETE` | `/listings/:id` | Delete listing + Cloudinary image cleanup | Owner only |
| `GET` | `/listings/:id/book` | Booking form with live price calculator | Login required |
| `POST` | `/listings/:id/book` | Create booking (validates dates, guests, overlap) | Login required |

### Bookings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/bookings` | List user's bookings (sorted by date) | Login required |
| `GET` | `/bookings/:id` | View booking details and confirmation | Login required |
| `GET` | `/bookings/:id/payment` | Payment page (3-state UI) | Login required |
| `POST` | `/bookings/:id/payment` | Process payment (simulated, Razorpay-ready) | Login required |
| `POST` | `/bookings/:id/cancel` | Cancel booking (refund if paid) | Login required |
| `DELETE` | `/bookings/:id` | Soft delete (user) or hard delete (admin) | Login required |

### Reviews

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/listings/:id/reviews` | Add review (1–5 stars, 5–500 char comment) | Login required |
| `DELETE` | `/listings/:id/reviews/:reviewId` | Delete review | Author only |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/signup` | Registration form (split-screen) |
| `POST` | `/signup` | Register user (username, email, password) |
| `GET` | `/login` | Login form (split-screen) |
| `POST` | `/login` | Authenticate via Passport local strategy |
| `GET` | `/logout` | End session and redirect |

### Static Pages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/privacy` | Privacy policy (8 sections) |
| `GET` | `/terms` | Terms of service (12 sections) |
| `GET` | `/contact` | Contact page with form |
| `POST` | `/contact` | Contact form submission |

### Admin Dashboard (Protected)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/admin` | Dashboard Stats & Recent Activity (users, listings, reviews, bookings, revenue) | Admin |
| `GET` | `/admin/users` | Manage Users (List/Search) | Admin |
| `DELETE` | `/admin/users/:userId` | Delete User + Cascade Data (listings, reviews, bookings) | Admin |
| `GET` | `/admin/listings` | Manage Listings (List/Search) | Admin |
| `GET` | `/admin/reviews` | Manage Reviews (List/Search) | Admin |
| `DELETE` | `/admin/reviews/:reviewId` | Delete Review | Admin |
| `GET` | `/admin/bookings` | Manage Bookings (List/Search/Filter by status) | Admin |
| `POST` | `/admin/bookings/:id/cancel` | Cancel Booking (refund if paid) | Admin |
| `DELETE` | `/admin/bookings/:id` | Permanently Delete Booking | Admin |

---

## 📦 Scripts

```bash
npm start      # Production server (node app.js)
npm run dev    # Development with auto-reload (nodemon app.js)
npm run seed   # Seed database with admin account + 30 sample listings
```

---

## 🔐 Authorization Flow

The application implements a layered middleware authorization system:

1. **`isLoggedIn`** — Verifies `req.isAuthenticated()`. For unauthenticated users attempting to submit reviews, saves review data to `req.session.pendingReview` for automatic replay after login/signup.
2. **`isOwner`** — Fetches the listing and verifies the current user is the owner before allowing edit/delete operations. Admins bypass this check.
3. **`isAuthor`** — Fetches the review and verifies the current user is the author before allowing deletion. Admins bypass this check.
4. **`isAdmin`** — Verifies `req.user.role === 'admin'` to protect dashboard routes.
5. **`validateBooking`** — Validates booking data (dates, guest count) using Joi schema before processing.
6. **`saveRedirectTo`** — Transfers `req.session.redirectTo` and `req.session.pendingReview` to `res.locals` before Passport resets the session on login.

### Booking Authorization

- Users can only view and manage their own bookings
- Admins can view and manage all bookings
- Booking owners can cancel their confirmed bookings
- Only cancelled bookings can be deleted/hidden
- Users perform soft delete (hides from view), admins perform hard delete (removes from database)

---

## 🔄 Notable Implementation Details

- **Express 5.2** — Uses the latest Express version with modern routing and error handling
- **Booking Overlap Detection** — Database queries prevent double-booking by checking for date range conflicts with non-cancelled bookings
- **Soft vs Hard Delete** — Users can hide cancelled bookings from their view (soft delete), while admins permanently remove them from the database (hard delete)
- **Payment State Management** — Three-state payment UI (default, processing with spinner, success with confetti) with AJAX-based processing and form fallback
- **Live Price Calculator** — Real-time JavaScript calculation of nights, subtotal, service fee (10%), and total as users select dates
- **Date Validation** — Both client-side (HTML5 date inputs with min attributes) and server-side (Joi + custom checks) prevent past dates and invalid ranges
- **Guest Limit Enforcement** — Property-specific maxGuests field with validation at booking creation
- **Revenue Tracking** — MongoDB aggregation pipeline calculates total revenue from completed payments
- **Cascading Booking Deletes** — When a user is deleted, all their bookings are automatically removed
- **Pending Review Replay** — If a guest submits a review, their rating and comment are stored in the session. After login or signup, the review is automatically posted to the original listing — a seamless UX pattern
- **Smart Redirect** — The `Referer` header is captured when auth pages load, and users are redirected back to their previous page after authentication
- **Cloudinary Image Lifecycle** — Old images are destroyed from Cloudinary before uploading replacements on update, images are cleaned up on listing deletion, and orphaned uploads are removed if validation fails after upload
- **Sanitized Upload IDs** — Cloudinary `public_id` is sanitized (alphanumeric + hyphens/underscores) with a timestamp suffix to prevent collisions and unexpected overwrites
- **Resilient Geocoding** — `geocode()` wraps all network calls in try/catch, checks `response.ok`, and returns safe default coordinates `[0,0]` on any failure — listing creation/update never crashes due to Nominatim downtime or rate-limiting
- **XSS Prevention** — Map popups use DOM APIs (`setDOMContent`, `textContent`) instead of interpolating user-controlled strings into HTML via `setHTML()`
- **Regex Injection Prevention** — Search queries properly escape special regex characters using `\\$&` replacement to prevent ReDoS attacks
- **Geometry Guards** — Show page template safely handles missing `geometry.coordinates` for listings created before geocoding was added
- **Cascading Review Deletion** — Mongoose `post('findOneAndDelete')` middleware on the Listing model removes all associated reviews when a listing is deleted
- **N+1 Query Optimization** — Admin reviews page uses a single bulk query with Map-based lookups instead of individual queries per review
- **Free Map Stack** — Nominatim geocoding + MapLibre GL JS + OpenStreetMap tiles = zero API keys or paid services
- **Node.js 18+ Required** — `engines.node` declared in `package.json` since the app uses the built-in `fetch` API

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Open a Pull Request

---

<div align="center">

**Built by [Rudra Sanandiya](https://github.com/rudra1806)**

</div>