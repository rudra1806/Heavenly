SECTION: Troubleshooting
FILE: 14_TROUBLESHOOTING.md
COVERS:
- MongoDB startup and healthcheck failures.
- Redis degraded-mode warnings in Auth and Search services.
- RabbitMQ connection, publish, and consume failures.
- JWT/authentication errors tied to Gateway and shared middleware.
- Cloudinary and Razorpay configuration failures.
- Migration, seed, and smoke-test failures from real scripts.
- Port conflicts for fixed local ports.
- Module resolution failure found in Listing Service event consumer code.
SKIPS:
- PostgreSQL/MySQL troubleshooting skipped because Phase 0 found no relational database.
- Kubernetes, Helm, and CI/CD troubleshooting skipped because Phase 0 found none.
- GraphQL and WebSocket troubleshooting skipped because Phase 0 found neither feature.
- Formal unit-test troubleshooting skipped because Phase 0 found no formal test suite.

## Section 14 — Troubleshooting

### 14.1 — Startup And Infrastructure Errors

#### `[Auth Service] Failed to start: <MongoDB connection error>`

When it happens: Auth Service starts while MongoDB is unavailable or `MONGO_URL` points to the wrong host.

Root cause: Auth Service calls `mongoose.connect(MONGO_URL)` before starting HTTP; default URL is `mongodb://localhost:27017/heavenly_auth`, while Compose injects `mongodb://mongodb:27017/heavenly_auth`.

Evidence: `services/auth-service/src/index.js:36-37`, `services/auth-service/src/index.js:78-80`, `services/auth-service/src/index.js:116-118`, `docker-compose.yml:67`.

Fix:

```bash
docker-compose up -d mongodb
docker-compose restart auth-service
docker-compose logs -f auth-service
```

Verify fixed: `curl http://localhost:3001/health` returns JSON with `status: "healthy"` and `mongodb: "connected"` from `services/auth-service/src/index.js:44-51`.

#### `[Search Service] Redis unavailable — geocode caching disabled: <error>`

When it happens: Search Service starts with `REDIS_URL` set but Redis is unavailable.

Root cause: Search Service creates a Redis client from `process.env.REDIS_URL`; Compose sets `REDIS_URL=redis://redis:6379`.

Evidence: `services/search-service/src/index.js:73-83`, `docker-compose.yml:233-235`, Redis healthcheck in `docker-compose.yml:29-33`.

Fix:

```bash
docker-compose up -d redis
docker-compose restart search-service
docker-compose logs -f search-service
```

Verify fixed: logs include `[Search Service] Connected to Redis`, defined in `services/search-service/src/index.js:80`.

#### `[Auth Service] Redis unavailable — logout blacklist disabled: <error>`

When it happens: Auth Service starts with `REDIS_URL` set but Redis is unavailable.

Root cause: Auth Service uses Redis for JWT logout blacklist injection into the auth controller.

Evidence: `services/auth-service/src/index.js:82-95`, `docker-compose.yml:70`.

Fix:

```bash
docker-compose up -d redis
docker-compose restart auth-service
docker-compose logs -f auth-service
```

Verify fixed: logs include `[Auth Service] Connected to Redis`, defined in `services/auth-service/src/index.js:89`.

#### `[RabbitMQ] Failed to connect after 5 attempts`

When it happens: A service or seed script attempts to connect to RabbitMQ while RabbitMQ is down or credentials/URL are wrong.

Root cause: `shared/events/broker.js` retries RabbitMQ connection five times and throws this exact error after the final failure. Compose provides `RABBITMQ_URL` to services using `RABBITMQ_USER` / `RABBITMQ_PASS`.

Evidence: `shared/events/broker.js:54-103`, `docker-compose.yml:41-43`, `docker-compose.yml:71`, `scripts/seed-microservices.js:233-239`.

Fix:

```bash
docker-compose up -d rabbitmq
docker-compose restart auth-service listing-service review-service booking-service search-service
```

Verify fixed: `docker-compose logs -f rabbitmq` shows RabbitMQ running, and service logs include `[RabbitMQ] Connected successfully` from `shared/events/broker.js:69`.

#### `listen EADDRINUSE: address already in use`

When it happens: A local Node service or Docker Compose service starts while its fixed port is already occupied.

Root cause: The repo uses fixed ports: Gateway `3000`, services `3001-3007`, BFF `8080`, MongoDB `27017`, Redis `6379`, RabbitMQ `5672`, and RabbitMQ UI `15672`.

Evidence: Gateway listens on `PORT || 3000` in `gateway/src/index.js:22-23` and starts with `app.listen` in `gateway/src/index.js:69-73`; BFF listens on `PORT || 8080` in `bff/src/index.js:35-36`; Compose port mappings are in `docker-compose.yml:5-9`, `docker-compose.yml:20-24`, `docker-compose.yml:35-40`, `docker-compose.yml:57-63`, `docker-compose.yml:299-305`, and `docker-compose.yml:353-359`.

Fix:

```bash
docker-compose ps
docker-compose down
docker-compose up -d
```

If another local process owns the port, stop that process or change the relevant Compose port mapping.

Verify fixed: `docker-compose ps` shows the expected port bindings and `curl http://localhost:3000/health` succeeds.

✅ CHECKPOINT: 14.1 — Startup And Infrastructure Errors complete. Proceeding to 14.2 — Authentication And Configuration Errors.

### 14.2 — Authentication And Configuration Errors

#### `JWT_SECRET is not configured!`

When it happens: A protected service route uses shared auth middleware while `JWT_SECRET` is missing.

Root cause: `shared/middleware/authMiddleware.js` reads `process.env.JWT_SECRET`; if missing, it logs the exact message and returns `Server authentication configuration error.`

Evidence: `shared/middleware/authMiddleware.js:28-33`; Compose passes `JWT_SECRET` to services in `docker-compose.yml:68`, `docker-compose.yml:104`, `docker-compose.yml:138`, `docker-compose.yml:170`, `docker-compose.yml:204`, `docker-compose.yml:233`, `docker-compose.yml:268`, and `docker-compose.yml:309`.

Fix:

```bash
cp .env.example .env
docker-compose restart gateway auth-service listing-service review-service booking-service media-service search-service admin-service
```

Then set a real `JWT_SECRET` in `.env`.

Verify fixed: protected routes no longer return `Server authentication configuration error.` from `shared/middleware/authMiddleware.js:30-33`.

#### `Authentication required. Please provide a valid token.`

When it happens: A request hits a Gateway route that requires JWT auth without a valid bearer token.

Root cause: Gateway `jwtValidation.required` returns this exact error if token extraction/verification fails.

Evidence: `gateway/src/middleware/jwtValidation.js:39-46`; required routes are mounted in `gateway/src/index.js:59-61`.

Fix:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Use the returned access token:

```bash
curl http://localhost:3000/api/bookings \
  -H "Authorization: Bearer <accessToken>"
```

Verify fixed: the request passes Gateway auth and no longer returns the Gateway 401 response.

#### `Invalid token.`

When it happens: A protected service route receives a bearer token that `jsonwebtoken` rejects.

Root cause: Shared middleware catches `JsonWebTokenError` and returns `Invalid token.`

Evidence: `shared/middleware/authMiddleware.js:36`, `shared/middleware/authMiddleware.js:54-58`.

Fix:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Replace the stale or malformed token with the new `accessToken`.

Verify fixed: protected service routes no longer return `Invalid token.`

#### `Invalid refresh token.`

When it happens: Auth refresh endpoint receives an invalid refresh token.

Root cause: Auth controller catches `JsonWebTokenError` during refresh and returns this exact error.

Evidence: `services/auth-service/src/controllers/auth.js:219-229`.

Fix:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Use the new `refreshToken` from the login response.

Verify fixed: refresh returns a new access token instead of `Invalid refresh token.`

#### `[Media Service] Cloudinary: NOT CONFIGURED`

When it happens: Media Service starts without `CLOUD_NAME`.

Root cause: Media Service logs Cloudinary configuration status from `process.env.CLOUD_NAME`; upload code also configures Cloudinary from `CLOUD_NAME`, `CLOUD_API_KEY`, and `CLOUD_API_SECRET`.

Evidence: `services/media-service/src/index.js:60-63`, `services/media-service/src/controllers/media.js:12-17`, `docker-compose.yml:205-207`.

Fix:

```bash
cp .env.example .env
docker-compose restart media-service
```

Set real `CLOUD_NAME`, `CLOUD_API_KEY`, and `CLOUD_API_SECRET` in `.env`.

Verify fixed: `curl http://localhost:3005/health` reports `cloudinary: "configured"` from `services/media-service/src/index.js:29-36`.

#### `Razorpay not initialized. Check your credentials.`

When it happens: Booking payment code tries to create, verify, fetch, or refund a Razorpay payment while Razorpay credentials are missing.

Root cause: `initializeRazorpay()` returns `null` when `RAZORPAY_KEY_ID` or `RAZORPAY_KEY_SECRET` is missing; payment utility methods throw this exact error when `razorpayInstance` is not initialized.

Evidence: `services/booking-service/src/utils/razorpay.js:15-21`, `services/booking-service/src/utils/razorpay.js:46-49`, `services/booking-service/src/utils/razorpay.js:79-82`, `services/booking-service/src/utils/razorpay.js:113-116`, `services/booking-service/src/utils/razorpay.js:133-136`, `docker-compose.yml:173-174`.

Fix:

```bash
cp .env.example .env
docker-compose restart booking-service
```

Set real `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`.

Verify fixed: Booking payment flow no longer logs `[Booking] Razorpay order creation failed:` from `services/booking-service/src/controllers/booking.js:286-300`.

✅ CHECKPOINT: 14.2 — Authentication And Configuration Errors complete. Proceeding to 14.3 — Script And Migration Errors.

### 14.3 — Script And Migration Errors

#### `❌ Migration failed: <message>`

When it happens: `scripts/migrate.js` cannot connect to source/target MongoDB or fails during monolith-to-microservices migration.

Root cause: The migration script requires MongoDB to be running, reads source URL from `--source`, `MONOLITH_MONGO_URL`, or default `mongodb://127.0.0.1:27017/heavenly`, and writes to target service DB URLs.

Evidence: `scripts/migrate.js:20-22`, `scripts/migrate.js:27-39`, `scripts/migrate.js:352-355`.

Fix:

```bash
docker-compose up -d mongodb
cd scripts && npm run migrate:dry
```

If the source DB is not the default:

```bash
cd scripts && node migrate.js --source=mongodb://127.0.0.1:27017/heavenly
```

Verify fixed: dry run completes, then `cd scripts && npm run migrate` exits without `❌ Migration failed:`.

#### `Migration failed: <error>`

When it happens: `services/booking-service/scripts/migrate-platform-fee.js` cannot connect to the booking database or update booking documents.

Root cause: The script connects to `MONGODB_URI` or default `mongodb://localhost:27017/heavenly_bookings`.

Evidence: `services/booking-service/scripts/migrate-platform-fee.js:17`, `services/booking-service/scripts/migrate-platform-fee.js:48-53`, `services/booking-service/scripts/migrate-platform-fee.js:102-105`.

Fix:

```bash
docker-compose up -d mongodb
MONGODB_URI=mongodb://localhost:27017/heavenly_bookings node services/booking-service/scripts/migrate-platform-fee.js
```

Verify fixed: script logs `Connected successfully.` and then `Database connection closed.`

#### `❌ Seed failed: <message>`

When it happens: `scripts/seed-microservices.js` cannot connect to MongoDB/RabbitMQ or write seed data.

Root cause: Seed script uses service DB URLs for Auth, Listing, Review, and Booking databases, then connects to RabbitMQ using `RABBITMQ_URL` or `amqp://heavenly:heavenly123@localhost:5672`.

Evidence: `scripts/seed-microservices.js:20-31`, `scripts/seed-microservices.js:233-239`, `scripts/seed-microservices.js:291-294`.

Fix:

```bash
docker-compose up -d mongodb rabbitmq
make seed
```

Verify fixed: seed script exits successfully and does not print `❌ Seed failed:`.

#### `Some tests failed. Check that all services are running: docker-compose up -d`

When it happens: `scripts/smoke-test.js` cannot reach one or more health endpoints or expected gateway/BFF checks fail.

Root cause: Smoke test checks Gateway, services `3001-3007`, and BFF health endpoints.

Evidence: `scripts/smoke-test.js:55-72`, `scripts/smoke-test.js:148-151`.

Fix:

```bash
docker-compose up -d
docker-compose ps
cd scripts && npm run smoke-test
```

Verify fixed: script prints `All smoke tests passed!` from `scripts/smoke-test.js:152-154`.

✅ CHECKPOINT: 14.3 — Script And Migration Errors complete. Proceeding to 14.4 — Module And Event Handler Errors.

### 14.4 — Module And Event Handler Errors

#### `Cannot find module '../utils/serviceClient.js'`

When it happens: Listing Service processes a `user.deleted` RabbitMQ event and reaches image cleanup logic.

Root cause: `services/listing-service/src/events/consumers.js` requires `../utils/serviceClient.js`, but no `services/listing-service/src/utils/` directory or `serviceClient.js` file exists. The shared client exists through the shared package pattern used elsewhere.

Evidence: missing require at `services/listing-service/src/events/consumers.js:36-39`; actual `services/listing-service/src/` contents contain `controllers`, `events`, `index.js`, `models`, `routes`, and `validators`, but no `utils` folder.

Fix:

```bash
find services/listing-service/src -maxdepth 2 -type f | sort
```

Then update the consumer to use the existing shared service client pattern used by other services, such as imports from `../../../shared` / `/app/shared` shown in `services/booking-service/src/index.js:25-30`.

Verify fixed: deleting a user with listings no longer logs a RabbitMQ handler error from `shared/events/broker.js:247-251`.

#### `[RabbitMQ] Cannot publish — not connected`

When it happens: Code calls `publishEvent()` while the RabbitMQ channel is absent.

Root cause: `shared/events/broker.js` returns early with this exact message when `channel` is null.

Evidence: `shared/events/broker.js:192-195`.

Fix:

```bash
docker-compose up -d rabbitmq
docker-compose restart auth-service listing-service review-service booking-service search-service
```

Verify fixed: service logs show `[RabbitMQ] Published: <routingKey>` from `shared/events/broker.js:205-210`.

#### `[RabbitMQ] Cannot consume — not connected`

When it happens: A service attempts to register consumers while the RabbitMQ channel is absent.

Root cause: `setupConsumer()` checks `channel` and returns with this exact log if RabbitMQ is not connected.

Evidence: `shared/events/broker.js:220-223`.

Fix:

```bash
docker-compose up -d rabbitmq
docker-compose restart listing-service review-service booking-service search-service
```

Verify fixed: service logs show `[RabbitMQ] Consuming: <queueName> ← <routingKey>` from `shared/events/broker.js:279`.

✅ CHECKPOINT: 14.4 — Module And Event Handler Errors complete. Proceeding to stop as instructed.
