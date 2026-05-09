# 🏨 Heavenly — Microservices Architecture

> A full-stack property rental platform migrated from a monolithic Express.js application to a distributed microservices architecture for scalability, maintainability, and independent deployability.

---

## 📑 Table of Contents

- [Project Overview](#project-overview)
- [Why Microservices?](#why-microservices)
- [Architecture](#architecture)
  - [High-Level Diagram](#high-level-diagram)
  - [Service Registry](#service-registry)
  - [Communication Patterns](#communication-patterns)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Service Deep Dives](#service-deep-dives)
  - [API Gateway](#1-api-gateway-port-3000)
  - [Auth Service](#2-auth-service-port-3001)
  - [Listing Service](#3-listing-service-port-3002)
  - [Review Service](#4-review-service-port-3003)
  - [Booking Service](#5-booking-service-port-3004)
  - [Media Service](#6-media-service-port-3005)
  - [Search & Geocoding Service](#7-search--geocoding-service-port-3006)
  - [Admin/Dashboard Aggregator](#8-admindashboard-aggregator-port-3007)
  - [BFF (Backend-for-Frontend)](#9-bff-backend-for-frontend-port-8080)
- [Shared Package](#shared-package)
- [Infrastructure](#infrastructure)
- [Getting Started](#getting-started)
- [Migration Progress](#migration-progress)
- [Key Design Decisions](#key-design-decisions)
- [Lessons Learned](#lessons-learned)

---

## Project Overview

**Heavenly** is an Airbnb-inspired property rental platform that enables users to list properties, make bookings, leave reviews, and manage their hosting activities through a comprehensive dashboard.

### The Original Monolith

The application was initially built as a single Express.js server with:
- **1 entry point** (`app.js`) handling all concerns
- **4 Mongoose models** (User, Listing, Review, Booking) sharing a single MongoDB database
- **6 controllers** with tightly coupled business logic
- **7 route modules** with cross-domain dependencies
- **30+ EJS templates** rendered server-side
- **Session-based authentication** via Passport.js

### The Migration Goal

Decompose this monolith into **8 independently deployable microservices** + an API Gateway + a BFF layer — all orchestrated via Docker Compose, communicating through REST APIs and RabbitMQ event-driven messaging.

---

## Why Microservices?

| Monolith Pain Point | Microservices Solution |
|---------------------|----------------------|
| Single deployment unit — one bug can bring down everything | Each service is independently deployable and restartable |
| Tightly coupled models — Listing embeds Review IDs, Booking references Listing | Each service owns its own database with clean boundaries |
| Scaling requires scaling the entire app | Scale only the services under load (e.g., Search during peak traffic) |
| Single shared session store | Stateless JWT authentication — no shared state between services |
| One team must understand the entire codebase | Teams can own individual services independently |
| Technology lock-in to Express + EJS | Each service can evolve its tech stack independently |

---

## Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BFF Service (:8080)                               │
│            Express + EJS Templates + Session Mgmt                    │
│         Renders HTML, translates session → JWT for API calls         │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP (JSON)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API Gateway (:3000)                              │
│              JWT Validation · Rate Limiting · Routing                │
│            Proxies requests to downstream services                   │
└───┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬───────────────┘
    │      │      │      │      │      │      │      │
    ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
 ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
 │ Auth ││ List ││Review││ Book ││Media ││Search││Admin │
 │:3001 ││:3002 ││:3003 ││:3004 ││:3005 ││:3006 ││:3007 │
 └──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘└──┬───┘└──────┘
    │       │       │       │       │       │
    ▼       ▼       ▼       ▼       ▼       ▼
 ┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
 │ Auth ││ List ││Review││ Book ││Cloud-││ Redis │
 │  DB  ││  DB  ││  DB  ││  DB  ││inary ││ Cache │
 └──────┘└──────┘└──────┘└──────┘└──────┘└──────┘

              ┌────────────────────────┐
              │   RabbitMQ (:5672)     │
              │   Event-Driven Comms   │
              │   Topic Exchange       │
              └────────────────────────┘
```

### Service Registry

| Service | Port | Database | Responsibility |
|---------|------|----------|----------------|
| **API Gateway** | 3000 | — | Route proxying, JWT validation, rate limiting |
| **Auth Service** | 3001 | `heavenly_auth` | User registration, login, JWT tokens |
| **Listing Service** | 3002 | `heavenly_listings` | Property CRUD, availability, ownership |
| **Review Service** | 3003 | `heavenly_reviews` | Ratings & reviews for listings |
| **Booking Service** | 3004 | `heavenly_bookings` | Reservations, payments, date management |
| **Media Service** | 3005 | — | Image uploads via Cloudinary |
| **Search Service** | 3006 | — | Full-text search, geocoding (Redis cached) |
| **Admin Aggregator** | 3007 | — | Cross-service stats, admin operations |
| **BFF** | 8080 | — | EJS rendering, session management |

### Communication Patterns

#### Synchronous (HTTP/REST)

Used when a service needs an **immediate response** to proceed:

```
Booking Service ──HTTP GET──▶ Listing Service
                              "Get listing price & availability"
                              ◀── { price: 2500, isAvailable: true }

Listing Service ──HTTP POST──▶ Media Service
                               "Upload this image to Cloudinary"
                               ◀── { url: "https://res.cloudinary.com/..." }

Listing Service ──HTTP GET──▶ Search Service
                              "Geocode 'Malibu, USA'"
                              ◀── { coordinates: [-118.78, 34.03] }
```

#### Asynchronous (RabbitMQ Events)

Used for **cascade operations** where services react to events without blocking the original request:

```
Auth Service ──publishes──▶ "user.deleted" { userId: "abc123" }
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
        Listing Service  Review Service  Booking Service
        "Delete user's   "Delete user's  "Delete user's
         listings"        reviews"        bookings"
```

**Exchange**: `heavenly.events` (Topic exchange)  
**Pattern**: Each consumer has its own durable queue (e.g., `listing-service.user-deleted`)  
**Reliability**: Messages persist on disk and survive broker restarts

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 20 (Alpine) | Lightweight containers |
| **Framework** | Express 5 | HTTP server for all services |
| **Database** | MongoDB 7 | Per-service document storage |
| **Message Broker** | RabbitMQ 3 (+ Management UI) | Async event-driven communication |
| **Cache** | Redis 7 | JWT blacklist, geocoding cache, search cache |
| **Auth** | JWT (jsonwebtoken) + bcrypt | Stateless authentication |
| **File Storage** | Cloudinary | Image upload and CDN |
| **Geocoding** | Nominatim (OpenStreetMap) | Free address-to-coordinates |
| **Validation** | Joi | Request schema validation |
| **Orchestration** | Docker Compose | Multi-container orchestration |
| **Frontend** | EJS + ejs-mate (via BFF) | Server-side rendered HTML (unchanged from monolith) |

---

## Project Structure

```
microservices/
├── docker-compose.yml               # 🐳 Orchestrates all 12 containers
├── .env.example                     # 🔐 Environment variables template
├── .gitignore
│
├── shared/                          # 📦 Shared NPM package
│   ├── package.json
│   ├── index.js                     # Barrel export
│   ├── middleware/
│   │   └── authMiddleware.js        # JWT verification (required/optional/admin)
│   ├── errors/
│   │   └── AppError.js              # Consistent error class with HTTP status codes
│   ├── events/
│   │   ├── eventNames.js            # Centralized event name constants
│   │   └── broker.js                # RabbitMQ client (connect/publish/consume)
│   └── utils/
│       └── serviceClient.js         # HTTP client for inter-service calls
│
├── gateway/                         # 🚪 API Gateway (:3000)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js                 # Entry point — middleware pipeline
│       ├── proxy.js                 # Route → service mapping configuration
│       └── middleware/
│           ├── jwtValidation.js     # Token verification at gateway level
│           ├── rateLimiter.js       # Global + auth-specific rate limiting
│           └── errorHandler.js      # Consistent JSON error responses
│
├── services/
│   ├── auth-service/                # 🔐 Port 3001 — User identity & JWT ✅
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js             # Entry point — MongoDB, Redis, RabbitMQ
│   │       ├── models/user.js       # Mongoose + bcrypt (pre-save hash)
│   │       ├── controllers/auth.js  # 8 endpoints (register→deleteUser)
│   │       ├── routes/auth.js       # Public + protected + admin routes
│   │       └── utils/jwt.js         # Access + refresh token generation
│   │
│   ├── listing-service/             # 🏠 Port 3002 — Property CRUD ✅
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js             # Entry point — MongoDB, RabbitMQ
│   │       ├── models/listing.js    # No reviews[], ownerId as string, GeoJSON
│   │       ├── controllers/listing.js # CRUD + ownership + toggle availability
│   │       ├── routes/listing.js    # Public read + protected write
│   │       ├── validators/validateListing.js # Joi validation middleware
│   │       └── events/consumers.js  # user.deleted → cascade delete
│   │
│   ├── review-service/              # ⭐ Port 3003 — Ratings & reviews ✅
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js             # Entry point — MongoDB, RabbitMQ
│   │       ├── models/review.js     # Denormalized authorUsername
│   │       ├── controllers/review.js # CRUD + listing stats
│   │       ├── routes/review.js     # Public reads + protected writes
│   │       ├── validators/validateReview.js # Joi validation
│   │       └── events/consumers.js  # listing/user.deleted → cascade
│   │
│   ├── booking-service/             # 📅 Port 3004 — Reservations & payments ✅
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js             # Entry point — MongoDB, RabbitMQ
│   │       ├── models/booking.js    # Denormalized data, payment fields
│   │       ├── controllers/booking.js # Overlap detection, simulated payment
│   │       ├── routes/booking.js    # CRUD + payment + cancel
│   │       ├── validators/validateBooking.js # Joi (checkOut > checkIn)
│   │       └── events/consumers.js  # listing/user.deleted → cancel+refund
│   │
│   ├── media-service/               # 📸 Port 3005 — Cloudinary uploads ✅
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js             # Entry point — lightweight, no DB
│   │       ├── controllers/media.js # Upload + delete via Cloudinary SDK
│   │       └── routes/media.js      # POST upload, DELETE filename
│   │
│   ├── search-service/              # 🔍 Port 3006 — Search & geocoding ✅
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js             # Entry point — Redis, RabbitMQ
│   │       ├── controllers/search.js # Nominatim geocoding + search index
│   │       ├── routes/search.js     # GET /geocode, GET /search
│   │       └── events/consumers.js  # listing.* → index sync
│   │
│   └── admin-service/               # 👑 Port 3007 — Admin aggregator
│       ├── Dockerfile
│       ├── package.json
│       └── src/index.js             # (stub — Phase 5)
│
├── bff/                             # 🖥️ Backend-for-Frontend (:8080)
│   ├── Dockerfile
│   ├── package.json
│   └── src/index.js                 # (stub — Phase 6)
│
└── scripts/                         # 🔧 Migration & seed utilities
```

---

## Service Deep Dives

### 1. API Gateway (Port 3000)

The **single entry point** for all API traffic. No business logic — pure routing and cross-cutting concerns.

**What it does:**
- **Route Proxying** — Maps `/api/listings/*` → Listing Service, `/api/auth/*` → Auth Service, etc.
- **JWT Validation** — Verifies tokens before forwarding requests. Three modes:
  - `required` — blocks unauthenticated requests (bookings, media)
  - `optional` — attaches user if token present (listings, reviews)
  - `requireAdmin` — blocks non-admin users (admin endpoints)
- **Rate Limiting** — 100 req/15min globally, 20 req/15min for auth endpoints
- **User Context Forwarding** — Passes decoded JWT data to services via `X-User-*` headers
- **Error Handling** — Returns consistent JSON errors when services are unavailable

**Key Design Choice:**  
The Gateway validates JWT tokens centrally so individual services don't need to. Services receive pre-validated user context via headers, reducing redundant token verification.

---

### 2. Auth Service (Port 3001) ✅

**Owns**: User identity, registration, authentication, JWT token lifecycle

**Status**: Fully implemented

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/register` | POST | Public | Create new user account, returns access + refresh tokens |
| `/auth/login` | POST | Public | Authenticate with username/email + password, returns tokens |
| `/auth/logout` | POST | Required | Blacklists current access token in Redis (TTL: 15min) |
| `/auth/refresh` | POST | Public | Exchange valid refresh token for a new access token |
| `/auth/me` | GET | Required | Get current authenticated user's profile |
| `/auth/users/:id` | GET | Internal | Fetch user info (called by other services) |
| `/auth/users` | GET | Admin | List all users with optional search |
| `/auth/users/:id` | DELETE | Admin | Delete user + publish `user.deleted` event |

**Implementation Details:**

| Component | Details |
|-----------|---------|
| **User Model** | Mongoose schema with bcrypt pre-save middleware (12 salt rounds), `comparePassword()` instance method, `toJSON()` auto-strips password from responses |
| **JWT Tokens** | Access token (15min expiry, contains id/username/email/role) + Refresh token (7d expiry, contains only id). Separate secrets prevent cross-use. |
| **Logout** | Adds current access token to Redis blacklist with TTL matching remaining token lifetime — token rejected on subsequent requests |
| **Cascade Delete** | On `DELETE /auth/users/:id`, publishes `user.deleted` event via RabbitMQ so Listing, Review, and Booking services can clean up related data |
| **Startup** | Connects to MongoDB, Redis, and RabbitMQ with retry logic. Graceful shutdown on SIGTERM/SIGINT closes all connections. |

**Migration from Monolith:**
- Replaces `passport-local-mongoose` plugin with **manual bcrypt hashing** (gives full control over password handling)
- Replaces session-based auth (`express-session` + `MongoStore`) with **stateless JWT** tokens
- Replaces Passport's `serializeUser/deserializeUser` with JWT payload containing user identity
- The "pending review on signup" flow (monolith's session-based feature) moves to the BFF/frontend layer
- Login accepts both username AND email (monolith only accepted username)

---

### 3. Listing Service (Port 3002) ✅

**Owns**: Property CRUD, availability status, ownership verification

**Status**: Fully implemented

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/listings` | GET | Public | All listings (filter by `ownerId`, `isAvailable`) |
| `/listings/:id` | GET | Public | Single listing by ID |
| `/listings` | POST | Required | Create listing (auto-geocodes location) |
| `/listings/:id` | PUT | Owner/Admin | Update listing (re-geocodes if location changed) |
| `/listings/:id` | DELETE | Owner/Admin | Delete listing + Cloudinary image + publish event |
| `/listings/:id/toggle-availability` | POST | Owner/Admin | Toggle `isAvailable` flag |

**Implementation Details:**

| Component | Details |
|-----------|---------|
| **Model** | No `reviews[]` array (decoupled), `ownerId` as plain string (no cross-DB populate), GeoJSON Point geometry, MongoDB text index on title/description/location/country |
| **Ownership** | Checks `ownerId === X-User-Id` header (set by Gateway). Admin role bypasses ownership check. |
| **Inter-service Calls** | `POST /media/upload` → Media Service (image upload), `GET /geocode` → Search Service (address to coordinates) |
| **Events Published** | `listing.created`, `listing.updated`, `listing.deleted` — consumed by Search (index) and Review/Booking (cascade) |
| **Events Consumed** | `user.deleted` → deletes all user's listings AND re-publishes `listing.deleted` for each (triggering downstream cascades) |
| **Validation** | Joi schema validates title, description, price, location, country, maxGuests before creation |

**Migration from Monolith:**
- `reviews[]` array **removed** — reviews are owned by the Review Service, queried separately
- `owner` (ObjectId ref) → `ownerId` (plain string) — no Mongoose populate across databases
- `cloudinary.uploader.destroy()` → HTTP call to Media Service `DELETE /media/:filename`
- `nominatim` geocoding → HTTP call to Search Service `GET /geocode?location=X`
- Mongoose cascade `post('findOneAndDelete')` middleware → RabbitMQ event-driven cascade

---

### 4. Review Service (Port 3003) ✅

**Owns**: Reviews with `listingId` and `authorId` as string references

**Status**: Fully implemented

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/reviews` | GET | Public | List reviews (filter by `listingId` or `authorId`) |
| `/reviews/stats/:listingId` | GET | Public | Rating count + average for a listing |
| `/reviews/:id` | GET | Public | Single review by ID |
| `/reviews` | POST | Required | Create review (author from JWT via headers) |
| `/reviews/:id` | DELETE | Author/Admin | Delete review |

**Implementation Details:**

| Component | Details |
|-----------|---------|
| **Model** | `listingId` and `authorId` as plain strings. Denormalized `authorUsername` avoids HTTP call on every read. Compound index on `(listingId, createdAt)` for efficient queries. |
| **Stats Endpoint** | Calculates average rating and review count per listing — used by BFF to display star ratings without fetching all reviews |
| **Authorization** | Only the review author or an admin can delete a review |
| **Events Published** | `review.created`, `review.deleted` |
| **Events Consumed** | `listing.deleted` → delete all reviews for that listing. `user.deleted` → delete all reviews by that user. |

**Migration from Monolith:**
- Reviews were embedded in the Listing model as `reviews[]` ObjectId array → now a standalone collection in a separate database
- `listing.populate('reviews')` → `GET /reviews?listingId=X` (separate HTTP call)
- Cascade delete via Mongoose middleware → RabbitMQ event consumers
- Author info was populated via `review.populate('author')` → now denormalized as `authorUsername` at creation time

---

### 5. Booking Service (Port 3004) ✅

**Owns**: Reservations, payment simulation, date overlap detection

**Status**: Fully implemented

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/bookings` | GET | Public | List bookings (filter by `userId`, `listingId`) |
| `/bookings/:id` | GET | Public | Single booking |
| `/bookings` | POST | Required | Create booking (validates listing, checks overlap) |
| `/bookings/:id/payment` | POST | Required | Process simulated payment |
| `/bookings/:id/cancel` | POST | Owner/Admin | Cancel booking + simulate refund |
| `/bookings/:id` | DELETE | Admin | Hard delete booking |

**Implementation Details:**

| Component | Details |
|-----------|---------|
| **Model** | Denormalized `listingTitle`, `listingImage`, `listingLocation`, `guestUsername` to avoid inter-service calls on read. Payment sub-document with `status`, `method`, `transactionId`, `paidAt`. Indexes on `(listingId, checkIn, checkOut)` for overlap queries. |
| **Overlap Detection** | Queries existing `pending`/`confirmed` bookings where `checkIn < newCheckOut AND checkOut > newCheckIn` — standard interval overlap formula |
| **Listing Validation** | HTTP call to Listing Service: verifies listing exists, is available, checks guest count limit, and prevents self-booking |
| **Payment Simulation** | Generates `SIM_<timestamp>_<random>` transaction IDs. Status lifecycle: `pending` → `completed` (on payment) → `refunded` (on cancel). Ready for Razorpay/Stripe integration. |
| **Events Published** | `booking.created`, `booking.payment.completed`, `booking.cancelled` |
| **Events Consumed** | `listing.deleted` → **cancel** (not delete) active bookings + mark refunded. `user.deleted` → cancel + refund. |

**Migration from Monolith:**
- `Listing.findById()` for price/availability → HTTP call to Listing Service
- Overlap detection was inline in `controllers/booking.js` → same logic, but queries only Booking Service's own database
- Payment was tightly coupled with booking creation → now a separate `POST /bookings/:id/payment` endpoint
- Cascade was hard-delete via Mongoose → now soft-cancel via event consumers (preserves booking history for accounting)

---

### 6. Media Service (Port 3005) ✅

**Owns**: All Cloudinary interactions

**Status**: Fully implemented

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/media/upload` | POST | Upload image (multipart form) → Cloudinary → returns URL + filename |
| `/media/:filename` | DELETE | Delete image from Cloudinary by public_id |

**Implementation Details:**
- Uses `multer` + `multer-storage-cloudinary` for seamless file handling
- Images stored in `Heavenly_DEV` folder on Cloudinary
- Filenames sanitized (alphanumeric + hyphens/underscores only) with timestamp suffix for uniqueness
- Allowed formats: JPG, JPEG, PNG, AVIF
- Prevents deletion of the default placeholder image (`default.jpg`)
- No database needed — this is a pure proxy to Cloudinary's API

**Migration from Monolith:**
- Extracted from `cloudConfig.js` and the upload logic scattered across `controllers/listing.js`
- Centralizes all Cloudinary credentials in one service
- Other services (Listing) now call `POST /media/upload` instead of directly importing cloudinary SDK
- Enables swapping storage providers (S3, Azure Blob) without touching business services

---

### 7. Search & Geocoding Service (Port 3006) ✅

**Owns**: Full-text listing search, address geocoding

**Status**: Fully implemented

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/geocode?location=X` | GET | Convert address → `[longitude, latitude]` coordinates |
| `/search?q=X&minPrice=N&maxPrice=N` | GET | Search listings by text and price range |

**Implementation Details:**

| Component | Details |
|-----------|---------|
| **Geocoding** | Calls Nominatim (OpenStreetMap) API, caches results in Redis with 7-day TTL. Respects Nominatim's 1 req/sec rate limit via caching. Returns `[lon, lat]` coordinates. |
| **Search Index** | In-memory `Map` keyed by listing ID. Stores title, description, location, country, price, coordinates. In production, you'd use Elasticsearch — this demonstrates the pattern. |
| **Text Search** | Case-insensitive substring matching across title + description + location + country |
| **Price Filtering** | `minPrice` and `maxPrice` query params for range filtering |
| **Events Consumed** | `listing.created` → add to index, `listing.updated` → update in index, `listing.deleted` → remove from index |
| **No Database** | Pure in-memory index + Redis cache. Index rebuilds from events on restart (or can be seeded from Listing Service). |

**Migration from Monolith:**
- Geocoding was inline in `controllers/listing.js` → now a dedicated endpoint with Redis caching
- Search was via MongoDB `$regex` on the listings collection → now an independent searchable index
- Decoupling search from the listing database enables future migration to Elasticsearch without touching the Listing Service

---

### 8. Admin/Dashboard Aggregator (Port 3007)

**Owns**: Nothing — pure aggregation layer

- Calls Auth, Listing, Review, and Booking services to compile statistics
- Admin dashboard: total users, listings, revenue, recent activity
- User dashboard: host stats (my listings, bookings on my listings, revenue) + guest stats (my bookings)
- Admin CRUD operations trigger events for cascade deletes

---

### 9. BFF (Backend-for-Frontend) (Port 8080)

**The user-facing server** — replaces `app.js` from the monolith.

- Receives browser requests at the same URLs as the monolith (`/listings`, `/login`, etc.)
- Calls the API Gateway to fetch data
- Renders the **existing EJS templates** with the response data
- Manages session cookies (translates session → JWT for backend calls)
- Serves static files (CSS, JS, images)

**Why BFF?** Allows migrating the backend to microservices **without rewriting the frontend**.

---

## Shared Package

The `@heavenly/shared` package provides utilities used by all services:

| Module | Purpose |
|--------|---------|
| `authMiddleware` | JWT verification with `required`, `optional`, and `requireAdmin` variants |
| `AppError` | Custom error class with HTTP status codes and JSON serialization |
| `broker` | RabbitMQ client — connect, publish events, consume events with retry logic |
| `eventNames` | Centralized constants for all event routing keys |
| `serviceClient` | HTTP client for inter-service calls with timeout, auth forwarding, and error handling |

---

## Infrastructure

### Docker Compose Services (12 total)

| Container | Image | Purpose |
|-----------|-------|---------|
| `heavenly-mongodb` | mongo:7 | Shared MongoDB instance (per-service databases) |
| `heavenly-redis` | redis:7-alpine | Caching + JWT blacklist |
| `heavenly-rabbitmq` | rabbitmq:3-management | Event messaging (management UI at `:15672`) |
| `heavenly-gateway` | Custom (Node 20) | API Gateway |
| `heavenly-auth` | Custom | Auth Service |
| `heavenly-listing` | Custom | Listing Service |
| `heavenly-review` | Custom | Review Service |
| `heavenly-booking` | Custom | Booking Service |
| `heavenly-media` | Custom | Media Service |
| `heavenly-search` | Custom | Search Service |
| `heavenly-admin` | Custom | Admin Aggregator |
| `heavenly-bff` | Custom | BFF (Frontend) |

### Health Checks

All infrastructure containers have health checks configured. Services use `depends_on` with `condition: service_healthy` to ensure proper startup ordering:

```
MongoDB ──healthy──▶ Auth, Listing, Review, Booking
Redis   ──healthy──▶ Gateway, Auth, Search
RabbitMQ──healthy──▶ Auth, Listing, Review, Booking, Search
```

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js 20+](https://nodejs.org/) (for local development without Docker)

### Setup

```bash
# 1. Clone and navigate
cd Heavenly/microservices

# 2. Create environment file
cp .env.example .env
# Edit .env with your actual secrets (JWT_SECRET, Cloudinary keys, etc.)

# 3. Start all services
docker-compose up --build

# 4. Verify everything is running
curl http://localhost:3000/health   # Gateway
curl http://localhost:3001/health   # Auth Service
curl http://localhost:8080/health   # BFF
# ... etc for all services

# 5. RabbitMQ Management UI
open http://localhost:15672          # Login: heavenly / heavenly123
```

### Local Development (without Docker)

```bash
# Install dependencies for a specific service
cd services/auth-service && npm install

# Run in dev mode with hot reload
npm run dev
```

---

## Migration Progress

> **66 files created** across 4 completed phases. 6 of 8 services fully implemented.

### ✅ Phase 1 — Foundation (Complete)

| Component | Status | Files |
|-----------|--------|-------|
| Docker Compose | ✅ Done | `docker-compose.yml` — 12 containers with health checks |
| Shared Package | ✅ Done | JWT middleware, RabbitMQ broker, AppError, serviceClient (7 files) |
| API Gateway | ✅ Done | Proxy routing, JWT validation, rate limiting, error handling (6 files) |
| Dockerfiles | ✅ Done | All 9 service/gateway/bff Dockerfiles |
| Service Scaffolds | ✅ Done | `package.json` + stub `index.js` for all services |

### ✅ Phase 2 — Auth + Media Services (Complete)

| Component | Status | Files |
|-----------|--------|-------|
| Auth: User Model | ✅ Done | `models/user.js` — bcrypt, pre-save hash, comparePassword, toJSON strips password |
| Auth: JWT Utils | ✅ Done | `utils/jwt.js` — access (15min) + refresh (7d) token generation/verification |
| Auth: Controller | ✅ Done | `controllers/auth.js` — 8 endpoints (register, login, logout, refresh, me, getUserById, getAllUsers, deleteUser) |
| Auth: Routes | ✅ Done | `routes/auth.js` — public, protected, and admin route definitions |
| Auth: Entry Point | ✅ Done | `index.js` — MongoDB + Redis + RabbitMQ connections, graceful shutdown |
| Auth: Redis Blacklist | ✅ Done | Logout adds token to Redis with TTL, blocking reuse |
| Auth: Event Publishing | ✅ Done | Publishes `user.deleted` via RabbitMQ for cascade cleanup |
| Media: Controller | ✅ Done | `controllers/media.js` — Cloudinary upload + delete |
| Media: Routes | ✅ Done | `routes/media.js` — POST upload, DELETE filename |
| Media: Entry Point | ✅ Done | `index.js` — lightweight, no DB or broker |

### ✅ Phase 3 — Listing + Search Services (Complete)

| Component | Status | Files |
|-----------|--------|-------|
| Listing: Model | ✅ Done | `models/listing.js` — no reviews[], ownerId as string, GeoJSON, text index |
| Listing: Validator | ✅ Done | `validators/validateListing.js` — Joi schema migrated from monolith |
| Listing: Controller | ✅ Done | `controllers/listing.js` — CRUD, ownership auth, inter-service calls (Media + Search), event publishing |
| Listing: Routes | ✅ Done | `routes/listing.js` — public read + protected write (6 endpoints) |
| Listing: Events | ✅ Done | `events/consumers.js` — `user.deleted` → cascade delete + re-publish `listing.deleted` |
| Listing: Entry Point | ✅ Done | `index.js` — MongoDB + RabbitMQ + dependency injection |
| Search: Controller | ✅ Done | `controllers/search.js` — Nominatim geocoding (Redis cached 7d), in-memory search index |
| Search: Routes | ✅ Done | `routes/search.js` — `GET /geocode`, `GET /search` with text + price filtering |
| Search: Events | ✅ Done | `events/consumers.js` — `listing.created/updated/deleted` → index sync |
| Search: Entry Point | ✅ Done | `index.js` — Redis + RabbitMQ, no database |

### ✅ Phase 4 — Review + Booking Services (Complete)

| Component | Status | Files |
|-----------|--------|-------|
| Review: Model | ✅ Done | `models/review.js` — denormalized `authorUsername`, `listingId`/`authorId` as strings |
| Review: Validator | ✅ Done | `validators/validateReview.js` — comment (5-500 chars), rating (1-5) |
| Review: Controller | ✅ Done | `controllers/review.js` — CRUD + `getListingStats` (avg rating + count) |
| Review: Routes | ✅ Done | `routes/review.js` — public reads + protected writes (5 endpoints) |
| Review: Events | ✅ Done | `events/consumers.js` — `listing.deleted` + `user.deleted` → cascade delete reviews |
| Review: Entry Point | ✅ Done | `index.js` — MongoDB + RabbitMQ, event publisher injection |
| Booking: Model | ✅ Done | `models/booking.js` — denormalized listing/user data, payment simulation, overlap indexes |
| Booking: Validator | ✅ Done | `validators/validateBooking.js` — checkOut > checkIn, guests ≥ 1 |
| Booking: Controller | ✅ Done | `controllers/booking.js` — overlap detection, Listing Service validation, simulated payment, cancel+refund |
| Booking: Routes | ✅ Done | `routes/booking.js` — CRUD + payment + cancel (6 endpoints) |
| Booking: Events | ✅ Done | `events/consumers.js` — `listing.deleted` + `user.deleted` → cancel bookings + refund |
| Booking: Entry Point | ✅ Done | `index.js` — MongoDB + RabbitMQ + Listing Service dependency injection |

### ⏳ Phase 5 — Admin/Dashboard Aggregator (Next)

- [ ] Cross-service aggregation endpoints
- [ ] Admin CRUD with cascade operations via events
- [ ] Dashboard statistics (host + guest views)

### 📋 Phase 6 — BFF Service

- [ ] Copy all 30+ EJS templates and static assets
- [ ] Route handlers calling Gateway APIs and rendering templates
- [ ] Session management (session → JWT translation layer)

### 📋 Phase 7 — Integration & Testing

- [ ] Data migration script (monolith DB → per-service databases)
- [ ] End-to-end testing across all services
- [ ] Docker Compose production configuration

---

## Key Design Decisions

### 1. BFF Pattern over Frontend Rewrite

> **Decision**: Keep all existing EJS templates and add a BFF layer instead of rewriting to React.

**Rationale**: The migration's primary goal is learning microservices architecture. Rewriting the frontend simultaneously would double the scope and blur the learning focus. The BFF pattern allows us to migrate the backend completely while preserving the existing, working UI.

**Trade-off**: An extra service (BFF) that translates session-based browser requests into JWT-authenticated API calls. This will be removed when/if we migrate to a React frontend later.

### 2. JWT over Sessions

> **Decision**: Replace Passport.js session-based authentication with stateless JWT tokens.

**Rationale**: Sessions require shared state (a session store) accessible by all services. In microservices, this creates a coupling point and single point of failure. JWT tokens are self-contained — any service can verify them independently using a shared secret, enabling truly stateless services.

**Trade-off**: JWTs can't be instantly invalidated (unlike sessions). We mitigate this with short-lived access tokens (15min) and a Redis-based blacklist for logout.

### 3. Database per Service

> **Decision**: Each service gets its own database instead of sharing one.

**Rationale**: The monolith's biggest coupling point is the shared database. When `Listing` embeds `Review` IDs and `Booking` references `Listing`, changing one model can break others. Separate databases enforce clean boundaries — services can only access their own data and must use APIs to read other services' data.

**Trade-off**: No more cross-collection `populate()` calls. The BFF or frontend must make multiple API calls and combine data. Eventual consistency for cascade operations (handled by RabbitMQ events).

### 4. RabbitMQ over Redis Pub/Sub

> **Decision**: Use RabbitMQ for event-driven messaging instead of Redis Pub/Sub.

**Rationale**: Redis Pub/Sub is fire-and-forget — if a consumer is down when an event is published, the message is lost. RabbitMQ provides durable queues with acknowledgment, meaning messages persist until successfully processed. This is critical for cascade operations like user deletion, where losing an event would leave orphaned data.

**Trade-off**: Additional infrastructure component. RabbitMQ is more complex to operate than Redis Pub/Sub, but its reliability guarantees are worth it for data integrity.

### 5. Dedicated Admin Aggregator

> **Decision**: Create a dedicated Admin/Dashboard service rather than folding it into the Gateway or frontend.

**Rationale**: Admin and Dashboard are aggregation layers that query across ALL domains. Putting this logic in the Gateway would violate its role as a thin routing layer. Putting it in the frontend would expose internal service URLs. A dedicated aggregator keeps the architecture clean and provides a single place for cross-service business logic.

---

## Lessons Learned

### From Phase 1

1. **Monorepo shared packages require careful dependency management** — The `@heavenly/shared` package must be available to all services both locally (via `../shared`) and in Docker (via `COPY`). The Dockerfile pattern of copying shared first, then service code, enables efficient layer caching.

2. **Docker Compose health checks are essential** — Without them, services would start before MongoDB/Redis/RabbitMQ are ready, causing connection failures. The `depends_on: condition: service_healthy` pattern ensures correct startup ordering.

3. **The Gateway should be thin** — It's tempting to add business logic to the Gateway (validation, data transformation). Resist this. The Gateway should only handle routing, auth, and rate limiting. Business logic belongs in services.

### From Phase 2

4. **bcrypt gives more control than passport-local-mongoose** — The monolith's `passport-local-mongoose` plugin magically added `username`, `password`, and authentication methods. With bcrypt, we explicitly define the schema, hash in pre-save middleware, and write our own `comparePassword()`. More code, but complete transparency into what's happening. Essential for debugging auth issues in a distributed system.

5. **JWT dual-token strategy solves the logout problem** — Short-lived access tokens (15min) limit damage if stolen. Refresh tokens (7 days) prevent frequent re-login. Redis blacklist handles the "instant logout" edge case that pure JWT can't solve. This is a common production pattern worth understanding deeply.

6. **Dependency injection keeps controllers testable** — The auth controller receives its Redis client and RabbitMQ publisher via setter functions (`setRedisClient`, `_publishEvent`), not imports. This means controllers can be unit-tested without spinning up Redis or RabbitMQ — just inject mocks.

7. **Peer dependency conflicts are real in microservices** — `multer-storage-cloudinary@4` requires `cloudinary@^1`, not `cloudinary@^2`. In a monolith, you hit this once. With 8 services, dependency conflicts multiply. Pinning exact versions in `package.json` prevents surprises.

8. **Not every service needs a database** — The Media Service is a stateless proxy to Cloudinary. No MongoDB, no Redis, no RabbitMQ. This is the ideal microservice: tiny, focused, independently deployable. It proves that "microservice" doesn't mean "mini monolith."

### From Phase 3

9. **Cascade events can trigger further cascades** — When `user.deleted` fires, the Listing Service deletes all user's listings AND re-publishes `listing.deleted` for each one. This triggers the Review and Booking services to clean up their data. This "event chain" pattern is powerful but requires careful design to avoid infinite loops. Always ensure events flow in one direction: `user.deleted` → `listing.deleted` → review/booking cleanup (never back up).

10. **Ownership authorization works differently across service boundaries** — In the monolith, `isOwner()` middleware called `Listing.findById()` and compared `listing.owner` to `req.user._id`. In microservices, the Gateway decodes the JWT and forwards `X-User-Id` as a header. The Listing Service compares `listing.ownerId === req.headers['x-user-id']`. Same logic, different mechanism — and no cross-database query needed.

11. **In-memory search indexes are a valid learning pattern** — The Search Service uses a simple `Map` instead of Elasticsearch. It demonstrates the core concept: an independent, event-driven read model that stays synchronized with the source of truth (Listing Service) via RabbitMQ. Swapping to Elasticsearch later means changing only the Search Service — no other service is affected.

### From Phase 4

12. **Denormalization is the microservices answer to populate()** — In the monolith, `review.populate('author')` fetches the author's username from the User collection. In microservices, that would require an HTTP call per review on every read — a performance nightmare. Instead, we store `authorUsername` directly in the Review document at creation time. Trade-off: if a user changes their username, old reviews show the old name. Acceptable for most use cases.

13. **Soft-cancel vs hard-delete is a design choice per service** — When a listing is deleted, the Review Service **hard-deletes** reviews (they're meaningless without the listing). The Booking Service **soft-cancels** bookings and marks payments as refunded (preserves history for accounting and disputes). Different services, different cascade strategies.

14. **Date overlap detection must use the standard interval formula** — Two intervals `[A, B)` and `[C, D)` overlap if and only if `A < D AND C < B`. This is the canonical algorithm used in every booking system. The key insight: query only `pending`/`confirmed` bookings — cancelled bookings should not block new reservations.

---

## Contributing

This project is a learning exercise in microservices architecture. Contributions and feedback are welcome!

## License

ISC

---

<p align="center">
  <strong>Heavenly Microservices</strong> — Built from scratch for learning, designed for scale.
</p>
