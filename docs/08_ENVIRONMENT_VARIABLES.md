SECTION: Environment Variables
FILE: 08_ENVIRONMENT_VARIABLES.md
COVERS:
- Variables found in `.env.example`.
- Variables found in `process.env.*` references across source and scripts.
- Variables defined in `docker-compose.yml` and `docker-compose.prod.yml` environment blocks.
- Required vs optional status based on whether the code has a fallback or explicit runtime failure path.
SKIPS:
- CI/CD environment variables skipped because no CI/CD config was found in Phase 0.
- Kubernetes, Helm, and cloud infrastructure variables skipped because no corresponding infrastructure config was found.
- Invented deployment variables skipped because they do not appear in `.env.example`, source code, scripts, or Compose files.

## Section 8 — Environment Variables

### 8.1 — Environment Variable Inventory

#### Authentication And Session

| Variable | Required | Default | Example Value | Purpose | Security Note | Evidence |
|---|---|---|---|---|---|---|
| `JWT_SECRET` | Optional | — | `replace-with-long-random-access-token-secret` | Signs/verifies access tokens in auth, gateway, shared middleware, and protected services. Missing value causes auth middleware to return a server auth configuration error and token signing to fail when used. | Sensitive secret; do not commit real value. | `.env.example`, `services/auth-service/src/utils/jwt.js`, `shared/middleware/authMiddleware.js`, `gateway/src/middleware/jwtValidation.js`, `docker-compose.yml` |
| `JWT_REFRESH_SECRET` | Optional | — | `replace-with-different-refresh-token-secret` | Signs/verifies refresh tokens in Auth Service. Missing value breaks refresh-token generation/verification when that path is used. | Sensitive secret; use a different value from `JWT_SECRET`. | `.env.example`, `services/auth-service/src/utils/jwt.js`, `docker-compose.yml` |
| `SESSION_SECRET` | Optional | `heavenly-bff-session-secret` | `replace-with-long-random-session-secret` | Signs BFF Express sessions. Compose passes this from the host environment. | Sensitive secret; source has a hardcoded fallback for local non-Compose runs. | `.env.example`, `bff/src/index.js`, `docker-compose.yml` |
| `CORS_ORIGIN` | Optional | `*` | `https://heavenly.example.com` | Configures Gateway CORS origin. | — | `gateway/src/index.js` |

#### Runtime And Ports

| Variable | Required | Default | Example Value | Purpose | Security Note | Evidence |
|---|---|---|---|---|---|---|
| `NODE_ENV` | Optional | `development` in Gateway logging/error behavior; Compose sets `development` or `production` | `production` | Controls environment-specific logging/error output and is set for every app service in Compose. | — | `gateway/src/index.js`, `gateway/src/middleware/errorHandler.js`, `docker-compose.yml`, `docker-compose.prod.yml` |
| `PORT` | Optional | Service-specific defaults: Gateway `3000`, Auth `3001`, Listing `3002`, Review `3003`, Booking `3004`, Media `3005`, Search `3006`, Admin `3007`, BFF `8080` | `3000` | Sets the HTTP port for each Node process. | — | `gateway/src/index.js`, `bff/src/index.js`, `services/*/src/index.js`, `docker-compose.yml` |

#### Database And Migration

| Variable | Required | Default | Example Value | Purpose | Security Note | Evidence |
|---|---|---|---|---|---|---|
| `MONGO_URL` | Optional | Service-specific localhost MongoDB URLs | `mongodb://mongodb:27017/heavenly_auth` | Primary MongoDB connection URL for Auth, Listing, Review, and Booking services. | — | `services/auth-service/src/index.js`, `services/listing-service/src/index.js`, `services/review-service/src/index.js`, `services/booking-service/src/index.js`, `docker-compose.yml` |
| `AUTH_MONGO_URL` | Optional | `mongodb://localhost:27017/heavenly_auth` in seed script; `mongodb://127.0.0.1:27017/heavenly-auth` in migration script | `mongodb://localhost:27017/heavenly_auth` | Auth database URL for seed and monolith migration scripts. | — | `scripts/seed-microservices.js`, `scripts/migrate.js` |
| `LISTING_MONGO_URL` | Optional | `mongodb://localhost:27017/heavenly_listings` in seed script; `mongodb://127.0.0.1:27017/heavenly-listings` in migration script | `mongodb://localhost:27017/heavenly_listings` | Listing database URL for seed and monolith migration scripts. | — | `scripts/seed-microservices.js`, `scripts/migrate.js` |
| `REVIEW_MONGO_URL` | Optional | `mongodb://localhost:27017/heavenly_reviews` in seed script; `mongodb://127.0.0.1:27017/heavenly-reviews` in migration script | `mongodb://localhost:27017/heavenly_reviews` | Review database URL for seed and monolith migration scripts. | — | `scripts/seed-microservices.js`, `scripts/migrate.js` |
| `BOOKING_MONGO_URL` | Optional | `mongodb://localhost:27017/heavenly_bookings` in seed script; `mongodb://127.0.0.1:27017/heavenly-bookings` in migration script | `mongodb://localhost:27017/heavenly_bookings` | Booking database URL for seed and monolith migration scripts. | — | `scripts/seed-microservices.js`, `scripts/migrate.js` |
| `SEARCH_MONGO_URL` | Optional | `mongodb://localhost:27017/heavenly_search` | `mongodb://localhost:27017/heavenly_search` | Search database URL used by the seed script. No Search Service Mongoose model was found in Phase 0. | — | `scripts/seed-microservices.js` |
| `MONOLITH_MONGO_URL` | Optional | `mongodb://127.0.0.1:27017/heavenly` | `mongodb://127.0.0.1:27017/heavenly` | Source MongoDB URL for the monolith-to-microservices migration script. | — | `scripts/migrate.js` |
| `BOOKING_DB_URL` | Optional | `mongodb://localhost:27017/heavenly_bookings` | `mongodb://localhost:27017/heavenly_bookings` | Booking DB URL for `scripts/update-booking-emails.js`. | — | `scripts/update-booking-emails.js` |
| `AUTH_DB_URL` | Optional | `mongodb://localhost:27017/heavenly_auth` | `mongodb://localhost:27017/heavenly_auth` | Auth DB URL for `scripts/update-booking-emails.js`. | — | `scripts/update-booking-emails.js` |
| `MONGODB_URI` | Optional | `mongodb://localhost:27017/heavenly_bookings` | `mongodb://localhost:27017/heavenly_bookings` | Booking DB URL for the platform-fee migration script. | — | `services/booking-service/scripts/migrate-platform-fee.js` |

#### Redis And RabbitMQ

| Variable | Required | Default | Example Value | Purpose | Security Note | Evidence |
|---|---|---|---|---|---|---|
| `REDIS_URL` | Optional | — | `redis://redis:6379` | Redis connection URL for Auth Service, Search Service, and Gateway when configured. Services skip Redis connection when absent. | — | `services/auth-service/src/index.js`, `services/search-service/src/index.js`, `docker-compose.yml` |
| `RABBITMQ_URL` | Optional | Seed script builds `amqp://heavenly:heavenly123@localhost:5672`; Compose builds `amqp://${RABBITMQ_USER:-heavenly}:${RABBITMQ_PASS:-heavenly123}@rabbitmq:5672` | `amqp://heavenly:heavenly123@rabbitmq:5672` | RabbitMQ connection URL for services and seed script. Services attempt RabbitMQ only when present. | Contains broker username/password when embedded in URL. | `services/auth-service/src/index.js`, `services/listing-service/src/index.js`, `services/review-service/src/index.js`, `services/booking-service/src/index.js`, `services/search-service/src/index.js`, `scripts/seed-microservices.js`, `docker-compose.yml` |
| `RABBITMQ_USER` | Optional | `heavenly` | `heavenly` | RabbitMQ username used to build RabbitMQ container credentials and service connection URLs. | — | `.env.example`, `scripts/seed-microservices.js`, `docker-compose.yml` |
| `RABBITMQ_PASS` | Optional | `heavenly123` | `replace-with-rabbitmq-password` | RabbitMQ password used to build RabbitMQ container credentials and service connection URLs. | Sensitive password; `.env.example` contains a development value. | `.env.example`, `scripts/seed-microservices.js`, `docker-compose.yml` |
| `RABBITMQ_DEFAULT_USER` | Optional | `${RABBITMQ_USER:-heavenly}` | `heavenly` | RabbitMQ container environment variable for default broker user. | — | `docker-compose.yml` |
| `RABBITMQ_DEFAULT_PASS` | Optional | `${RABBITMQ_PASS:-heavenly123}` | `replace-with-rabbitmq-password` | RabbitMQ container environment variable for default broker password. | Sensitive password; default resolves to development value when `RABBITMQ_PASS` is absent. | `docker-compose.yml` |

#### Internal Service URLs

| Variable | Required | Default | Example Value | Purpose | Security Note | Evidence |
|---|---|---|---|---|---|---|
| `GATEWAY_URL` | Optional | `http://localhost:3000` | `http://gateway:3000` | BFF target URL for API calls through the gateway. | — | `bff/src/index.js`, `bff/src/utils/apiClient.js`, `docker-compose.yml` |
| `AUTH_SERVICE_URL` | Optional | `http://localhost:3001` | `http://auth-service:3001` | Gateway/Admin target URL for Auth Service. | — | `gateway/src/proxy.js`, `services/admin-service/src/index.js`, `docker-compose.yml` |
| `LISTING_SERVICE_URL` | Optional | `http://localhost:3002` in Gateway/Admin/Search; empty string in Booking/Listing startup logs when absent | `http://listing-service:3002` | Internal URL for Listing Service calls. | — | `gateway/src/proxy.js`, `services/admin-service/src/index.js`, `services/search-service/src/index.js`, `services/booking-service/src/index.js`, `docker-compose.yml` |
| `REVIEW_SERVICE_URL` | Optional | `http://localhost:3003` | `http://review-service:3003` | Gateway/Admin target URL for Review Service. | — | `gateway/src/proxy.js`, `services/admin-service/src/index.js`, `docker-compose.yml` |
| `BOOKING_SERVICE_URL` | Optional | `http://localhost:3004` | `http://booking-service:3004` | Gateway/Admin target URL for Booking Service. | — | `gateway/src/proxy.js`, `services/admin-service/src/index.js`, `docker-compose.yml` |
| `MEDIA_SERVICE_URL` | Optional | `http://localhost:3005` in Gateway/proxy and listing consumer; empty string in Listing startup logs when absent | `http://media-service:3005` | Internal URL for Media Service calls. | — | `gateway/src/proxy.js`, `services/listing-service/src/index.js`, `services/listing-service/src/events/consumers.js`, `docker-compose.yml` |
| `SEARCH_SERVICE_URL` | Optional | `http://localhost:3006` in Gateway; empty string in Listing startup logs when absent | `http://search-service:3006` | Internal URL for Search Service calls. | — | `gateway/src/proxy.js`, `services/listing-service/src/index.js`, `docker-compose.yml` |
| `ADMIN_SERVICE_URL` | Optional | `http://localhost:3007` | `http://admin-service:3007` | Gateway target URL for Admin Service. | — | `gateway/src/proxy.js`, `docker-compose.yml` |

#### External Services

| Variable | Required | Default | Example Value | Purpose | Security Note | Evidence |
|---|---|---|---|---|---|---|
| `CLOUD_NAME` | Optional | — | `heavenly-cloud` | Cloudinary cloud name for Media Service uploads/deletes. Media Service logs whether this is configured. | — | `.env.example`, `services/media-service/src/index.js`, `services/media-service/src/controllers/media.js`, `docker-compose.yml` |
| `CLOUD_API_KEY` | Optional | — | `123456789012345` | Cloudinary API key for Media Service. | API key; do not commit real value. | `.env.example`, `services/media-service/src/controllers/media.js`, `docker-compose.yml` |
| `CLOUD_API_SECRET` | Optional | — | `replace-with-cloudinary-secret` | Cloudinary API secret for Media Service. | Sensitive secret; do not commit real value. | `.env.example`, `services/media-service/src/controllers/media.js`, `docker-compose.yml` |
| `RAZORPAY_KEY_ID` | Optional | — | `rzp_test_xxxxxxxxxxxxxx` | Razorpay key ID for Booking Service payment order creation and payment UI payloads. Missing credentials put Razorpay utility in simulation/not-initialized mode. | API key identifier; keep production value out of source. | `.env.example`, `services/booking-service/src/utils/razorpay.js`, `services/booking-service/src/controllers/booking.js`, `docker-compose.yml` |
| `RAZORPAY_KEY_SECRET` | Optional | — | `replace-with-razorpay-secret` | Razorpay key secret for payment order creation and signature verification. | Sensitive secret; do not commit real value. | `.env.example`, `services/booking-service/src/utils/razorpay.js`, `docker-compose.yml` |

#### Seed Data

| Variable | Required | Default | Example Value | Purpose | Security Note | Evidence |
|---|---|---|---|---|---|---|
| `ADMIN_USERNAME` | Optional | `admin` | `admin` | Username for admin user created by `scripts/seed-microservices.js`. | — | `.env.example`, `scripts/seed-microservices.js` |
| `ADMIN_EMAIL` | Optional | `admin@heavenly.com` | `admin@heavenly.com` | Email for admin user created by `scripts/seed-microservices.js`. | — | `.env.example`, `scripts/seed-microservices.js` |
| `ADMIN_PASSWORD` | Optional | `admin123` | `replace-with-admin-password` | Password for admin user created by `scripts/seed-microservices.js`. | Sensitive password; `.env.example` contains a development value. | `.env.example`, `scripts/seed-microservices.js` |

✅ CHECKPOINT: 8.1 — Environment Variable Inventory complete. Proceeding to stop as instructed.
