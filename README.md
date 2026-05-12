<div align="center">

# 🏨 Heavenly

**Property Rental Platform with Microservices Architecture**

*A distributed property rental platform built with microservices, event-driven architecture, and modern design patterns*

[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

[Architecture](#-architecture) • [Services](#-services) • [Quick Start](#-quick-start) • [Features](#-features) • [Documentation](#-documentation)

</div>

---

## 📋 Overview

Heavenly is a full-featured property rental platform built with microservices architecture. It demonstrates distributed systems patterns including service decomposition, event-driven communication, API gateway pattern, and database-per-service architecture.

### 🎯 Key Highlights

- **8 Independent Microservices** with their own databases
- **Event-Driven Architecture** using RabbitMQ for async communication
- **API Gateway** with JWT validation and rate limiting
- **Backend-for-Frontend (BFF)** pattern for optimal client experience
- **Distributed Caching** with Redis for performance
- **Razorpay Payment Integration** with automatic fallback to simulation mode
- **Complete Booking System** with date validation and overlap detection
- **Admin Dashboard** for platform management
- **Docker Compose** for easy local development
- **Production-Ready** with health checks and graceful shutdown

---

## 🏗️ Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP/HTML
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BFF Service (:8080)                               │
│         Express + EJS Templates + Session Management                 │
│         Renders HTML, translates session → JWT for API calls         │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP/JSON + JWT
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API Gateway (:3000)                              │
│         JWT Validation · Rate Limiting · Request Routing             │
│              Centralized entry point for all services                │
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
              │   Event Bus (Async)    │
              │   Topic Exchange       │
              └────────────────────────┘
```

---

## 📦 Services

### Infrastructure Services

| Service | Port | Purpose |
|---------|------|---------|
| **MongoDB** | 27017 | Document database (per-service DBs) |
| **Redis** | 6379 | Caching & JWT blacklist |
| **RabbitMQ** | 5672, 15672 | Message broker + Management UI |

### Core Microservices

| Service | Port | Database | Responsibility |
|---------|------|----------|----------------|
| **API Gateway** | 3000 | — | Request routing, JWT validation, rate limiting |
| **Auth Service** | 3001 | `heavenly_auth` | User identity, authentication, JWT lifecycle |
| **Listing Service** | 3002 | `heavenly_listings` | Property CRUD, availability, ownership |
| **Review Service** | 3003 | `heavenly_reviews` | Ratings & reviews for listings |
| **Booking Service** | 3004 | `heavenly_bookings` | Reservations, Razorpay payments, date validation |
| **Media Service** | 3005 | — | Image uploads via Cloudinary |
| **Search Service** | 3006 | — | Full-text search, geocoding (Redis cached) |
| **Admin Service** | 3007 | — | Cross-service aggregation, admin operations |
| **BFF** | 8080 | — | EJS rendering, session management |

---

## ⚡ Quick Start

### Prerequisites

- **Docker** 20+ and **Docker Compose** 2+
- **Node.js** 20+ (for local development)
- **Cloudinary Account** (free tier works)
- **Razorpay Account** (optional, for real payments - free test mode available)

### Installation

```bash
# Clone the repository
git clone https://github.com/rudra1806/Heavenly.git
cd Heavenly

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials (see Configuration section)

# Start all services
make up-build

# Or using docker-compose directly
docker-compose up --build
```

### Configuration

Create a `.env` file in the root directory:

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

# Razorpay (Booking Service) - Optional
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# Admin Seed (optional)
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@heavenly.com
ADMIN_PASSWORD=admin123
```

**Note:** Razorpay credentials are optional. Without them, the system uses simulation mode for testing.

### Seeding Data

```bash
# Seed admin user + 30 sample listings
make seed

# Or manually
cd scripts && node seed-microservices.js
```

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **BFF (Frontend)** | http://localhost:8080 | Main application |
| **API Gateway** | http://localhost:3000 | REST API entry point |
| **RabbitMQ Management** | http://localhost:15672 | Message broker UI (heavenly/heavenly123) |

---

## ✨ Features

### 🏠 Property Management
- Full CRUD with owner-only edit/delete
- Cloud image upload via Cloudinary
- Auto-cleanup of old images on update/delete
- Automatic geocoding via Nominatim (OpenStreetMap)
- Interactive maps with MapLibre GL JS
- Property availability toggle

### 📅 Booking System
- Date validation with overlap detection
- Guest count validation
- Real-time price calculation
- **Razorpay Payment Integration** with order creation and signature verification
- **Automatic Refunds** on booking cancellation
- **Dual Mode**: Real payments or simulation mode
- Booking status tracking (pending, confirmed, completed, cancelled)
- Payment status tracking (pending, completed, refunded, failed)

### ⭐ Reviews & Ratings
- 1-5 star ratings
- Author tracking with timestamps
- Author-only delete permissions
- Review statistics per listing

### 👤 Authentication & Authorization
- JWT-based authentication (access + refresh tokens)
- Role-based access control (user vs admin)
- Redis-backed token blacklist for logout
- Session management in BFF
- Smart redirects after authentication

### 👑 Admin Dashboard
- Platform-wide statistics
- User management with search
- Listing management
- Review management
- Booking management with revenue tracking
- Cascade delete operations

### 🔍 Search & Discovery
- Full-text search across listings
- Price range filtering
- Geocoding with Redis caching
- Interactive cluster maps

---

## 🛠️ Development Commands

The project includes a comprehensive Makefile for common operations:

```bash
# Start all services
make up              # Foreground mode
make up-d            # Background (detached) mode
make up-build        # Rebuild and start

# Stop services
make down            # Stop all (keeps data)
make clean           # ⚠️ Stop and delete all data

# View logs
make logs            # All services
make logs-bff        # BFF only
make logs-booking    # Booking service only

# Restart services
make restart         # All services
make restart-bff     # BFF only
make restart-auth    # Auth service only

# Database operations
make seed            # Seed initial data
make backup          # Backup MongoDB data
make restore BACKUP=./backups/20260511_143000  # Restore from backup

# Utilities
make ps              # Show running containers
make status          # Service status + volumes
make mongo           # Connect to MongoDB shell
make redis           # Connect to Redis CLI
```

---

## 📁 Project Structure

```
Heavenly/
├── docker-compose.yml           # 🐳 Orchestrates 12 containers
├── docker-compose.prod.yml      # 🚀 Production configuration
├── .env.example                 # 🔐 Environment variables template
├── Makefile                     # 🛠️ Development commands
├── .dockerignore                # Docker ignore patterns
├── .gitignore                   # Git ignore patterns
│
├── shared/                      # 📦 Shared NPM Package
│   ├── middleware/              # JWT verification
│   ├── errors/                  # Error classes
│   ├── events/                  # RabbitMQ client & event names
│   └── utils/                   # HTTP client for inter-service calls
│
├── gateway/                     # 🚪 API Gateway (:3000)
│   └── src/
│       ├── index.js
│       ├── proxy.js
│       └── middleware/
│
├── services/
│   ├── auth-service/            # 🔐 User Identity (:3001)
│   ├── listing-service/         # 🏠 Property Management (:3002)
│   ├── review-service/          # ⭐ Ratings & Reviews (:3003)
│   ├── booking-service/         # 📅 Reservations (:3004)
│   ├── media-service/           # 📸 Image Uploads (:3005)
│   ├── search-service/          # 🔍 Search & Geocoding (:3006)
│   └── admin-service/           # 👑 Admin Aggregator (:3007)
│
├── bff/                         # 🖥️ Backend-for-Frontend (:8080)
│   └── src/
│       ├── routes/              # 7 route modules
│       ├── views/               # 30+ EJS templates
│       ├── public/              # Static assets (CSS, JS)
│       └── utils/               # API client & caching
│
└── scripts/                     # 🔧 Utilities
    ├── seed-microservices.js
    ├── migrate.js
    ├── smoke-test.js
    └── backup/restore scripts
```

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Runtime** | Node.js 20 (Alpine) | Lightweight container runtime |
| **Framework** | Express.js 5.2 | HTTP server for all services |
| **Database** | MongoDB 7 | Per-service document storage |
| **Message Broker** | RabbitMQ 3 | Event-driven async communication |
| **Cache** | Redis 7 | JWT blacklist, geocoding cache |
| **Authentication** | JWT + bcrypt | Stateless token-based auth |
| **Validation** | Joi 18 | Request schema validation |
| **File Storage** | Cloudinary | Image CDN and storage |
| **Payment Gateway** | Razorpay 2.9 | Payment processing |
| **Geocoding** | Nominatim (OSM) | Free address-to-coordinates API |
| **Orchestration** | Docker Compose | Multi-container development |
| **Templating** | EJS + ejs-mate 4 | Server-side HTML rendering |

---

## 🔄 Communication Patterns

### Synchronous (HTTP/REST)
- BFF → API Gateway → Services
- Inter-service calls for immediate responses
- Used for: Authentication, data fetching, validation

### Asynchronous (RabbitMQ Events)
- Event-driven cascade operations
- Eventual consistency model
- Used for: User deletion, listing deletion, notifications

### Event Catalog

| Event | Publisher | Consumers | Purpose |
|-------|-----------|-----------|---------|
| `user.deleted` | Auth Service | Listing, Review, Booking | Cascade delete user data |
| `listing.created` | Listing Service | Search | Add to search index |
| `listing.updated` | Listing Service | Search | Update search index |
| `listing.deleted` | Listing Service | Review, Booking, Search | Cascade delete + remove from index |
| `booking.created` | Booking Service | — | Future: Notification service |
| `booking.payment.completed` | Booking Service | — | Future: Analytics service |

---

## 🔐 Security Features

- **JWT Authentication**: Access tokens (15min) + Refresh tokens (7d)
- **Token Blacklist**: Redis-backed logout mechanism
- **Rate Limiting**: 500 req/15min per user, 20 req/15min for auth
- **Role-Based Access**: User vs Admin permissions
- **Password Hashing**: bcrypt with 12 salt rounds
- **Input Validation**: Joi schemas on all endpoints
- **CORS Protection**: Configured for production
- **Secure Payment**: Razorpay signature verification

---

## 🧪 Testing

### Smoke Test

Run end-to-end health checks:

```bash
cd scripts
node smoke-test.js
```

### Manual API Testing

```bash
# Test API Gateway
curl http://localhost:3000/health

# Test Auth Service
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Test Listing Service
curl http://localhost:3000/api/listings
```

---

## 📊 Monitoring

### Health Checks

All services expose `/health` endpoints for monitoring.

### RabbitMQ Management UI

Access at http://localhost:15672 (heavenly/heavenly123) to monitor:
- Message rates
- Queue depths
- Consumer status
- Exchange bindings

### Docker Logs

```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f auth-service

# View last 100 lines
docker-compose logs --tail=100 booking-service
```

---

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**: Use secrets management (AWS Secrets Manager, HashiCorp Vault)
2. **Database**: Use managed MongoDB (MongoDB Atlas, AWS DocumentDB)
3. **Message Broker**: Use managed RabbitMQ (CloudAMQP, AWS MQ)
4. **Cache**: Use managed Redis (AWS ElastiCache, Redis Cloud)
5. **Container Orchestration**: Kubernetes or AWS ECS
6. **Load Balancing**: AWS ALB, NGINX, or Traefik
7. **Monitoring**: Prometheus + Grafana, Datadog, or New Relic
8. **Logging**: ELK Stack, Splunk, or CloudWatch

### Docker Compose Production

```bash
# Use production compose file
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Scale specific services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale listing-service=3
```

---

## 📚 Documentation

For detailed documentation on each service, architecture decisions, and implementation details, see:

- [Architecture Guide](./ARCHITECTURE.md) - Complete technical documentation

---

## 🔧 Troubleshooting

### Common Issues

**Services won't start**:
```bash
# Clean up and rebuild
make clean
make up-build
```

**Database connection errors**:
```bash
# Check MongoDB health
make mongo
# In mongo shell: db.adminCommand('ping')
```

**Port conflicts**:
```bash
# Check what's using a port
lsof -i :3000

# Kill process
kill -9 <PID>
```

**Service crashes**:
```bash
# View logs
docker-compose logs --tail=100 <service-name>

# Restart specific service
make restart-<service-name>
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Open a Pull Request

### Contribution Guidelines

- Follow existing code structure and naming conventions
- Add health checks to new services
- Document API endpoints
- Add event names to `shared/events/eventNames.js`
- Update docker-compose.yml for new services
- Add Makefile commands for common operations

---

## 📄 License

This project is licensed under the ISC License.

---

## 👤 Author

**Rudra Sanandiya**

- GitHub: [@rudra1806](https://github.com/rudra1806)
- Project: [Heavenly](https://github.com/rudra1806/Heavenly)

---

## 🙏 Acknowledgments

- **Inspiration**: Airbnb and Booking.com architecture patterns
- **Technologies**: Express.js, MongoDB, RabbitMQ, Redis, and Docker communities
- **Payment Processing**: Razorpay for seamless payment integration

---

<div align="center">

**Built with ❤️ using microservices architecture**

[⬆ Back to Top](#-heavenly)

</div>
