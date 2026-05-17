## Section 3 — Folder And File Structure

### 3.1 — Annotated Root Directory

```text
project-root/
├── .dockerignore                 # Docker build ignore rules; excludes node_modules, Git, IDE files, scripts, Compose files
├── .env                          # Local environment file exists; values are not reproduced in documentation
├── .env.example                  # Environment variable template for JWT, session, Cloudinary, RabbitMQ, admin seed, Razorpay
├── .git/                         # Git metadata; not application source
├── .gitattributes                # Git attributes
├── .gitignore                    # Git ignore rules
├── Makefile                      # Docker, logs, seed, backup, restore, shell, status helper commands
├── README.md                     # Project README
├── docker-compose.prod.yml       # Production Compose override: production env, restart policies, resource limits, no bind mounts
├── docker-compose.yml            # Local Compose stack for MongoDB, Redis, RabbitMQ, gateway, BFF, and services
├── docs/                         # Generated project documentation folder
│   ├── INDEX.md                  # Documentation index
│   ├── KUBERNETES_GUIDE.md       # Kubernetes architecture and concepts
│   ├── KUBERNETES_RUNBOOK.md     # Kubernetes operational procedures
│   ├── KUBERNETES_TROUBLESHOOTING.md # Kubernetes troubleshooting guide
│   └── 00_PHASE0_RECONNAISSANCE.md ... 15_IMPROVEMENTS.md
├── k8s/                          # Kubernetes manifests for Minikube deployment
│   ├── base/                     # Namespaces, ConfigMap, Secret, NetworkPolicies
│   ├── infra/                    # MongoDB, Redis, RabbitMQ StatefulSets and Services
│   ├── apps/                     # Backend microservice Deployments and Services
│   ├── edge/                     # Gateway, BFF Deployments, Services, and Ingress
│   ├── hpa/                      # HorizontalPodAutoscalers for stateless services
│   └── monitoring/               # Helm values and Grafana dashboard ConfigMaps
├── shared/                       # Shared utilities used by services and scripts
│   ├── errors/                   # Shared error class
│   ├── events/                   # RabbitMQ broker and event name constants
│   ├── index.js                  # Shared package exports
│   ├── middleware/               # Shared JWT auth middleware
│   ├── node_modules/             # Installed dependencies; not source
│   ├── package-lock.json         # Shared dependency lockfile
│   ├── package.json              # Shared package manifest
│   └── utils/                    # Shared HTTP service client
├── scripts/                      # Migration, seed, backup, restore, and smoke-test scripts
│   ├── backup-data.sh            # MongoDB backup script
│   ├── data.js                   # Seed/migration data helper
│   ├── migrate.js                # Monolith-to-microservices migration script
│   ├── node_modules/             # Installed dependencies; not source
│   ├── package-lock.json         # Scripts dependency lockfile
│   ├── package.json              # Scripts package manifest
│   ├── restore-data.sh           # MongoDB restore script
│   ├── seed-data.sh              # Shell seed wrapper
│   ├── seed-microservices.js     # Microservices seed script
│   ├── smoke-test.js             # HTTP smoke test script
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


### 3.2 — Source Directory Deep Dive

`docs/`

- Purpose: Stores project documentation.
- Owns: Evidence-backed documentation files from reconnaissance through improvement recommendations, plus Kubernetes guides.
- Does NOT own: Runtime source, service code, scripts, or configuration.
- Key files: `docs/INDEX.md`, `docs/00_PHASE0_RECONNAISSANCE.md`, `docs/01_PROJECT_OVERVIEW.md`, `docs/02_ARCHITECTURE.md`, `docs/KUBERNETES_GUIDE.md`, `docs/KUBERNETES_RUNBOOK.md`, `docs/KUBERNETES_TROUBLESHOOTING.md`.
- Connects to: No runtime imports found from application code.
- Pattern used: Documentation-only folder.


`k8s/`

- Purpose: Stores Kubernetes manifests for local Minikube deployment with monitoring.
- Owns: Deployment, StatefulSet, Service, ConfigMap, Secret, Ingress, HPA, NetworkPolicy manifests, and Helm values.
- Does NOT own: Docker Compose files, Dockerfiles, or application source code.
- Key subdirectories:
  - `k8s/base/`: namespace definitions, ConfigMap, Secret, NetworkPolicies.
  - `k8s/infra/`: MongoDB, Redis, RabbitMQ StatefulSets and Services with persistent volumes.
  - `k8s/apps/`: backend microservice Deployments and ClusterIP Services.
  - `k8s/edge/`: gateway, BFF Deployments, Services, and NGINX Ingress.
  - `k8s/hpa/`: HorizontalPodAutoscaler configurations for CPU-based autoscaling.
  - `k8s/monitoring/`: Helm values for kube-prometheus-stack, loki-stack, and Grafana dashboards.
- Connects to: Applied by `scripts/k8s-deploy.sh` and `kubectl apply` commands.
- Pattern used: Organized Kubernetes manifest directory structure.


`shared/`

- Purpose: Provides reusable middleware, events, errors, and HTTP client utilities for services and scripts.
- Owns: Shared auth middleware, RabbitMQ broker wrapper, event names, reusable service client, shared error class.
- Does NOT own: Service-specific controllers, models, routes, or BFF views.
- Key files:
  - `shared/index.js`: exports shared middleware, broker helpers, event names, and service client.
  - `shared/middleware/authMiddleware.js`: verifies JWT tokens and adds `req.user`; also exposes `requireAdmin` and `optional`.
  - `shared/events/broker.js`: RabbitMQ topic exchange connection, publish, consume, reconnect, and close helpers.
  - `shared/events/eventNames.js`: event-name constants used by the broker layer.
  - `shared/utils/serviceClient.js`: wrapper around `fetch` for service-to-service HTTP calls.
  - `shared/errors/AppError.js`: shared error class used by `serviceClient`.
- Connects to: Imported by service entry points, service route files, and `scripts/seed-microservices.js`.
- Pattern used: Shared package exported through `shared/index.js`.


`scripts/`

- Purpose: Holds operational and data scripts for migration, seeding, backup/restore, smoke testing, and data maintenance.
- Owns: Host-run scripts and script package manifest.
- Does NOT own: HTTP service startup, BFF rendering, gateway proxying, or runtime routes.
- Key files:
  - `scripts/package.json`: defines `migrate`, `migrate:dry`, and `smoke-test` scripts.
  - `scripts/migrate.js`: migration script using Mongoose.
  - `scripts/seed-microservices.js`: seeds microservice databases and publishes events through `shared`.
  - `scripts/smoke-test.js`: exercises health and API endpoints over HTTP.
  - `scripts/backup-data.sh`: MongoDB backup helper.
  - `scripts/restore-data.sh`: MongoDB restore helper.
  - `scripts/seed-data.sh`: shell seed wrapper.
  - `scripts/update-booking-emails.js`: booking email update/backfill helper.
  - `scripts/data.js`: data used by seed/migration scripts.
- Connects to: Imports `../shared` in `scripts/seed-microservices.js`; imports local `./data.js`; connects to MongoDB through Mongoose.
- Pattern used: Operational scripts package, separate from service packages.


`bff/`

- Purpose: Browser-facing Backend-for-Frontend that renders EJS pages and translates browser sessions into JWT-authenticated gateway calls.
- Owns: EJS templates, public CSS/JS assets, browser routes, session middleware, and gateway API client.
- Does NOT own: Direct database models, service business logic, RabbitMQ consumers, or gateway proxy rules.
- Key files:
  - `bff/src/index.js`: BFF entry point, view engine setup, middleware, session config, route mounting, health check.
  - `bff/src/middleware.js`: `isLoggedIn` and `isAdmin` middleware using session data and API calls.
  - `bff/src/utils/apiClient.js`: gateway HTTP client with retry, timeout, JSON parsing, JWT forwarding, login/register/logout/refresh helpers.
  - `bff/src/utils/dashboardCache.js`: dashboard cache helper imported by dashboard and booking routes.
  - `bff/src/routes/auth.js`: login, signup, logout routes.
  - `bff/src/routes/listings.js`: listing page and form routes, including image upload middleware.
  - `bff/src/routes/bookings.js`: booking and payment page routes.
  - `bff/src/routes/reviews.js`: review form actions.
  - `bff/src/routes/dashboard.js`: user/host dashboard routes.
  - `bff/src/routes/admin.js`: admin page routes guarded by `isAdmin`.
  - `bff/src/routes/pages.js`: static page routes.
  - `bff/src/views/`: EJS pages and partials for home, listings, bookings, dashboard, admin, users, pages, layout, includes, and error view.
  - `bff/src/public/`: CSS, client JS, and favicon served statically.
- Connects to: Calls `GATEWAY_URL` through `bff/src/utils/apiClient.js`; imports local routes, middleware, utilities, and views.
- Pattern used: Backend-for-Frontend with server-rendered EJS templates and session-to-JWT translation.

Existing BFF source subfolders:

| Folder | Purpose |
|---|---|
| `bff/src/routes/` | Browser-facing Express route handlers |
| `bff/src/utils/` | Gateway API client and dashboard cache |
| `bff/src/views/` | EJS templates grouped by feature |
| `bff/src/public/css/` | CSS files grouped by page/area |
| `bff/src/public/js/` | Client-side JavaScript for maps and form validation |


`gateway/`

- Purpose: API Gateway that applies gateway-level middleware and forwards `/api/*` traffic to service URLs.
- Owns: Proxy route mapping, gateway JWT validation, rate limiting, gateway error handling, gateway health check.
- Does NOT own: Business logic, database models, EJS rendering, or service-specific controllers.
- Key files:
  - `gateway/src/index.js`: gateway entry point; applies `morgan`, CORS, rate limiter, JWT validation, health route, proxy setup, and error handler.
  - `gateway/src/proxy.js`: maps `/api/*` prefixes to service URLs and forwards `X-User-*` headers when `req.user` exists.
  - `gateway/src/middleware/jwtValidation.js`: validates access tokens in required/optional/admin modes.
  - `gateway/src/middleware/rateLimiter.js`: gateway-level rate limiting middleware.
  - `gateway/src/middleware/errorHandler.js`: gateway error response handler.
- Connects to: Targets service URLs from environment variables, with localhost defaults in `gateway/src/proxy.js`.
- Pattern used: Thin API gateway/proxy layer.

Existing gateway source subfolders:

| Folder | Purpose |
|---|---|
| `gateway/src/middleware/` | Gateway-only JWT validation, rate limiting, and error handling |


`services/`

- Purpose: Contains independently packaged backend service directories.
- Owns: Service-specific Express entry points, route handlers, controllers, models, validators, event consumers, utilities, and Dockerfiles.
- Does NOT own: BFF views, gateway proxy routing, root-level scripts, or shared package exports.
- Key service directories:
  - `services/auth-service/`: authentication, user identity, JWT lifecycle.
  - `services/listing-service/`: listing CRUD, ownership checks, availability, geocoding, listing events.
  - `services/review-service/`: review CRUD/stats and cleanup consumers.
  - `services/booking-service/`: booking CRUD, payment handling, availability checks, booking events.
  - `services/media-service/`: Cloudinary upload/delete API.
  - `services/search-service/`: geocoding, Redis cache, in-memory listing search index, search consumers.
  - `services/admin-service/`: admin/dashboard aggregation API.
- Connects to: Imports `shared` from service entry points and route files; connects to MongoDB, Redis, RabbitMQ, Cloudinary, Razorpay, and internal service URLs where applicable.
- Pattern used: Per-service Express packages with service-local routes/controllers/models and shared cross-cutting utilities.

`services/auth-service/`

- Key files:
  - `src/index.js`: service startup, MongoDB, optional Redis, optional RabbitMQ, routes, health, error handling.
  - `src/routes/auth.js`: auth and user-management route definitions.
  - `src/controllers/auth.js`: register, login, logout, refresh, profile, user lookup/admin user actions.
  - `src/models/user.js`: Mongoose User schema with bcrypt pre-save hashing.
  - `src/utils/jwt.js`: access and refresh token generation/verification.
- Connects to: `shared` broker helpers, Redis client, MongoDB.

`services/listing-service/`

- Key files:
  - `src/index.js`: service startup, MongoDB, optional RabbitMQ, dependency injection into controller, event consumers.
  - `src/routes/listing.js`: listing route definitions.
  - `src/controllers/listing.js`: listing CRUD, ownership, geocoding, media cleanup, event publishing.
  - `src/models/listing.js`: Mongoose Listing schema and indexes.
  - `src/validators/validateListing.js`: Joi listing request validation.
  - `src/events/consumers.js`: consumes `user.deleted` and cascades listing deletion.
- Connects to: `shared`, MongoDB, RabbitMQ, Media Service, Search Service.
- Finding: `src/events/consumers.js` imports `../utils/serviceClient.js`, but no `services/listing-service/src/utils/` folder exists. The actual shared service client is `shared/utils/serviceClient.js`.

`services/review-service/`

- Key files:
  - `src/index.js`: service startup, MongoDB, optional RabbitMQ, routes, health, error handling.
  - `src/routes/review.js`: review route definitions.
  - `src/controllers/review.js`: review read/create/delete/stats operations.
  - `src/models/review.js`: Mongoose Review schema and indexes.
  - `src/validators/validateReview.js`: Joi review request validation.
  - `src/events/consumers.js`: consumes listing/user delete events.
- Connects to: `shared`, MongoDB, RabbitMQ.

`services/booking-service/`

- Key files:
  - `src/index.js`: service startup, MongoDB, optional RabbitMQ, Razorpay init, routes, health, error handling.
  - `src/routes/booking.js`: booking route definitions.
  - `src/controllers/booking.js`: booking lookup/create/payment verification/cancel/delete logic.
  - `src/models/booking.js`: Mongoose Booking schema with payment fields and indexes.
  - `src/validators/validateBooking.js`: Joi booking request validation.
  - `src/events/consumers.js`: booking event consumers.
  - `src/utils/razorpay.js`: Razorpay order, signature verification, payment fetch, refund helpers.
  - `scripts/migrate-platform-fee.js`: service-local booking migration script.
- Connects to: `shared`, MongoDB, RabbitMQ, Listing Service, Razorpay.

`services/media-service/`

- Key files:
  - `src/index.js`: service startup, health, route mounting, error handling.
  - `src/routes/media.js`: media upload/delete route definitions.
  - `src/controllers/media.js`: Cloudinary config, Multer storage, upload/delete handlers.
- Connects to: Cloudinary through `CLOUD_NAME`, `CLOUD_API_KEY`, and `CLOUD_API_SECRET`.

`services/search-service/`

- Key files:
  - `src/index.js`: service startup, optional Redis, optional RabbitMQ, initial listing sync, routes, health, error handling.
  - `src/routes/search.js`: geocode and search route definitions.
  - `src/controllers/search.js`: Redis geocode cache, Nominatim fetch, in-memory search index.
  - `src/events/consumers.js`: consumes listing lifecycle events and updates the search index.
- Connects to: `shared`, Redis, RabbitMQ, Listing Service, Nominatim/OpenStreetMap.

`services/admin-service/`

- Key files:
  - `src/index.js`: service startup, service URL injection, routes, health, error handling.
  - `src/routes/admin.js`: admin routes guarded by shared auth/admin middleware.
  - `src/controllers/admin.js`: dashboard/user/listing/review/booking aggregation actions.
- Connects to: `shared` service client and Auth, Listing, Review, Booking service URLs.


### 3.3 — Configuration Files

| File | Purpose | Key Settings |
|---|---|---|
| `.env` | Local environment file exists | Values intentionally not reproduced |
| `.env.example` | Env var template | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, `CLOUD_NAME`, `CLOUD_API_KEY`, `CLOUD_API_SECRET`, `RABBITMQ_USER`, `RABBITMQ_PASS`, `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| `.dockerignore` | Docker build ignore rules | Excludes `**/node_modules`, `.git`, IDE files, OS files, Docker Compose files, and `scripts/` |
| `.gitignore` | Git ignore rules | File exists; contents not expanded in this document |
| `.gitattributes` | Git attributes | File exists; contents not expanded in this document |
| `docker-compose.yml` | Local multi-service stack | Defines `mongodb`, `redis`, `rabbitmq`, seven backend services, `gateway`, `bff`, volumes, and `heavenly-network` |
| `docker-compose.prod.yml` | Production Compose override | Sets `NODE_ENV=production`, removes bind mounts, adds restart policies and resource limits |
| `Makefile` | Development and operations commands | `up`, `up-build`, `up-d`, `down`, `restart`, service-specific restarts, logs, backup, restore, seed, clean, rebuild, ps, volumes, mongo, redis, status |
| `gateway/package.json` | Gateway package manifest | `start`, `dev`, Express, proxy, CORS, Morgan, rate limit, JWT, Redis |
| `gateway/package-lock.json` | Gateway dependency lockfile | Locks gateway dependencies |
| `gateway/Dockerfile` | Gateway image build | `node:20-alpine`, installs `shared` and `gateway`, exposes `3000` |
| `bff/package.json` | BFF package manifest | `start`, `dev`, Express, EJS, sessions, flash, method override, Morgan, Multer |
| `bff/package-lock.json` | BFF dependency lockfile | Locks BFF dependencies |
| `bff/Dockerfile` | BFF image build | `node:20-alpine`, installs `shared` and `bff`, exposes `8080` |
| `shared/package.json` | Shared package manifest | `amqplib`, `jsonwebtoken`, `redis` |
| `shared/package-lock.json` | Shared dependency lockfile | Locks shared dependencies |
| `scripts/package.json` | Scripts package manifest | `migrate`, `migrate:dry`, `smoke-test`; dependencies `bcrypt`, `dotenv`, `mongoose` |
| `scripts/package-lock.json` | Scripts dependency lockfile | Locks scripts dependencies |
| `services/*/package.json` | Per-service package manifests | Defines each service `start`/`dev` scripts and service dependencies |
| `services/*/package-lock.json` | Per-service dependency lockfiles | Locks each service dependency tree |
| `services/*/Dockerfile` | Per-service image builds | `node:20-alpine`, installs `shared` and service package, exposes service port |

Not found in the repository scan: root `package.json`, `tsconfig.json`, `jest.config.*`, `.github/workflows/`, `.gitlab-ci.yml`, `k8s/`, `helm/`, Terraform/CDK/Pulumi/SAM/serverless config.


### 3.4 — Import/Dependency Direction

Observed dependency direction from `require(...)` statements:

```text
BFF routes
  -> bff/src/utils/apiClient.js
  -> bff/src/middleware.js
  -> BFF views/public assets by render/static configuration

BFF apiClient
  -> API Gateway over HTTP using GATEWAY_URL

Gateway entry point
  -> gateway/src/proxy.js
  -> gateway/src/middleware/*
  -> backend services over HTTP using *_SERVICE_URL

Service entry points
  -> local routes/controllers/events
  -> shared/index.js or /app/shared
  -> MongoDB/Redis/RabbitMQ/external services by config

Service routes
  -> local controllers
  -> local validators where present
  -> shared/middleware/authMiddleware.js where auth is required

Service controllers
  -> local models
  -> local utils where present
  -> shared serviceClient/event functions injected from entry point where present

Shared package
  -> shared middleware/errors/events/utils only

Scripts
  -> local script data
  -> shared/index.js where events are needed
  -> MongoDB through Mongoose
```

Confirmed import examples:

| Import Direction | Evidence |
|---|---|
| `bff/src/index.js` -> BFF routes | `require('./routes/auth.js')`, `require('./routes/listings.js')`, `require('./routes/bookings.js')` |
| BFF routes -> BFF API client | `bff/src/routes/listings.js` imports `../utils/apiClient.js` |
| BFF routes -> BFF auth middleware | `bff/src/routes/admin.js` imports `../middleware.js` |
| `gateway/src/index.js` -> gateway proxy/middleware | imports `./proxy`, `./middleware/jwtValidation`, `./middleware/rateLimiter`, `./middleware/errorHandler` |
| Service route -> controller | `services/listing-service/src/routes/listing.js` imports `../controllers/listing.js` |
| Service route -> validator | `services/booking-service/src/routes/booking.js` imports `../validators/validateBooking.js` |
| Service route -> shared auth middleware | service routes import `../../../../shared/middleware/authMiddleware` or `/app/shared/middleware/authMiddleware` |
| Service controller -> model | `services/review-service/src/controllers/review.js` imports `../models/review.js` |
| Service entry point -> shared package | service `src/index.js` files import `../../../shared` or `/app/shared` |
| Shared index -> shared modules | `shared/index.js` imports `./middleware/authMiddleware`, `./events/broker`, `./events/eventNames`, `./utils/serviceClient` |
| Scripts -> shared package | `scripts/seed-microservices.js` imports `../shared` |

Notable findings:

| Finding | Evidence | Impact |
|---|---|---|
| No root workspace import graph exists | No root `package.json` or workspaces found | Packages are colocated but not managed by root workspace tooling |
| BFF does not import service internals directly | BFF route imports point to local middleware/utils and call gateway through `apiClient` | Browser layer stays separate from service modules |
| Gateway does not import service controllers/models | Gateway imports only local proxy/middleware files | Gateway remains a proxy/middleware layer |
| Services import `shared` directly | Service entry points and routes import `../../../shared`, `/app/shared`, or shared middleware | Shared cross-cutting code is centralized |
| Broken local import candidate in Listing Service | `services/listing-service/src/events/consumers.js` requires `../utils/serviceClient.js`, but no `services/listing-service/src/utils/` folder exists | This path would fail if that event handler executes; likely should reference `shared/utils/serviceClient.js` or use injected `serviceClient` |

No circular imports were identified from the scanned `require(...)` statements. The only concrete import issue found is the missing `services/listing-service/src/utils/serviceClient.js` path.
