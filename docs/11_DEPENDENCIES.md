## Section 11 - Dependencies

### 11.1 - Production Dependency Inventory

| Package | Version(s) Declared | Category | Why Used | Important Config / Evidence | Flags |
|---|---|---|---|---|---|
| `express` | `^5.2.1` | HTTP framework | Gateway, BFF, and services define Express apps and route modules. | `gateway/package.json:12`, `bff/package.json:16`, `services/auth-service/package.json:13`; imports in `gateway/src/index.js:14`, `bff/src/index.js:18` | - |
| `mongoose` | `^9.1.4`, scripts `^8.15.1` | MongoDB ODM | Service models and migration/seed scripts connect to MongoDB and define schemas. | `services/auth-service/package.json:15`, `services/booking-service/package.json:13`, `scripts/package.json:13`; imports in `services/auth-service/src/index.js:16`, `scripts/migrate.js:25` | WARNING: scripts package is major-version behind latest (`8.23.1` wanted, `9.6.2` latest from `npm outdated`). |
| `redis` | `^4.7.0` | Cache/client | Auth/Search/Gateway/shared Redis support. | `gateway/package.json:18`, `shared/package.json:10`, `services/search-service/package.json:13`; import in `services/search-service/src/index.js:16` | WARNING: major-version behind latest (`4.7.1` wanted, `5.12.1` latest from `npm outdated`). |
| `amqplib` | `^0.10.4` | RabbitMQ client | Shared event broker and service event publishing/consuming. | `shared/package.json:8`, `services/auth-service/package.json:17`, `services/booking-service/package.json:14`; import in `shared/events/broker.js:32` | WARNING: major-version behind latest (`0.10.9` wanted, `2.0.1` latest from `npm outdated`). |
| `jsonwebtoken` | `^9.0.2` | Authentication | JWT signing and verification in Auth Service, Gateway, and shared middleware. | `gateway/package.json:17`, `shared/package.json:9`, `services/auth-service/package.json:14`; imports in `services/auth-service/src/utils/jwt.js:14`, `gateway/src/middleware/jwtValidation.js:14` | - |
| `bcrypt` | Auth Service `^5.1.1`, scripts `^6.0.0` | Password hashing | User password hashing/comparison and seed password hashing. | `services/auth-service/package.json:12`, `scripts/package.json:11`; imports in `services/auth-service/src/models/user.js:17`, `scripts/seed-microservices.js:16` | HIGH VULN in Auth Service transitive tree; WARNING: Auth Service major-version behind latest (`5.1.1` wanted, `6.0.0` latest). |
| `joi` | `^18.0.2` | Input validation | Validates listing, booking, and review request bodies. | `services/listing-service/package.json:15`, `services/booking-service/package.json:15`, `services/review-service/package.json:15`; imports in validator files | - |
| `cors` | `^2.8.5` | HTTP middleware | CORS middleware in Gateway and services. | `gateway/package.json:14`, `services/auth-service/package.json:19`; imports in `gateway/src/index.js:16`, `services/auth-service/src/index.js:18` | - |
| `morgan` | `^1.10.0` | Request logging | Request logging in Gateway, BFF, and services. | `gateway/package.json:15`, `bff/package.json:19`, `services/admin-service/package.json:14`; imports in `gateway/src/index.js:15`, `bff/src/index.js:24` | - |
| `multer` | BFF `^2.1.1`, services `^2.0.2` | File upload middleware | BFF listing image form upload handling and Media Service upload parser. | `bff/package.json:20`, `services/listing-service/package.json:18`, `services/media-service/package.json:14`; imports in `bff/src/routes/listings.js:10`, `services/media-service/src/controllers/media.js:10` | - |
| `cloudinary` | `^1.41.3` | Media storage SDK | Media Service Cloudinary upload/delete integration. | `services/media-service/package.json:13`; import/config in `services/media-service/src/controllers/media.js:8-17` | HIGH VULN; WARNING: major-version behind latest (`1.41.3` wanted, `2.10.0` latest). |
| `multer-storage-cloudinary` | `^4.0.0` | Upload storage adapter | Connects Multer storage to Cloudinary. | `services/media-service/package.json:15`; import in `services/media-service/src/controllers/media.js:9` | HIGH VULN via vulnerable `cloudinary` dependency reported by `npm audit`. |
| `razorpay` | `^2.9.4` | Payments SDK | Booking Service payment order, verification, fetch, and refund integration. | `services/booking-service/package.json:18`; import in `services/booking-service/src/utils/razorpay.js:7` | - |
| `ejs` | `^4.0.1` | Server-rendered templates | BFF view rendering. | `bff/package.json:14`; BFF sets `view engine` in `bff/src/index.js:40` | WARNING: major-version behind latest (`4.0.1` wanted, `5.0.2` latest). |
| `ejs-mate` | `^4.0.0` | EJS layout helper | BFF layout engine support. | `bff/package.json:15`; BFF engine setup in `bff/src/index.js` | - |
| `express-session` | `^1.18.2` | Session middleware | BFF session storage for user/JWT state. | `bff/package.json:17`; import/config in `bff/src/index.js:21`, `bff/src/index.js:50-62` | - |
| `connect-flash` | `^0.1.1` | Flash messages | BFF flash messages. | `bff/package.json:12`; import/use in `bff/src/index.js:22`, `bff/src/index.js:63` | - |
| `method-override` | `^3.0.0` | HTML method override | BFF form support for PUT/DELETE style actions. | `bff/package.json:18`; import/use in `bff/src/index.js:23`, `bff/src/index.js:48` | - |
| `http-proxy-middleware` | `^3.0.3` | Gateway proxy | Proxies `/api/*` routes from Gateway to backend services. | `gateway/package.json:13`; import in `gateway/src/proxy.js:12` | WARNING: major-version behind latest (`3.0.5` wanted, `4.0.0` latest). |
| `express-rate-limit` | `^7.5.0` | Rate limiting | Gateway global and auth rate limiters. | `gateway/package.json:16`; import/config in `gateway/src/middleware/rateLimiter.js:21-65` | WARNING: major-version behind latest (`7.5.1` wanted, `8.5.1` latest). |
| `dotenv` | `^17.4.2` | Script env loading | Loads `.env` for seed and migration scripts. | `scripts/package.json:12`; import/use in `scripts/seed-microservices.js:14`, `services/booking-service/scripts/migrate-platform-fee.js:15` | - |

Verified audit/outdated commands:

```bash
npm audit --omit=dev --json
npm outdated --omit=dev --json
```

These were run per package directory on 2026-05-13.


### 11.2 - Vulnerability Findings

`npm audit --omit=dev` reported no production vulnerabilities for:

| Package Directory | Audit Result |
|---|---|
| `gateway/` | 0 vulnerabilities |
| `bff/` | 0 vulnerabilities |
| `shared/` | 0 vulnerabilities |
| `scripts/` | 0 vulnerabilities |
| `services/admin-service/` | 0 vulnerabilities |
| `services/booking-service/` | 0 vulnerabilities |
| `services/listing-service/` | 0 vulnerabilities |
| `services/review-service/` | 0 vulnerabilities |
| `services/search-service/` | 0 vulnerabilities |

Production vulnerabilities found:

| Severity | Package Directory | Affected Package | Direct? | Finding | Evidence | Fix Reported By Audit |
|---|---|---|---:|---|---|---|
| High | `services/auth-service/` | `tar` via `@mapbox/node-pre-gyp` via `bcrypt@5.1.1` | No | Multiple `node-tar` path traversal / arbitrary file overwrite advisories including `GHSA-34x7-hfp2-rc4v`, `GHSA-8qq5-rm4j-mr97`, `GHSA-83g3-92jg-28cx`, `GHSA-qffp-2rhf-9h96`, `GHSA-9ppj-qmqm-q256`, and `GHSA-r6q2-hw4h-h46w`. | `services/auth-service/package.json:12`; lock evidence `services/auth-service/package-lock.json:299-305`, `services/auth-service/package-lock.json:1810` | `fixAvailable: true`; `npm outdated` also shows `bcrypt` latest `6.0.0`. |
| High | `services/media-service/` | `cloudinary@1.41.3` | Yes | Cloudinary Node SDK arbitrary argument injection through parameters including ampersand, `GHSA-g4mf-96x5-5m2c`. | `services/media-service/package.json:13`; lock evidence `services/media-service/package-lock.json:221` | Upgrade reported to `cloudinary@2.10.0` with semver-major change. |
| High | `services/media-service/` | `multer-storage-cloudinary@4.0.0` via `cloudinary` | Yes | Audit marks `multer-storage-cloudinary` affected through vulnerable `cloudinary`. | `services/media-service/package.json:15`; lock evidence `services/media-service/package-lock.json:748`, `services/media-service/package-lock.json:905` | Audit reports a semver-major fix path involving `multer-storage-cloudinary@2.2.1`; review compatibility before changing. |


### 11.3 - Major Outdated Packages

Only packages with a newer major version are listed here.

| Package | Current / Wanted | Latest | Used In | Evidence |
|---|---:|---:|---|---|
| `amqplib` | `0.10.9` | `2.0.1` | `shared/`, Auth, Booking, Listing, Review, Search services | `shared/package.json:8`, `services/auth-service/package.json:17`, `services/booking-service/package.json:14`, `services/listing-service/package.json:14`, `services/review-service/package.json:14`, `services/search-service/package.json:14` |
| `bcrypt` | `5.1.1` | `6.0.0` | Auth Service | `services/auth-service/package.json:12` |
| `cloudinary` | `1.41.3` | `2.10.0` | Media Service | `services/media-service/package.json:13` |
| `ejs` | `4.0.1` | `5.0.2` | BFF | `bff/package.json:14` |
| `express-rate-limit` | `7.5.1` | `8.5.1` | Gateway | `gateway/package.json:16` |
| `http-proxy-middleware` | `3.0.5` | `4.0.0` | Gateway | `gateway/package.json:13` |
| `mongoose` | `8.23.1` | `9.6.2` | `scripts/` package only | `scripts/package.json:13` |
| `redis` | `4.7.1` | `5.12.1` | Gateway, shared, Auth Service, Search Service | `gateway/package.json:18`, `shared/package.json:10`, `services/auth-service/package.json:16`, `services/search-service/package.json:13` |

Packages that `npm outdated` listed but that are not major-version behind are not flagged here.

