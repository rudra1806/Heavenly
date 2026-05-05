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
│   ├── auth-service/                # 🔐 Port 3001 — User identity & JWT
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.js             # (stub — Phase 2)
│   │       ├── models/
│   │       ├── controllers/
│   │       ├── routes/
│   │       └── ...
│   │
│   ├── listing-service/             # 🏠 Port 3002 — Property CRUD
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/index.js             # (stub — Phase 3)
│   │
│   ├── review-service/              # ⭐ Port 3003 — Ratings & reviews
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/index.js             # (stub — Phase 4)
│   │
│   ├── booking-service/             # 📅 Port 3004 — Reservations & payments
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/index.js             # (stub — Phase 4)
│   │
│   ├── media-service/               # 📸 Port 3005 — Cloudinary uploads
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/index.js             # (stub — Phase 2)
│   │
│   ├── search-service/              # 🔍 Port 3006 — Search & geocoding
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/index.js             # (stub — Phase 3)
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

### 2. Auth Service (Port 3001)

**Owns**: User identity, registration, authentication, JWT token lifecycle

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/register` | POST | Public | Create new user account |
| `/auth/login` | POST | Public | Authenticate and receive JWT tokens |
| `/auth/logout` | POST | Required | Invalidate refresh token |
| `/auth/refresh` | POST | Public | Exchange refresh token for new access token |
| `/auth/me` | GET | Required | Get current user profile |
| `/auth/users/:id` | GET | Internal | Fetch user info (used by other services) |

**Migration from Monolith:**
- Replaces `passport-local-mongoose` with **bcrypt** for password hashing
- Replaces session-based auth with **JWT** (access token: 15min, refresh token: 7 days)
- Redis stores a JWT blacklist for logout functionality
- Publishes `user.registered` and `user.deleted` events via RabbitMQ

---

### 3. Listing Service (Port 3002)

**Owns**: Property CRUD, availability status, ownership verification

**Migration from Monolith:**
- `reviews[]` array **removed** from the Listing model — reviews are owned by the Review Service
- `owner` field stores `ownerId` as a plain string (no cross-DB Mongoose populate)
- Image uploads delegated to Media Service via HTTP call
- Geocoding delegated to Search Service via HTTP call
- Publishes `listing.created`, `listing.updated`, `listing.deleted` events
- Consumes `user.deleted` → cascade deletes user's listings

---

### 4. Review Service (Port 3003)

**Owns**: Reviews with `listingId` and `authorId` as string references

**Migration from Monolith:**
- Reviews are no longer embedded in the Listing document
- Queried via `GET /reviews?listingId=X` instead of Mongoose populate
- Consumes `listing.deleted` and `user.deleted` for cascade cleanup

---

### 5. Booking Service (Port 3004)

**Owns**: Reservations, payment simulation, date overlap detection

**Migration from Monolith:**
- Calls Listing Service via HTTP to validate listing exists, check availability, and get price
- Overlap detection queries only the Booking Service's own database
- Simulated payment stays here (real Razorpay/Stripe integration planned post-migration)
- Consumes `listing.deleted` and `user.deleted` for cascade cleanup

---

### 6. Media Service (Port 3005)

**Owns**: All Cloudinary interactions

**Why separated?**
- Centralizes cloud storage credentials
- Enables swapping storage providers (S3, Azure Blob) without touching business services
- Other services just receive and store URLs

---

### 7. Search & Geocoding Service (Port 3006)

**Owns**: Full-text listing search, address geocoding

- **Geocoding**: Calls Nominatim API, caches results in Redis (respects 1 req/sec rate limit)
- **Search**: Maintains a local index of listings, updated via RabbitMQ events
- Consumes `listing.created`, `listing.updated`, `listing.deleted` to keep the index fresh

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

### ✅ Phase 1 — Foundation (Complete)

| Component | Status | Files |
|-----------|--------|-------|
| Docker Compose | ✅ Done | `docker-compose.yml` — 12 containers with health checks |
| Shared Package | ✅ Done | JWT middleware, RabbitMQ broker, AppError, serviceClient |
| API Gateway | ✅ Done | Proxy routing, JWT validation, rate limiting, error handling |
| Dockerfiles | ✅ Done | All 9 service/gateway/bff Dockerfiles |
| Service Scaffolds | ✅ Done | `package.json` + stub `index.js` for all services |

### ⏳ Phase 2 — Auth + Media Services (Next)

- [ ] Auth Service: User model with bcrypt, JWT issuance, register/login/logout/refresh
- [ ] Media Service: Cloudinary upload/delete endpoints
- [ ] Redis JWT blacklist integration

### 📋 Phase 3 — Listing + Search Services

- [ ] Listing Service: Full CRUD, ownership auth, availability toggle
- [ ] Search & Geo Service: Geocoding with Redis cache, search index
- [ ] RabbitMQ event publishing for listing lifecycle

### 📋 Phase 4 — Review + Booking Services

- [ ] Review Service: Create, delete, query by listing/author, event consumers
- [ ] Booking Service: Reservation flow, overlap detection, simulated payment

### 📋 Phase 5 — Admin/Dashboard Aggregator

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

> 🔧 *This section will be populated as the migration progresses.*

### From Phase 1

1. **Monorepo shared packages require careful dependency management** — The `@heavenly/shared` package must be available to all services both locally (via `../shared`) and in Docker (via `COPY`). The Dockerfile pattern of copying shared first, then service code, enables efficient layer caching.

2. **Docker Compose health checks are essential** — Without them, services would start before MongoDB/Redis/RabbitMQ are ready, causing connection failures. The `depends_on: condition: service_healthy` pattern ensures correct startup ordering.

3. **The Gateway should be thin** — It's tempting to add business logic to the Gateway (validation, data transformation). Resist this. The Gateway should only handle routing, auth, and rate limiting. Business logic belongs in services.

---

## Contributing

This project is a learning exercise in microservices architecture. Contributions and feedback are welcome!

## License

ISC

---

<p align="center">
  <strong>Heavenly Microservices</strong> — Built from scratch for learning, designed for scale.
</p>
