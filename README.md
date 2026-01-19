# Heavenly

A full-stack property rental web application built with Node.js, Express, MongoDB, and EJS.

[![Node.js](https://img.shields.io/badge/Node.js-v14+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

[![Express](https://img.shields.io/badge/Express.js-v5-000000?logo=express&logoColor=white)](https://expressjs.com/)

[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Mongoose](https://img.shields.io/badge/Mongoose-ODM-880000?logo=mongoose&logoColor=white)](https://mongoosejs.com/)

[![EJS](https://img.shields.io/badge/EJS-Template%20Engine-B4CA65?logo=ejs&logoColor=black)](https://ejs.co/)
[![EJS-Mate](https://img.shields.io/badge/EJS--Mate-Layouts-blue)](https://www.npmjs.com/package/ejs-mate)

[![Joi](https://img.shields.io/badge/Joi-Validation-4A90E2)](https://joi.dev/)

[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![CSS](https://img.shields.io/badge/CSS-Custom-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)


## Overview

Heavenly is a property listing platform that enables users to create, view, update, and delete rental property listings. Built following the MVC architecture pattern with server-side rendering.

## Features

- **CRUD Operations** – Full create, read, update, and delete functionality for listings
- **Schema Validation** – Server-side validation using Joi
- **Async Error Handling** – Centralized error handling with custom error classes
- **Responsive UI** – Bootstrap-based responsive design
- **Template Engine** – EJS with layout support via EJS-Mate

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js v5 |
| Database | MongoDB with Mongoose ODM |
| View Engine | EJS + EJS-Mate |
| Validation | Joi |
| Styling | Bootstrap 5, Custom CSS |

## Project Structure

```
├── app.js                  # Application entry point & route definitions
├── schemas.js              # Joi validation schemas
├── models/
│   └── listing.js          # Mongoose schema & model
├── views/
│   ├── layouts/            # EJS layout templates
│   ├── listings/           # CRUD view templates
│   ├── includes/           # Reusable components (navbar, footer)
│   └── error.ejs           # Error page
├── public/
│   ├── css/                # Stylesheets
│   └── js/                 # Client-side scripts
├── utils/
│   ├── ExpressError.js     # Custom error class
│   ├── wrapAsync.js        # Async wrapper utility
│   └── validateListing.js  # Validation middleware
└── init/
    ├── data.js             # Seed data
    └── index.js            # Database seeder
```

## Getting Started

### Prerequisites

- Node.js v14+
- MongoDB v4.4+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/heavenly.git
cd heavenly

# Install dependencies
npm install

# Seed the database (optional)
node init/index.js

# Start development server
npx nodemon app.js
```

The application runs on `http://localhost:8080`

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/listings` | Fetch all listings |
| `GET` | `/listings/new` | Render create form |
| `POST` | `/listings` | Create listing |
| `GET` | `/listings/:id` | Fetch single listing |
| `GET` | `/listings/:id/edit` | Render edit form |
| `PUT` | `/listings/:id` | Update listing |
| `DELETE` | `/listings/:id` | Delete listing |

## Data Model

```javascript
{
  title: String,        // required
  description: String,  // required
  image: {
    filename: String,
    url: String
  },
  price: Number,        // required
  location: String,     // required
  country: String       // required
}
```

## Scripts

```bash
npm start         # Run production server
npx nodemon app.js  # Run development server with hot reload
node init/index.js  # Seed database with sample data
```

---

*Created by **Rudra Sanandiya**.*