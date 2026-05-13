<div align="center">

# 🏨 Heavenly

**Property Rental Platform with Microservices Architecture**

*A distributed property rental platform with an Express/EJS BFF, API Gateway, service-oriented backend, event-driven workflows, and Docker Compose local orchestration.*

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

[Overview](#-overview) • [Architecture](#-architecture) • [Services](#-services) • [Quick Start](#-quick-start) • [Features](#-features) • [Documentation](#-documentation)

</div>

---

## 📋 Overview

Heavenly is a full-featured property rental platform built from multiple Node.js/Express services. Users interact with a server-rendered BFF, while API traffic flows through a Gateway into dedicated services for authentication, listings, reviews, bookings, media, search, and admin operations.

### 🎯 Key Highlights

- **7 backend service packages** plus an **API Gateway** and **Backend-for-Frontend**
- **Server-rendered UI** using Express, EJS, and `ejs-mate`
- **Event-driven workflows** using RabbitMQ and shared event helpers
- **MongoDB-backed persistence** through Mongoose models
- **Redis-backed support** for cache/token-blacklist flows where implemented
- **Razorpay payment integration** with simulation fallback when credentials are absent
- **Cloudinary media upload/delete** through the media service
- **Admin dashboard** for cross-service management workflows
- **Docker Compose stack** for local development
- **Operational scripts** for seed, migration, smoke test, backup, and restore

---

## 🏗️ Architecture

Heavenly uses a service-oriented architecture with a browser-facing BFF, a REST API Gateway, dedicated backend services, shared utilities, MongoDB, Redis, and RabbitMQ.

```mermaid
graph TD
    User["👤 User"] --> BFF["BFF: Express + EJS"]
    BFF --> Gateway["API Gateway"]

    Gateway --> Auth["Auth Service"]
    Gateway --> Listing["Listing Service"]
    Gateway --> Review["Review Service"]
    Gateway --> Booking["Booking Service"]
    Gateway --> Media["Media Service"]
    Gateway --> Search["Search Service"]
    Gateway --> Admin["Admin Service"]

    Auth --> MongoDB[("MongoDB")]
    Listing --> MongoDB
    Review --> MongoDB
    Booking --> MongoDB

    Auth --> Redis["Redis"]
    Search --> Redis

    Auth --> RabbitMQ["RabbitMQ"]
    Listing --> RabbitMQ
    Review --> RabbitMQ
    Booking --> RabbitMQ
    Search --> RabbitMQ

    Media --> Cloudinary["Cloudinary"]
    Booking --> Razorpay["Razorpay"]
```

👉 **For the evidence-backed deep dive, read the [Architecture Guide](docs/02_ARCHITECTURE.md).**

---

## 📦 Services

### Infrastructure Services

| Service | Port | Purpose |
|---------|------|---------|
| **MongoDB** | `27017` | Document database for service data |
| **Redis** | `6379` | Cache and token-blacklist support |
| **RabbitMQ** | `5672`, `15672` | Message broker and management UI |

### Application Services

| Service | Port | Responsibility |
|---------|------|----------------|
| **BFF** | `8080` | EJS rendering, browser sessions, user-facing routes |
| **API Gateway** | `3000` | Request routing, JWT validation, rate limiting |
| **Auth Service** | `3001` | User identity, authentication, JWT lifecycle |
| **Listing Service** | `3002` | Property CRUD, availability, ownership |
| **Review Service** | `3003` | Ratings, reviews, review statistics |
| **Booking Service** | `3004` | Reservations, payments, cancellation, refunds |
| **Media Service** | `3005` | Image uploads and deletes through Cloudinary |
| **Search Service** | `3006` | Listing search and geocoding |
| **Admin Service** | `3007` | Cross-service admin aggregation |

---

## ⚡ Quick Start

### Prerequisites

- **Docker** and **Docker Compose**
- **Node.js 20+** for local package scripts
- **Make** for convenience commands
- **Cloudinary credentials** for real media uploads
- **Razorpay credentials** for real payment processing

### Installation

```bash
# Clone the repository
git clone https://github.com/rudra1806/Heavenly.git
cd Heavenly

# Create local environment file
cp .env.example .env

# Start the full stack
make up-build
```

Equivalent Docker Compose command:

```bash
docker-compose up --build
```

### Configuration

Create `.env` from `.env.example` and fill in the values needed for your local run:

```env
# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_random
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here_different_from_above

# Session (BFF)
SESSION_SECRET=your_session_secret_here

# Cloudinary (Media Service)
CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

# RabbitMQ
RABBITMQ_USER=heavenly
RABBITMQ_PASS=heavenly123

# Admin Seed (optional)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@heavenly.com
ADMIN_PASSWORD=admin123

# Razorpay (Booking Service)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

Razorpay credentials are optional for local testing. When they are absent, booking payment flows use simulation mode.

### Seed Data

```bash
# Seed admin user and sample microservice data
make seed
```

Equivalent direct command:

```bash
cd scripts && node seed-microservices.js
```

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **BFF** | http://localhost:8080 | Main browser application |
| **API Gateway** | http://localhost:3000 | REST API entry point |
| **RabbitMQ Management** | http://localhost:15672 | Broker management UI |

---

## ✨ Features

### 🏠 Property Management

- Listing browse/detail flows
- Owner-aware listing create, update, and delete workflows
- Image upload support through media handling
- Availability and listing metadata management
- Map rendering with MapLibre GL JS and OpenStreetMap tiles

### 📅 Booking System

- Booking creation and lookup
- Date validation and overlap checks
- Payment order and verification flows
- Razorpay-backed payment path with simulation fallback
- Cancellation and refund handling
- Booking and payment status tracking

### ⭐ Reviews & Ratings

- Star ratings and review text
- Review lookup and listing-level statistics
- Author-aware delete behavior

### 👤 Authentication & Authorization

- JWT access and refresh token utilities
- Password hashing with bcrypt
- Redis-backed token blacklist on logout where Redis is available
- BFF session management
- Admin-only route protection

### 👑 Admin Dashboard

- Platform statistics
- User, listing, review, and booking management views
- Cross-service aggregation through the admin service

### 🔍 Search & Discovery

- Listing search endpoints
- Geocoding support
- Redis-backed geocoding cache
- Cluster and listing maps in the BFF

---

## 🛠️ Development Commands

The project includes a Makefile for common local operations:

```bash
# Start all services
make up              # Foreground mode
make up-d            # Background mode
make up-build        # Rebuild and start

# Stop services
make down            # Stop all services, keep volumes
make clean           # Stop and delete volumes after confirmation

# View logs
make logs            # All services
make logs-bff        # BFF only
make logs-booking    # Booking service only

# Restart services
make restart         # All services
make restart-bff     # BFF only
make restart-auth    # Auth service only

# Data operations
make seed            # Seed initial data
make backup          # Backup MongoDB data
make restore BACKUP=./backups/20260511_143000

# Utilities
make ps              # Show running containers
make status          # Service status and volumes
make mongo           # Open MongoDB shell
make redis           # Open Redis CLI
```

👉 **See the full [Scripts Reference](docs/13_SCRIPTS_REFERENCE.md) for every package script, Makefile target, and utility script.**

---

## 📁 Project Structure

```text
Heavenly/
├── docker-compose.yml           # Local multi-container stack
├── docker-compose.prod.yml      # Production Compose variant
├── .env.example                 # Environment variable template
├── Makefile                     # Development commands
├── README.md                    # Project entry point
├── docs/                        # Generated project documentation
│   ├── INDEX.md
│   ├── 00_PHASE0_RECONNAISSANCE.md
│   └── 01_PROJECT_OVERVIEW.md ... 15_IMPROVEMENTS.md
│
├── shared/                      # Shared middleware, events, errors, utilities
├── gateway/                     # API Gateway (:3000)
├── bff/                         # Backend-for-Frontend (:8080)
├── services/                    # Backend service packages
│   ├── auth-service/
│   ├── listing-service/
│   ├── review-service/
│   ├── booking-service/
│   ├── media-service/
│   ├── search-service/
│   └── admin-service/
│
└── scripts/                     # Seed, migration, smoke-test, backup, restore
```

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Runtime** | Node.js 20 | Service runtime |
| **Framework** | Express.js 5.2 | HTTP servers, routes, middleware |
| **Frontend Rendering** | EJS + ejs-mate | Server-rendered browser UI |
| **Database** | MongoDB 7 | Service data persistence |
| **ODM** | Mongoose | MongoDB models and queries |
| **Message Broker** | RabbitMQ 3 | Event-driven async communication |
| **Cache** | Redis 7 | Cache and token blacklist support |
| **Authentication** | JWT + bcrypt | Token auth and password hashing |
| **Validation** | Joi | Request validation in supported services |
| **File Uploads** | multer | Multipart upload handling |
| **Media Storage** | Cloudinary | Image storage and deletion |
| **Payment Gateway** | Razorpay | Payment order, verification, refund flows |
| **Geocoding** | Nominatim / OpenStreetMap | Address-to-coordinate lookup |
| **Maps** | MapLibre GL JS | Browser map rendering |
| **Orchestration** | Docker Compose | Local multi-service environment |

---

## 🔄 Communication Patterns

Heavenly uses synchronous REST calls for request/response workflows and RabbitMQ for asynchronous service coordination. The Gateway handles external API routing, while the BFF uses the Gateway as its backend API surface.

👉 **See [Architecture Deep Dive](docs/02_ARCHITECTURE.md) and [Backend Services](docs/04b_BACKEND_SERVICES.md) for service flow details.**

---

## 🔐 Security Notes

- **JWT authentication** is implemented through the Auth Service, Gateway validation, and shared middleware.
- **Password hashing** uses bcrypt in the Auth Service user model.
- **Rate limiting** is applied in the Gateway.
- **CORS** is configured in the Gateway and service entry points.
- **Input validation** uses Joi in supported route layers.
- **Payment verification** uses Razorpay signature verification when Razorpay is enabled.

👉 **For gaps and evidence, see the [Security Analysis](docs/09_SECURITY.md).**

---

## 🧪 Verification

### Smoke Test

Run the confirmed smoke test after the stack is running:

```bash
cd scripts && npm run smoke-test
```

The repository does not currently include a formal unit/integration test suite. The smoke script is the confirmed verification path.

### Manual API Checks

```bash
# Gateway health
curl http://localhost:3000/health

# BFF health
curl http://localhost:8080/health

# Public listings through Gateway
curl http://localhost:3000/api/listings
```

---

## 📊 Observability

### Health Checks

The Gateway, BFF, and services expose `/health` endpoints.

### RabbitMQ Management UI

Open http://localhost:15672 to inspect broker state.

### Docker Logs

```bash
# View all logs
docker-compose logs -f

# View a specific service
docker-compose logs -f auth-service

# View recent booking logs
docker-compose logs --tail=100 booking-service
```

👉 **For current logging, health-check, and observability gaps, see [Observability](docs/10_OBSERVABILITY.md).**

---

## 🚀 Deployment

The repository includes Dockerfiles for the BFF, Gateway, and service packages, plus `docker-compose.yml` and `docker-compose.prod.yml`.

No Kubernetes, Helm, Terraform, Pulumi, or CI/CD configuration was found during repository reconnaissance.

👉 **See [DevOps & Infrastructure](docs/07_DEVOPS_INFRASTRUCTURE.md) for the verified infrastructure inventory.**

---

## 📚 Documentation

The generated docs are kept in [`docs/`](docs/):

| Topic | File |
|-------|------|
| Documentation Index | [docs/INDEX.md](docs/INDEX.md) |
| Reconnaissance | [docs/00_PHASE0_RECONNAISSANCE.md](docs/00_PHASE0_RECONNAISSANCE.md) |
| Project Overview | [docs/01_PROJECT_OVERVIEW.md](docs/01_PROJECT_OVERVIEW.md) |
| Architecture | [docs/02_ARCHITECTURE.md](docs/02_ARCHITECTURE.md) |
| Folder Structure | [docs/03_FOLDER_STRUCTURE.md](docs/03_FOLDER_STRUCTURE.md) |
| Backend Routes | [docs/04a_BACKEND_ROUTES.md](docs/04a_BACKEND_ROUTES.md) |
| Backend Services | [docs/04b_BACKEND_SERVICES.md](docs/04b_BACKEND_SERVICES.md) |
| Frontend | [docs/05_FRONTEND.md](docs/05_FRONTEND.md) |
| Database | [docs/06_DATABASE.md](docs/06_DATABASE.md) |
| DevOps | [docs/07_DEVOPS_INFRASTRUCTURE.md](docs/07_DEVOPS_INFRASTRUCTURE.md) |
| Environment Variables | [docs/08_ENVIRONMENT_VARIABLES.md](docs/08_ENVIRONMENT_VARIABLES.md) |
| Security | [docs/09_SECURITY.md](docs/09_SECURITY.md) |
| Observability | [docs/10_OBSERVABILITY.md](docs/10_OBSERVABILITY.md) |
| Dependencies | [docs/11_DEPENDENCIES.md](docs/11_DEPENDENCIES.md) |
| Setup Guide | [docs/12_SETUP_GUIDE.md](docs/12_SETUP_GUIDE.md) |
| Scripts Reference | [docs/13_SCRIPTS_REFERENCE.md](docs/13_SCRIPTS_REFERENCE.md) |
| Troubleshooting | [docs/14_TROUBLESHOOTING.md](docs/14_TROUBLESHOOTING.md) |
| Improvements | [docs/15_IMPROVEMENTS.md](docs/15_IMPROVEMENTS.md) |

---

## 🔧 Troubleshooting

### Services Won't Start

```bash
make down
make up-build
```

### Database Connection Issues

```bash
make mongo
# In mongosh:
db.adminCommand('ping')
```

### Port Conflicts

```bash
lsof -i :3000
lsof -i :8080
```

### Service Crashes

```bash
docker-compose logs --tail=100 <service-name>
docker-compose restart <service-name>
```

👉 **See [Troubleshooting](docs/14_TROUBLESHOOTING.md) for the project-specific troubleshooting guide.**

---

## 📄 License

No root `LICENSE` file is currently present in this repository.

---

## 👤 Author

**Rudra Sanandiya**

- GitHub: [@rudra1806](https://github.com/rudra1806)
- Project: [Heavenly](https://github.com/rudra1806/Heavenly)

---

<div align="center">

**Built with ❤️ using Node.js, Express, MongoDB, RabbitMQ, Redis, and Docker Compose**

[⬆ Back to Top](#-heavenly)

</div>
