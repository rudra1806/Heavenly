## Phase 0 — Repository Reconnaissance

### P0.1 — Directory Tree (2 levels deep)

```text
project-root/
├── .dockerignore                 # Docker build ignore rules
├── .env                          # Local environment file exists; values not read or reproduced
├── .env.example                  # Environment variable template
├── .git/                         # Git metadata; not application source
├── .gitattributes                # Git attributes
├── .gitignore                    # Git ignore rules
├── Makefile                      # Docker/dev helper commands
├── README.md                     # Project README
├── docker-compose.prod.yml       # Production Compose override
├── docker-compose.yml            # Local Compose stack
├── docs/                         # Generated project documentation folder
├── shared/                       # Shared utilities used by services
│   ├── errors/                   # Shared error classes
│   ├── events/                   # RabbitMQ broker and event names
│   ├── index.js                  # Shared package exports
│   ├── middleware/               # Shared auth middleware
│   ├── node_modules/             # Installed dependencies; not source
│   ├── package-lock.json         # Shared dependency lockfile
│   ├── package.json              # Shared package manifest
│   └── utils/                    # Shared service client utilities
├── scripts/                      # Migration, seed, backup, restore, smoke-test scripts
│   ├── backup-data.sh            # MongoDB backup script
│   ├── data.js                   # Seed/migration data helper
│   ├── migrate.js                # Monolith-to-microservices migration script
│   ├── node_modules/             # Installed dependencies; not source
│   ├── package-lock.json         # Scripts dependency lockfile
│   ├── package.json              # Scripts package manifest
│   ├── restore-data.sh           # MongoDB restore script
│   ├── seed-data.sh              # Shell seed wrapper
│   ├── seed-microservices.js     # Microservices seed script
│   ├── smoke-test.js             # Smoke test script
│   └── update-booking-emails.js  # Booking email backfill/update script
├── bff/                          # Backend-for-Frontend serving EJS pages
│   ├── Dockerfile                # BFF container build
│   ├── node_modules/             # Installed dependencies; not source
│   ├── package-lock.json         # BFF dependency lockfile
│   ├── package.json              # BFF package manifest
│   └── src/                      # BFF source, routes, views, public assets
├── gateway/                      # API gateway and proxy layer
│   ├── Dockerfile                # Gateway container build
│   ├── node_modules/             # Installed dependencies; not source
│   ├── package-lock.json         # Gateway dependency lockfile
│   ├── package.json              # Gateway package manifest
│   └── src/                      # Gateway source and middleware
└── services/                     # Independently packaged backend services
    ├── admin-service/            # Admin/dashboard aggregation service
    ├── auth-service/             # Authentication and user identity service
    ├── booking-service/          # Booking, payment, and availability service
    ├── listing-service/          # Listing CRUD and ownership service
    ├── media-service/            # Cloudinary-backed media service
    ├── review-service/           # Review and rating service
    └── search-service/           # Search and geocoding service
```


### P0.2 — Tech Stack Inventory

Files checked:

| File | Result |
|---|---|
| Root `package.json` | Not found |
| `gateway/package.json` | Found |
| `bff/package.json` | Found |
| `shared/package.json` | Found |
| `scripts/package.json` | Found |
| `services/*/package.json` | Found for admin, auth, booking, listing, media, review, search |
| `requirements.txt` | Not found |
| `go.mod` | Not found |
| `Cargo.toml` | Not found |
| `pom.xml` | Not found |
| `build.gradle` | Not found |
| `Gemfile` | Not found |
| `composer.json` | Not found |
| `pyproject.toml` | Not found |
| `Dockerfile` | Found in `gateway/`, `bff/`, and each service folder |
| `docker-compose.yml` | Found |
| `docker-compose.prod.yml` | Found |
| CI `*.yml` / `*.yaml` files | No CI files found |

| Layer | Technology | Version | Evidence File | Confidence |
|---|---:|---:|---|---|
| Runtime | Node.js | 20-alpine image | `gateway/Dockerfile`, `bff/Dockerfile`, `services/*/Dockerfile` | ✅ Confirmed |
| Language | JavaScript/CommonJS | `type: commonjs` | `gateway/package.json`, `bff/package.json`, `services/*/package.json` | ✅ Confirmed |
| Web framework | Express | `^5.2.1` | `gateway/package.json`, `bff/package.json`, `services/*/package.json` | ✅ Confirmed |
| Frontend rendering | EJS + ejs-mate | `ejs ^4.0.1`, `ejs-mate ^4.0.0` | `bff/package.json` | ✅ Confirmed |
| Session middleware | express-session | `^1.18.2` | `bff/package.json` | ✅ Confirmed |
| API gateway proxy | http-proxy-middleware | `^3.0.3` | `gateway/package.json`, `gateway/src/proxy.js` | ✅ Confirmed |
| Database | MongoDB | `mongo:7` | `docker-compose.yml` | ✅ Confirmed |
| ODM | Mongoose | `^9.1.4`, `^8.15.1` in scripts | `services/*/package.json`, `scripts/package.json` | ✅ Confirmed |
| Cache | Redis | `redis:7-alpine`, npm `redis ^4.7.0` | `docker-compose.yml`, `gateway/package.json`, `services/auth-service/package.json`, `services/search-service/package.json` | ✅ Confirmed |
| Message broker | RabbitMQ | `rabbitmq:3-management`, npm `amqplib ^0.10.4` | `docker-compose.yml`, `shared/package.json` | ✅ Confirmed |
| Auth tokens | JWT | `jsonwebtoken ^9.0.2` | `gateway/package.json`, `shared/package.json`, `services/auth-service/package.json` | ✅ Confirmed |
| Password hashing | bcrypt | `^5.1.1`, scripts `^6.0.0` | `services/auth-service/package.json`, `services/auth-service/src/models/user.js`, `scripts/package.json` | ✅ Confirmed |
| Validation | Joi | `^18.0.2` | `services/listing-service/package.json`, `services/booking-service/package.json`, `services/review-service/package.json` | ✅ Confirmed |
| File upload middleware | multer | `^2.0.2`, BFF `^2.1.1` | `services/listing-service/package.json`, `services/media-service/package.json`, `bff/package.json` | ✅ Confirmed |
| Media storage | Cloudinary | `cloudinary ^1.41.3`, `multer-storage-cloudinary ^4.0.0` | `services/media-service/package.json`, `services/media-service/src/controllers/media.js` | ✅ Confirmed |
| Payment provider | Razorpay | `^2.9.4` | `services/booking-service/package.json`, `services/booking-service/src/utils/razorpay.js` | ✅ Confirmed |
| Request logging | Morgan | `^1.10.0` | `gateway/package.json`, `bff/package.json`, `services/*/package.json` | ✅ Confirmed |
| CORS | cors | `^2.8.5` | `gateway/package.json`, `services/*/package.json` | ✅ Confirmed |
| Rate limiting | express-rate-limit | `^7.5.0` | `gateway/package.json`, `gateway/src/middleware/rateLimiter.js` | ✅ Confirmed |
| Metrics/APM | — | — | Not found | ⬜ Not present |
| Error tracking | — | — | Not found | ⬜ Not present |
| GraphQL | — | — | No GraphQL package/schema found | ⬜ Not present |
| WebSocket | — | — | No `ws` or `socket.io` package found | ⬜ Not present |


### P0.3 — Architecture Classification

| Item | Finding |
|---|---|
| Type | Microservices-style application in a single repository |
| Evidence | `gateway/`, `bff/`, `shared/`, and separate service packages under `services/*`, each with its own `package.json` and Dockerfile |
| Formal monorepo tooling | Not present; no root `package.json`, npm workspaces, `turbo.json`, or pnpm/yarn workspace config found |
| Deployable units | `gateway`, `bff`, `auth-service`, `listing-service`, `review-service`, `booking-service`, `media-service`, `search-service`, `admin-service` |
| Infrastructure units | `mongodb`, `redis`, `rabbitmq` in `docker-compose.yml` |
| Communication style | REST/HTTP via Express routes and gateway proxy; event-driven via RabbitMQ; HTTP/JSON internal service calls via `shared/utils/serviceClient.js`; no GraphQL/gRPC/WebSocket evidence found |
| Data ownership | Separate MongoDB databases per service in Compose env values: `heavenly_auth`, `heavenly_listings`, `heavenly_reviews`, `heavenly_bookings` |


### P0.4 — Entry Points

| Entry Point | File | Verified? |
|---|---|---|
| API Gateway | `gateway/src/index.js` | ✅ File exists |
| BFF frontend server | `bff/src/index.js` | ✅ File exists |
| Auth service | `services/auth-service/src/index.js` | ✅ File exists |
| Listing service | `services/listing-service/src/index.js` | ✅ File exists |
| Review service | `services/review-service/src/index.js` | ✅ File exists |
| Booking service | `services/booking-service/src/index.js` | ✅ File exists |
| Media service | `services/media-service/src/index.js` | ✅ File exists |
| Search service | `services/search-service/src/index.js` | ✅ File exists |
| Admin service | `services/admin-service/src/index.js` | ✅ File exists |
| Migration script | `scripts/migrate.js` | ✅ File exists |
| Seed script | `scripts/seed-microservices.js` | ✅ File exists |
| Smoke test script | `scripts/smoke-test.js` | ✅ File exists |
| Standalone background worker | — | ⬜ Not found; event consumers run inside service entry points |
| SPA frontend entry | — | ⬜ Not found; frontend is server-rendered through BFF/EJS |


### P0.5 — External Services and Integrations

| Service | Evidence | Config Location |
|---|---|---|
| Cloudinary | `cloudinary` and `multer-storage-cloudinary` dependencies; `cloudinary.config(...)` in `services/media-service/src/controllers/media.js` | `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET` in `.env.example`, `docker-compose.yml`, and `services/media-service/src/controllers/media.js` |
| Razorpay | `razorpay` dependency; `new Razorpay(...)` in `services/booking-service/src/utils/razorpay.js`; payment routes in `services/booking-service/src/routes/booking.js` | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` in `.env.example`, `docker-compose.yml`, and `services/booking-service/src/utils/razorpay.js` |
| Nominatim / OpenStreetMap | `fetch('https://nominatim.openstreetmap.org/search?...')` in `services/search-service/src/controllers/search.js` | Hardcoded URL in `services/search-service/src/controllers/search.js`; Redis cache uses `REDIS_URL` |
| Internal service HTTP calls | `shared/utils/serviceClient.js` wraps `fetch`; service URL env vars used in gateway/BFF/admin/listing/booking/search files | `AUTH_SERVICE_URL`, `LISTING_SERVICE_URL`, `REVIEW_SERVICE_URL`, `BOOKING_SERVICE_URL`, `MEDIA_SERVICE_URL`, `SEARCH_SERVICE_URL`, `ADMIN_SERVICE_URL`, `GATEWAY_URL` |
| Email provider | ⬜ No email library found | — |
| Stripe | ⬜ No Stripe package found | — |
| AWS SDK | ⬜ No AWS SDK package found | — |
| SendGrid/Twilio | ⬜ No SendGrid or Twilio package found | — |


### P0.6 — Configuration File Inventory

| File | Exists? | Purpose |
|---|---:|---|
| `.env` | ✅ | Local environment file exists; values intentionally not read or reproduced |
| `.env.example` | ✅ | Env var template for JWT, session, Cloudinary, RabbitMQ, admin seed, Razorpay |
| `.dockerignore` | ✅ | Docker build ignore rules |
| `.gitignore` | ✅ | Git ignore rules |
| `.gitattributes` | ✅ | Git attributes |
| `docker-compose.yml` | ✅ | Local multi-service infrastructure and app stack |
| `docker-compose.prod.yml` | ✅ | Production Compose override for restart policies, resources, and production env |
| `Makefile` | ✅ | Docker, backup, restore, seed, logs, and status commands |
| `gateway/package.json` | ✅ | Gateway package manifest and scripts |
| `gateway/package-lock.json` | ✅ | Gateway dependency lockfile |
| `gateway/Dockerfile` | ✅ | Gateway container build |
| `bff/package.json` | ✅ | BFF package manifest and scripts |
| `bff/package-lock.json` | ✅ | BFF dependency lockfile |
| `bff/Dockerfile` | ✅ | BFF container build |
| `shared/package.json` | ✅ | Shared package manifest |
| `shared/package-lock.json` | ✅ | Shared dependency lockfile |
| `scripts/package.json` | ✅ | Scripts package manifest |
| `scripts/package-lock.json` | ✅ | Scripts dependency lockfile |
| `services/*/package.json` | ✅ | Per-service package manifests |
| `services/*/package-lock.json` | ✅ | Per-service dependency lockfiles |
| `services/*/Dockerfile` | ✅ | Per-service container builds |
| Root `package.json` | ⬜ Not found | No root package manifest/workspaces |
| `tsconfig.json` | ⬜ Not found | TypeScript config absent |
| `jest.config.*` | ⬜ Not found | Jest config absent |
| `.github/workflows/` | ⬜ Not found | GitHub Actions absent |
| `.gitlab-ci.yml` | ⬜ Not found | GitLab CI absent |
| `k8s/`, `helm/`, `manifests/` | ⬜ Not found | Kubernetes/Helm absent |
| Terraform/CDK/Pulumi/SAM/serverless config | ⬜ Not found | Cloud infra-as-code absent |


### P0.7 — Feature Presence Checklist

| Feature | Present? | Evidence | Affects Sections |
|---|---:|---|---|
| Frontend (UI layer) | ✅ | `bff/src/views/`, `bff/src/public/`, `bff/package.json` with `ejs` | Section 5 |
| REST API | ✅ | Express route files in `services/*/src/routes/*.js`, gateway proxy in `gateway/src/proxy.js` | Section 4 |
| GraphQL API | ⬜ | No `graphql` package, schema files, or resolver files found | Section 4 |
| WebSocket | ⬜ | No `ws` or `socket.io` package found | Sections 2, 4 |
| Database (relational) | ⬜ | No Prisma/TypeORM/Sequelize SQL config or relational DB service found | Section 6 |
| Database (NoSQL) | ✅ | `mongoose` dependencies; MongoDB service in `docker-compose.yml`; models in `services/*/src/models/*.js` | Section 6 |
| Redis / Cache | ✅ | Redis service in `docker-compose.yml`; `redis` dependency in gateway/auth/search/shared; geocode cache in search controller | Sections 2, 4, 7 |
| Message Queue | ✅ | RabbitMQ service in `docker-compose.yml`; `amqplib` in `shared/package.json`; `shared/events/broker.js` | Sections 2, 4 |
| Background Workers | ✅ | Queue consumers in `services/listing-service/src/events/consumers.js`, `services/review-service/src/events/consumers.js`, `services/search-service/src/events/consumers.js`, `services/booking-service/src/events/consumers.js` | Sections 4, 7 |
| Authentication | ✅ | JWT utilities/middleware in `services/auth-service/src/utils/jwt.js`, `shared/middleware/authMiddleware.js`, `gateway/src/middleware/jwtValidation.js` | Sections 2, 4, 9 |
| Authorization / RBAC | ✅ | `requireAdmin` middleware in `shared/middleware/authMiddleware.js`; admin route guards in `services/admin-service/src/routes/admin.js` and `bff/src/routes/admin.js` | Sections 4, 9 |
| File Uploads | ✅ | `multer` in `services/media-service` and BFF listing routes; upload route in `services/media-service/src/routes/media.js` | Sections 4, 9 |
| Email Sending | ⬜ | No `nodemailer`, `sendgrid`, SES, or email-send code found | Section 4 |
| Payment Processing | ✅ | Razorpay dependency and payment routes in `services/booking-service/src/routes/booking.js`; utility in `services/booking-service/src/utils/razorpay.js` | Section 4 |
| Docker | ✅ | `gateway/Dockerfile`, `bff/Dockerfile`, and `services/*/Dockerfile` | Section 7 |
| Docker Compose | ✅ | `docker-compose.yml`, `docker-compose.prod.yml` | Sections 7, 12 |
| Kubernetes | ⬜ | No `k8s/`, `helm/`, or manifest folder found | Section 7 |
| CI/CD Pipeline | ⬜ | No `.github/workflows/`, `.gitlab-ci.yml`, Jenkinsfile, CircleCI, or Bitbucket pipeline config found | Section 7 |
| Environment Variables | ✅ | `.env.example`, `docker-compose.yml` environment blocks, and `process.env.*` references across source | Section 8 |
| Rate Limiting | ✅ | `express-rate-limit` dependency and `gateway/src/middleware/rateLimiter.js` | Section 9 |
| CORS Config | ✅ | `cors` package and `app.use(cors(...))` in gateway/services | Section 9 |
| Input Validation | ✅ | Joi validators in `services/listing-service/src/validators`, `services/booking-service/src/validators`, `services/review-service/src/validators`; Mongoose schema validation in models | Section 9 |
| Logging Library | ✅ | `morgan` dependency and `app.use(morgan(...))` in gateway/BFF/services | Section 10 |
| Metrics / APM | ⬜ | No `prom-client`, Datadog, New Relic, OpenTelemetry, or APM config found | Section 10 |
| Error Tracking | ⬜ | No Sentry, Bugsnag, Rollbar, or equivalent found | Section 10 |
| Health Check Endpoint | ✅ | `/health` routes in gateway, BFF, and services; Compose healthchecks for gateway/services and infra | Section 10 |
| Test Suite | ⬜ | No `*.spec.*`, `*.test.*`, `tests/`, or framework test config found; `scripts/smoke-test.js` exists but is not a formal test suite | Sections 12, 13 |
| Database Migrations | ✅ | `scripts/package.json` has `migrate`; `scripts/migrate.js`; `services/booking-service/scripts/migrate-platform-fee.js` | Section 6 |
| Seed Data | ✅ | `scripts/seed-microservices.js`, `scripts/seed-data.sh`, `Makefile` `seed` target | Sections 6, 12 |
| Monorepo Setup | ⬜ | No root `package.json`, workspaces, `turbo.json`, pnpm workspace, or yarn workspace config found | Section 3 |


### P0.8 — Documentation Coverage Map

Section 1 (Project Overview):
- Covered: system purpose based on gateway, BFF, services, MongoDB, Redis, RabbitMQ, Cloudinary, Razorpay, and EJS views.
- Covered: confirmed features only: listings, bookings, reviews, auth, admin, media upload, search/geocoding, payments.
- Not covered: any claim about mobile apps, GraphQL, WebSockets, CI/CD, Kubernetes, or cloud IaC.

Section 2 (Architecture):
- Covered: microservices-style repo, gateway proxy flow, BFF session-to-JWT flow, RabbitMQ event flow, Redis cache usage, MongoDB data flow, Docker Compose deployment.
- Not covered: GraphQL flow, WebSocket flow, gRPC flow, Kubernetes architecture, CI/CD architecture.

Section 3 (Folder Structure):
- Covered: root, `gateway/`, `bff/`, `services/`, `shared/`, `scripts/`, `docs/`, and config files found in P0.1/P0.6.
- Not covered: non-existent `src/` root folder, workspace config, `frontend/` SPA folder, `tests/` folder, `k8s/`, `helm/`, CI folders.

Section 4 (Backend):
- Covered: REST API through gateway plus service route files.
- Covered: service endpoints: auth (8), listing (6), review (5), booking (7), media (2), search (2), admin (10) = 40 service endpoints.
- Covered: gateway proxy routes: `/api/auth`, `/api/listings`, `/api/reviews`, `/api/bookings`, `/api/media`, `/api/search`, `/api/geocode`, `/api/admin`, `/api/dashboard`.
- Covered: middleware: JWT validation, shared auth middleware, admin guard, rate limiter, morgan, cors, JSON parsing, error handlers.
- Covered: services/controllers, Joi validators, Mongoose models, RabbitMQ consumers, file upload, Cloudinary, Razorpay, Nominatim, internal service client.
- Not covered: GraphQL resolvers, gRPC services, WebSocket handlers, email sending.
- Split: Yes — more than 20 endpoints; use `04a_BACKEND_ROUTES.md` for endpoints/controllers/validation and `04b_BACKEND_SERVICES.md` for services/middleware/events/error handling/integrations.

Section 5 (Frontend):
- Covered: BFF-rendered frontend using Express, EJS, ejs-mate layouts, static CSS/JS, routes under `bff/src/routes`, views under `bff/src/views`, session-based browser auth backed by JWT API calls.
- Not covered: React/Vue/Angular SPA architecture, client-side router, Redux/Zustand, SSR framework config such as Next.js.

Section 6 (Database):
- Covered: MongoDB/Mongoose overview, service-owned databases from Compose, models: User, Listing, Review, Booking, indexes found in schemas.
- Covered: migration scripts and seed scripts that exist.
- Not covered: relational database docs, Prisma/SQL migrations, NoSQL collections that have no model file, ER diagram if relations are only string references across service databases.

Section 7 (DevOps):
- Covered: Dockerfiles, Docker Compose local stack, production Compose override, infra services, healthchecks, volumes/networks.
- Not covered: Kubernetes, Helm, CI/CD, Terraform/CDK/Pulumi/SAM/serverless cloud infrastructure.

Section 8 (Environment Variables):
- Covered: variables from `.env.example`, `docker-compose.yml`, and `process.env.*` references.
- Covered: required vs optional based on whether source code fails without them or has defaults.
- Not covered: invented variables not found in env template, Compose, or source.

Section 9 (Security):
- Covered: JWT auth, admin RBAC, bcrypt password hashing, Joi/Mongoose validation, CORS, gateway rate limiting, secret usage, file upload security observations, Docker user observation.
- Not covered: OAuth, API-key auth, helmet security headers if not found, HTTPS enforcement if not found, WebSocket security.

Section 10 (Observability):
- Covered: Morgan request logs, console logging, `/health` endpoints, Docker Compose healthchecks.
- Not covered: metrics/APM, distributed tracing, Sentry/Bugsnag/Rollbar error tracking.

Section 11 (Dependencies):
- Covered: production dependencies from package manifests: Express, Mongoose, Redis, amqplib, jsonwebtoken, bcrypt, Joi, morgan, cors, multer, Cloudinary, Razorpay, EJS, express-session, http-proxy-middleware, express-rate-limit.
- Not covered: transitive dependencies and dev-only dependencies except where script/dev workflow needs mention later.

Section 12 (Setup Guide):
- Covered: Docker Compose setup, Node/npm per-package setup if needed, env file creation from `.env.example`, migration/seed/smoke-test commands, ports from Compose.
- Not covered: Kubernetes setup, CI setup, frontend SPA build steps, formal test-running steps because no formal test suite was found.

Section 13 (Scripts Reference):
- Covered: package scripts from each `package.json`, Makefile targets, files under `scripts/`.
- Not covered: nonexistent root npm scripts and nonexistent test script.

Section 14 (Troubleshooting):
- Covered: MongoDB connection issues, Redis connection issues, RabbitMQ connection issues, missing JWT/Cloudinary/Razorpay/session env vars, port conflicts, module-not-found, Compose healthcheck failures, migration/seed issues tied to actual files.
- Not covered: PostgreSQL, Kubernetes, CI/CD, GraphQL, WebSocket, and formal unit-test troubleshooting.

Section 15 (Improvement Recommendations):
- Covered: evidence-backed issues only, such as absent CI/CD, absent formal tests, absent metrics/APM, absent security headers if confirmed, Compose/Docker hardening observations, and any route validation gaps found in later sections.
- Not covered: generic performance/caching advice unless tied to actual code.

Section 16 (README):
- Covered: README assembled from completed documentation sections.
- Not covered: contributing section unless a `CONTRIBUTING.md` or equivalent is found later; license section unless a `LICENSE` file is found later.

INDEX.md:
- Covered: documentation index with status and notes for each section file.
