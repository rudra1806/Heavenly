# Heavenly

A full-stack property rental web application built with Node.js, Express, MongoDB, and EJS. Features complete user authentication, authorization, and a comprehensive review system with MVC architecture.

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

Heavenly is a modern property listing platform that enables users to create, view, update, and delete rental property listings. Users can register, login, and leave reviews on properties. Built following the **MVC (Model-View-Controller)** architecture pattern with server-side rendering and featuring a paradise-inspired design theme that makes every stay feel heavenly.

---

## Features

### 🏠 Listings Management
- **Full CRUD Operations** – Create, read, update, and delete property listings with ease
- **Owner Authorization** – Only listing owners can edit or delete their listings
- **Image Support** – Custom image URLs with default fallback images
- **Detailed Property Info** – Title, description, price, location, and country fields
- **Owner Display** – Each listing shows the owner's username
- **Listing Not Found Handling** – Graceful error handling with flash messages

### 👤 Authentication & Authorization
- **User Registration** – Secure signup with email, username, and password hashing
- **User Login/Logout** – Session-based authentication using Passport.js Local Strategy
- **Protected Routes** – Middleware protection for authenticated actions
- **Smart Redirects** – Automatically redirects users back to the page they were on after login/signup
- **Referer Tracking** – Preserves user navigation context across authentication flows
- **Password Security** – Passwords hashed using passport-local-mongoose

### ⭐ Advanced Reviews System
- **Star Ratings** – 1-5 star rating system with visual display
- **Review Comments** – Users can write detailed reviews (5-500 characters)
- **Author Tracking** – Each review displays the author's username and creation date
- **Author-Only Delete** – Only review authors can delete their own reviews
- **Pending Review Submission** – Reviews submitted by unauthenticated users are saved in session and auto-submitted after login/signup
- **Review Validation** – Both client-side and server-side validation with Joi
- **Nested Population** – Reviews populate both author and listing owner information

### 🛡️ Security & Validation
- **Joi Schema Validation** – Comprehensive server-side validation for listings and reviews
- **Authorization Middleware** – `isLoggedIn`, `isOwner`, `isAuthor` middleware for route protection
- **Session Management** – Secure session handling with express-session and HTTP-only cookies
- **Flash Messages** – Real-time user feedback for all actions (success/error/info)
- **Error Handling** – Custom ExpressError class with global error handler
- **Async Error Wrapper** – wrapAsync utility for clean async/await error handling
- **404 Handling** – Custom 404 page for unmatched routes

### 🎨 Modern UI/UX
- **Heavenly Theme** – Custom-designed paradise-inspired aesthetic with custom logo
- **Responsive Design** – Bootstrap 5-based responsive layout with mobile-first approach
- **Modular CSS Architecture** – Separate stylesheets for base, navbar, footer, listings, forms, and auth pages
- **Warm Color Palette** – Earthy tones with golden accents (#d4a574, #8b6f47)
- **Interactive Star Rating** – Visual star picker for reviews with hover effects
- **Client-Side Form Validation** – Bootstrap validation with real-time feedback
- **Beautiful Landing Page** – Hero section with logo, tagline, and features showcase
- **Smooth Animations** – 0.3s transitions throughout the application
- **Dark Navigation** – Professional dark navbar (#2c3e50) and footer with custom branding
- **Split Layout Auth Pages** – Modern login/signup pages with image and form sections

### 🏗️ Architecture & Code Quality
- **MVC Pattern** – Clean separation of concerns with Models, Views, and Controllers
- **Controller Layer** – Dedicated controllers for listings, reviews, and users
- **Reusable Middleware** – Modular middleware in utils folder
- **EJS Layouts** – DRY templates using ejs-mate with boilerplate layout
- **Partial Views** – Reusable navbar, footer, and flash message components
- **Method Override** – RESTful routes with PUT and DELETE support
- **Express 5** – Latest Express.js version with improved performance

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Node.js | JavaScript runtime environment |
| Framework | Express.js v5 | Web application framework |
| Database | MongoDB | NoSQL database |
| ODM | Mongoose v9 | MongoDB object modeling |
| Authentication | Passport.js | Authentication middleware |
| Auth Strategy | passport-local + passport-local-mongoose | Local username/password authentication |
| Session | express-session | Session management |
| Flash Messages | connect-flash | Temporary messages across redirects |
| View Engine | EJS + EJS-Mate | Template rendering with layouts |
| Validation | Joi v18 | Schema validation |
| Styling | Bootstrap 5 + Custom CSS | Responsive UI framework |
| Icons | Font Awesome | Icon library |
| HTTP Methods | method-override | PUT/DELETE support in forms |
| Dev Tools | nodemon | Auto-restart development server |

---

## Project Structure

```
heavenly/
├── app.js                    # Application entry point & middleware setup
├── schemas.js                # Joi validation schemas
├── package.json              # Dependencies and scripts
│
├── controllers/              # MVC Controllers (Business Logic)
│   ├── listing.js            # Listing CRUD operations
│   ├── review.js             # Review create/delete operations
│   └── user.js               # Authentication & user operations
│
├── models/                   # Mongoose Models (Data Layer)
│   ├── listing.js            # Listing schema (title, price, location, owner, reviews)
│   ├── review.js             # Review schema (rating, comment, author)
│   └── user.js               # User schema (email, username, password via Passport)
│
├── routes/                   # Express Routes (URL Mapping)
│   ├── listings.js           # Listing CRUD routes
│   ├── reviews.js            # Review routes (create, delete)
│   └── users.js              # Auth routes (signup, login, logout)
│
├── utils/                    # Utility Functions & Middleware
│   ├── ExpressError.js       # Custom error class
│   ├── wrapAsync.js          # Async error wrapper
│   ├── isLoggedIn.js         # Authentication middleware + pending review logic
│   ├── isOwner.js            # Listing ownership verification
│   ├── isAuthor.js           # Review authorship verification
│   ├── validateListing.js    # Listing validation middleware
│   └── validateReview.js     # Review validation middleware
│
├── views/                    # EJS Templates (Presentation Layer)
│   ├── layouts/
│   │   └── boilerplate.ejs   # Main layout template
│   ├── listings/
│   │   ├── index.ejs         # All listings view
│   │   ├── show.ejs          # Single listing with reviews
│   │   ├── new.ejs           # Create listing form
│   │   └── edit.ejs          # Edit listing form
│   ├── users/
│   │   ├── login.ejs         # Login form with split layout
│   │   └── signup.ejs        # Registration form with split layout
│   ├── includes/
│   │   ├── navbar.ejs        # Navigation bar
│   │   ├── footer.ejs        # Footer
│   │   └── flash.ejs         # Flash messages
│   ├── home.ejs              # Landing page with hero, logo & features
│   └── error.ejs             # Error page
│
├── public/                   # Static Assets
│   ├── css/
│   │   ├── base.css          # Base styles & global variables
│   │   ├── navbar.css        # Navigation styles
│   │   ├── footer.css        # Footer styles
│   │   ├── home.css          # Landing page styles
│   │   ├── listing.css       # Listing cards styles
│   │   ├── show.css          # Show page & review styles
│   │   ├── form.css          # Form styles
│   │   └── auth.css          # Auth pages styles (login/signup)
│   ├── js/
│   │   └── formvalidation.js # Bootstrap client-side validation
│   └── favicon.svg           # Site favicon
│
└── init/                     # Database Initialization
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

### MVC Architecture

The application follows a clean **Model-View-Controller** pattern:

- **Models** (`models/`) – Define data structure and database schemas using Mongoose
- **Views** (`views/`) – EJS templates for rendering HTML to users
- **Controllers** (`controllers/`) – Handle business logic and coordinate between models and views
- **Routes** (`routes/`) – Map URLs to controller functions

This separation ensures maintainable, scalable, and testable code.

### Pending Review Auto-Submission

When an unauthenticated user tries to submit a review:
1. Review data is stored in the session with `pendingReview` key
2. User is redirected to login or signup page
3. After successful authentication, the review is automatically validated and submitted
4. User is redirected back to the listing with a success message
5. Works for both login and signup flows seamlessly

### Smart Redirect After Login/Signup

- If a user clicks login/signup from a listing page, they return to that listing after authentication
- Redirects work for both voluntary login (navbar) and forced login (protected routes)
- Uses `req.session.redirectTo` to preserve the original URL
- Referer tracking ensures users don't lose their place in the application
- Excludes login/signup pages from redirect chain to prevent loops

### Authorization Layers

Three levels of authorization middleware:

1. **isLoggedIn** – Checks if user is authenticated
2. **isOwner** – Verifies user owns the listing (for edit/delete)
3. **isAuthor** – Verifies user authored the review (for delete)

### Error Handling Strategy

- **Custom ExpressError** – Structured error objects with status codes
- **wrapAsync** – Wraps async route handlers to catch errors
- **Global Error Handler** – Catches all errors and renders error page
- **404 Handler** – Catches unmatched routes
- **Flash Messages** – User-friendly error messages

---

## Scripts

```bash
# Development server with hot reload (recommended)
npx nodemon app.js

# Seed database with sample listings and admin user
node init/index.js

# Production start
node app.js

# Install dependencies
npm install
```

---

## Environment Variables (Production)

For production deployment, configure these environment variables:

```env
MONGO_URL=mongodb://your-production-url
SESSION_SECRET=your-secure-random-secret-key
PORT=8080
NODE_ENV=production
```

Update `app.js` to use environment variables:

```javascript
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/heavenly';
const sessionSecret = process.env.SESSION_SECRET || 'thisshouldbeabettersecret';
const port = process.env.PORT || 8080;
```

---

## Development Highlights

### Code Quality Features
- **Modular Architecture** – Separation of concerns with dedicated folders
- **Reusable Middleware** – DRY principle applied throughout
- **Error Handling** – Comprehensive error catching and user feedback
- **Validation** – Both client-side and server-side validation
- **Security** – Password hashing, session security, authorization checks
- **RESTful API** – Standard HTTP methods and URL patterns

### UI/UX Enhancements
- **Consistent Design Language** – Unified color scheme and typography
- **Responsive Layout** – Works on desktop, tablet, and mobile
- **Loading States** – Visual feedback for user actions
- **Error Messages** – Clear, actionable error messages
- **Success Feedback** – Flash messages for successful operations

---

## Future Enhancements

Potential features for future development:

- Image upload functionality (Cloudinary integration)
- Search and filter listings by location, price, etc.
- User profiles with listing history
- Favorite/bookmark listings
- Email verification for new users
- Password reset functionality
- Pagination for listings
- Advanced review features (helpful votes, replies)
- Admin dashboard for managing users and listings
- Real-time notifications
- Map integration for listing locations

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the ISC License.

---

*Created by **Rudra Sanandiya**.*