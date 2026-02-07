<div align="center">

# 🏝️ Heavenly

**A Full-Stack Property Rental Platform**

*Discover and list luxury vacation rentals with interactive maps, real-time reviews, and seamless authentication*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-9.x-880000?style=for-the-badge&logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![EJS](https://img.shields.io/badge/EJS-Template-B4CA65?style=for-the-badge&logo=ejs&logoColor=black)](https://ejs.co/)
[![Passport](https://img.shields.io/badge/Passport.js-Auth-34E27A?style=for-the-badge&logo=passport&logoColor=white)](http://www.passportjs.org/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Images-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![MapLibre](https://img.shields.io/badge/MapLibre-Maps-396CB2?style=for-the-badge&logo=maplibre&logoColor=white)](https://maplibre.org/)

[Features](#-features) • [Tech Stack](#%EF%B8%8F-tech-stack) • [Quick Start](#-quick-start) • [Architecture](#%EF%B8%8F-architecture) • [API Reference](#-api-reference)

</div>

---

## 📋 Overview

Heavenly is a production-ready, full-stack web application for property rentals built with the **MVC architecture pattern**. Users can browse listings, create accounts, post properties with cloud-hosted images, leave star-rated reviews, and explore locations on interactive maps—all with automatic geocoding requiring no API keys.

### ✨ Key Highlights

- **Complete CRUD Operations** for property listings with owner authorization
- **Interactive Maps** using MapLibre GL JS with intelligent marker clustering
- **Automatic Geocoding** via Nominatim (OpenStreetMap) – no API keys required
- **Cloud Image Management** with Cloudinary (upload, update, auto-cleanup)
- **Secure Authentication** with Passport.js and session management
- **Smart UX Features** like pending review submission and redirect preservation

---

## 🚀 Features

<table>
<tr>
<td width="50%">

### 🏠 Property Management
- Full CRUD with owner-only edit/delete
- Cloud image upload via Cloudinary
- Auto-cleanup of old images on update/delete
- Default fallback images
- Supports JPG, PNG, AVIF formats

</td>
<td width="50%">

### 🗺️ Maps & Geolocation
- MapLibre GL JS (free, no API keys)
- Auto-geocoding on listing creation
- Individual property maps with markers
- Index page cluster map with zoom
- GeoJSON coordinate storage

</td>
</tr>
<tr>
<td width="50%">

### 👤 Authentication
- User registration with email validation
- Session-based auth with Passport.js
- Password hashing via passport-local-mongoose
- Smart redirects after login/signup
- Protected routes with middleware

</td>
<td width="50%">

### ⭐ Reviews System
- 1-5 star ratings with visual display
- Author tracking with timestamps
- Author-only delete permissions
- Pending review auto-submission
- Client + server-side validation

</td>
</tr>
<tr>
<td width="50%">

### 🛡️ Security
- Joi schema validation
- Authorization middleware layers
- HTTP-only session cookies
- Environment variable protection
- File type restrictions

</td>
<td width="50%">

### 🎨 Modern UI/UX
- Responsive Bootstrap 5 design
- Custom paradise-inspired theme
- Modular CSS architecture
- Interactive star rating picker
- Split-layout auth pages

</td>
</tr>
</table>

---

## 🛠️ Tech-Stack

| Category | Technologies |
|----------|-------------|
| **Backend** | Node.js, Express.js 5, Mongoose 9 |
| **Database** | MongoDB |
| **Authentication** | Passport.js, passport-local-mongoose |
| **Validation** | Joi 18 |
| **File Upload** | Multer 2, Cloudinary |
| **Maps** | MapLibre GL JS, Nominatim API |
| **Frontend** | EJS, EJS-Mate, Bootstrap 5 |
| **Session** | express-session, connect-flash |

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- [Cloudinary account](https://cloudinary.com/) (free tier)

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

# Seed database with sample data (optional)
npm run seed

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required
CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

# Optional (defaults provided)
MONGO_URL=mongodb://127.0.0.1:27017/heavenly
SESSION_SECRET=your_secure_secret_key
PORT=8080
```

The app runs at `http://localhost:8080`

---

## 🏗️ Architecture

```
Heavenly/
├── app.js                 # Entry point, middleware, routes
├── cloudConfig.js         # Cloudinary + Multer setup
├── schemas.js             # Joi validation schemas
│
├── controllers/           # Business logic
│   ├── listing.js         # Listing CRUD operations
│   ├── review.js          # Review operations
│   └── user.js            # Auth operations
│
├── models/                # Mongoose schemas
│   ├── listing.js         # Listing model (GeoJSON geometry)
│   ├── review.js          # Review model (rating, comment)
│   └── user.js            # User model (Passport plugin)
│
├── routes/                # Express routers
│   ├── listings.js        # /listings routes
│   ├── reviews.js         # /listings/:id/reviews routes
│   ├── users.js           # /signup, /login, /logout
│   └── pages.js           # Static pages
│
├── utils/                 # Middleware & utilities
│   ├── ExpressError.js    # Custom error class
│   ├── wrapAsync.js       # Async error wrapper
│   ├── isLoggedIn.js      # Auth middleware
│   ├── isOwner.js         # Listing ownership check
│   ├── isAuthor.js        # Review authorship check
│   ├── validateListing.js # Listing validation
│   ├── validateReview.js  # Review validation
│   └── geocode.js         # Nominatim geocoding
│
├── views/                 # EJS templates
│   ├── layouts/           # Boilerplate layout
│   ├── listings/          # CRUD views
│   ├── users/             # Auth views
│   ├── pages/             # Static pages
│   └── includes/          # Partials (navbar, footer, flash)
│
├── public/                # Static assets
│   ├── css/               # Modular stylesheets
│   └── js/                # Client-side scripts (maps, validation)
│
└── init/                  # Database seeding
    ├── data.js            # Sample listings
    └── index.js           # Seeder script
```

---

## 📡 API Reference

### Listings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/listings` | List all properties | Public |
| `GET` | `/listings/new` | Create form | Required |
| `POST` | `/listings` | Create listing | Required |
| `GET` | `/listings/:id` | View listing | Public |
| `GET` | `/listings/:id/edit` | Edit form | Owner |
| `PUT` | `/listings/:id` | Update listing | Owner |
| `DELETE` | `/listings/:id` | Delete listing | Owner |

### Reviews

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/listings/:id/reviews` | Add review | Required |
| `DELETE` | `/listings/:id/reviews/:reviewId` | Delete review | Author |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/signup` | Registration form |
| `POST` | `/signup` | Register user |
| `GET` | `/login` | Login form |
| `POST` | `/login` | Authenticate |
| `GET` | `/logout` | End session |

### Static Pages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/privacy` | Privacy policy |
| `GET` | `/terms` | Terms of service |
| `GET` | `/contact` | Contact form |

---

## 📦 Scripts

```bash
npm start      # Production server
npm run dev    # Development with nodemon
npm run seed   # Seed database with sample data
```

---

## 🔐 Authorization Flow

The application implements three middleware layers:

1. **`isLoggedIn`** – Verifies authentication, stores pending reviews for guests
2. **`isOwner`** – Ensures only listing owners can edit/delete their properties
3. **`isAuthor`** – Ensures only review authors can delete their reviews

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