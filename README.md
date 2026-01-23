# Heavenly

A full-stack property rental web application built with Node.js, Express, MongoDB, and EJS. Features complete user authentication, authorization, and a review system.

[![Node.js](https://img.shields.io/badge/Node.js-v14+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express.js-v5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-ODM-880000?logo=mongoose&logoColor=white)](https://mongoosejs.com/)
[![Passport](https://img.shields.io/badge/Passport.js-Authentication-34E27A?logo=passport&logoColor=white)](http://www.passportjs.org/)
[![EJS](https://img.shields.io/badge/EJS-Template%20Engine-B4CA65?logo=ejs&logoColor=black)](https://ejs.co/)
[![Joi](https://img.shields.io/badge/Joi-Validation-4A90E2)](https://joi.dev/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)

---

## Overview

Heavenly is a property listing platform that enables users to create, view, update, and delete rental property listings. Users can register, login, and leave reviews on properties. Built following the MVC architecture pattern with server-side rendering.

---

## Features

### 🏠 Listings
- **CRUD Operations** – Full create, read, update, and delete functionality for property listings
- **Owner Authorization** – Only listing owners can edit or delete their listings
- **Image Support** – Custom image URLs with default fallback

### 👤 Authentication & Authorization
- **User Registration** – Secure signup with email, username, and password
- **User Login/Logout** – Session-based authentication using Passport.js
- **Protected Routes** – Middleware protection for authenticated actions
- **Smart Redirects** – Redirects users back to the page they were on after login

### ⭐ Reviews System
- **Star Ratings** – 1-5 star rating system with visual display
- **Review Comments** – Users can write detailed reviews
- **Author Tracking** – Each review shows who wrote it
- **Author-Only Delete** – Only review authors can delete their reviews
- **Pending Review Submission** – Reviews submitted by unauthenticated users are saved and auto-submitted after login

### 🛡️ Security & Validation
- **Joi Schema Validation** – Server-side validation for listings and reviews
- **Authorization Middleware** – `isLoggedIn`, `isOwner`, `isAuthor` middleware
- **Session Management** – Secure session handling with express-session
- **Flash Messages** – User feedback for actions (success/error)

### 🎨 UI/UX
- **Responsive Design** – Bootstrap 5-based responsive layout
- **Custom Styling** – Modular CSS architecture
- **Interactive Star Rating** – Visual star picker for reviews
- **Form Validation** – Client-side validation feedback

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js v5 |
| Database | MongoDB with Mongoose ODM |
| Authentication | Passport.js with Local Strategy |
| Session | express-session + connect-flash |
| View Engine | EJS + EJS-Mate |
| Validation | Joi |
| Styling | Bootstrap 5, Font Awesome, Custom CSS |

---

## Project Structure

```
heavenly/
├── app.js                    # Application entry point & middleware setup
├── schemas.js                # Joi validation schemas
├── package.json              # Dependencies and scripts
│
├── models/
│   ├── listing.js            # Listing schema (title, price, location, owner, reviews)
│   ├── review.js             # Review schema (rating, comment, author)
│   └── user.js               # User schema (email, username, password via Passport)
│
├── routes/
│   ├── listings.js           # Listing CRUD routes
│   ├── reviews.js            # Review routes (create, delete)
│   └── users.js              # Auth routes (signup, login, logout)
│
├── utils/
│   ├── ExpressError.js       # Custom error class
│   ├── wrapAsync.js          # Async error wrapper
│   ├── isLoggedIn.js         # Authentication middleware + pending review logic
│   ├── isOwner.js            # Listing ownership verification
│   ├── isAuthor.js           # Review authorship verification
│   ├── validateListing.js    # Listing validation middleware
│   └── validateReview.js     # Review validation middleware
│
├── views/
│   ├── layouts/
│   │   └── boilerplate.ejs   # Main layout template
│   ├── listings/
│   │   ├── index.ejs         # All listings view
│   │   ├── show.ejs          # Single listing with reviews
│   │   ├── new.ejs           # Create listing form
│   │   └── edit.ejs          # Edit listing form
│   ├── users/
│   │   ├── login.ejs         # Login form
│   │   └── signup.ejs        # Registration form
│   ├── includes/
│   │   ├── navbar.ejs        # Navigation bar
│   │   ├── footer.ejs        # Footer
│   │   └── flash.ejs         # Flash messages
│   └── error.ejs             # Error page
│
├── public/
│   ├── css/
│   │   ├── base.css          # Base styles
│   │   ├── navbar.css        # Navigation styles
│   │   ├── footer.css        # Footer styles
│   │   ├── listing.css       # Listing cards styles
│   │   ├── show.css          # Show page styles
│   │   ├── form.css          # Form styles
│   │   └── auth.css          # Auth pages styles
│   └── js/
│       └── formvalidation.js # Client-side validation
│
└── init/
    ├── data.js               # Seed data
    └── index.js              # Database seeder with superuser
```

---

## Getting Started

### Prerequisites

- Node.js v14+
- MongoDB v4.4+ (running locally or MongoDB Atlas)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/heavenly.git
cd heavenly

# Install dependencies
npm install

# Start MongoDB (if running locally)
mongod

# Seed the database with sample data (optional)
node init/index.js

# Start development server
npx nodemon app.js
```

The application runs on `http://localhost:8080`

### Default Admin User (after seeding)

```
Username: admin
Email: admin@heavenly.com
Password: admin123
```

---

## API Routes

### Listings

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/listings` | View all listings | No |
| `GET` | `/listings/new` | Show create form | Yes |
| `POST` | `/listings` | Create new listing | Yes |
| `GET` | `/listings/:id` | View single listing | No |
| `GET` | `/listings/:id/edit` | Show edit form | Yes (Owner) |
| `PUT` | `/listings/:id` | Update listing | Yes (Owner) |
| `DELETE` | `/listings/:id` | Delete listing | Yes (Owner) |

### Reviews

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/listings/:id/reviews` | Add review | Yes |
| `DELETE` | `/listings/:id/reviews/:reviewId` | Delete review | Yes (Author) |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/signup` | Show registration form |
| `POST` | `/signup` | Register new user |
| `GET` | `/login` | Show login form |
| `POST` | `/login` | Authenticate user |
| `GET` | `/logout` | Logout user |

---

## Data Models

### User
```javascript
{
  username: String,     // auto-added by passport-local-mongoose
  email: String,        // required, unique
  password: String      // hashed, auto-added by passport-local-mongoose
}
```

### Listing
```javascript
{
  title: String,        // required, 3-100 chars
  description: String,  // required, 10-1000 chars
  image: {
    filename: String,   // default: 'default.jpg'
    url: String         // default image URL provided
  },
  price: Number,        // required, positive
  location: String,     // required
  country: String,      // required
  owner: ObjectId,      // ref: 'User', required
  reviews: [ObjectId]   // ref: 'Review'
}
```

### Review
```javascript
{
  comment: String,      // required, 5-500 chars
  rating: Number,       // required, 1-5
  author: ObjectId,     // ref: 'User'
  createdAt: Date       // auto-generated
}
```

---

## Middleware

| Middleware | Purpose |
|------------|---------|
| `isLoggedIn` | Verifies user is authenticated; stores pending reviews for unauthenticated users |
| `isOwner` | Verifies current user owns the listing |
| `isAuthor` | Verifies current user authored the review |
| `validateListing` | Validates listing data with Joi schema |
| `validateReview` | Validates review data with Joi schema |
| `wrapAsync` | Wraps async functions for error handling |
| `saveRedirectTo` | Preserves redirect URL across auth flow |

---

## Key Features Explained

### Pending Review Auto-Submission

When an unauthenticated user tries to submit a review:
1. Review data is stored in the session
2. User is redirected to login
3. After successful login, the review is automatically submitted
4. User is redirected back to the listing with a success message

### Smart Redirect After Login

- If a user clicks login from a listing page, they return to that listing after authentication
- Redirects work for both voluntary login (navbar) and forced login (protected routes)

---

## Scripts

```bash
# Development server with hot reload
npx nodemon app.js

# Seed database with sample listings
node init/index.js

# Production start
node app.js
```

---

## Environment Variables (Production)

For production deployment, consider using environment variables:

```env
MONGO_URL=mongodb://your-production-url
SESSION_SECRET=your-secure-secret
PORT=8080
```

---

## Development Phases

- [x] **Phase 1** – Property Listings CRUD, Reviews System, Validation
- [x] **Phase 2** – User Authentication, Authorization, Review Author Tracking
- [ ] **Phase 3** – Image Uploads (Cloudinary), Maps Integration
- [ ] **Phase 4** – Search, Filters, Pagination

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

ISC License

---

*Created by **Rudra Sanandiya**.*