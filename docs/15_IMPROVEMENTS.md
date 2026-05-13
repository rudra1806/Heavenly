## Section 15 — Improvement Recommendations

### 15.1 — Critical Security Or Data-Loss Risk

| Issue | Evidence | Recommended Fix | Effort |
|---|---|---|---|
| High-severity vulnerable Cloudinary dependency in Media Service. | `services/media-service/package.json:13`; `services/media-service/package-lock.json:221`; audit finding recorded in `11_DEPENDENCIES.md`. | Upgrade `cloudinary` to the audit-reported fixed major version and verify `multer-storage-cloudinary` compatibility before deploying uploads. | 0.5-1 day |
| High-severity vulnerable `tar` transitive dependency through Auth Service `bcrypt@5.1.1`. | `services/auth-service/package.json:12`; `services/auth-service/package-lock.json:299-305`; `services/auth-service/package-lock.json:1810`; audit finding recorded in `11_DEPENDENCIES.md`. | Upgrade Auth Service `bcrypt` to `6.x`, reinstall lockfile, and rerun `npm audit --omit=dev` in `services/auth-service/`. | 0.5 day |
| Predictable/default credentials and password logging exist in local/prod-adjacent paths. | BFF fallback session secret in `bff/src/index.js:53-60`; RabbitMQ/admin defaults in `.env.example:22-30`; Compose RabbitMQ fallback in `docker-compose.yml:42-43`; seed script logs passwords in `scripts/seed-microservices.js:274-281`. | Require real secrets for non-development runs, remove production-usable password defaults from Compose fallbacks, and stop printing seed passwords. | 0.5-1 day |


### 15.2 — High Priority Reliability Or Abuse Risk

| Issue | Evidence | Recommended Fix | Effort |
|---|---|---|---|
| Listing Service event consumer requires a missing module and can fail during `user.deleted` cascade cleanup. | Missing require in `services/listing-service/src/events/consumers.js:36-39`; no `services/listing-service/src/utils/` file exists in the scanned source tree; troubleshooting record in `14_TROUBLESHOOTING.md`. | Replace `require('../utils/serviceClient.js')` with the existing shared `serviceClient` pattern used by other services, or add the missing module deliberately. | 1-2 hours |
| Auth-specific brute-force limiter is defined but not mounted on `/api/auth`. | `authRateLimiter` is defined/exported in `gateway/src/middleware/rateLimiter.js:50-65`; Gateway mounts only `rateLimiter` globally in `gateway/src/index.js:41-42`; `/api/auth` proxy route exists in `gateway/src/proxy.js:31-36`. | Mount `authRateLimiter` on `/api/auth` before proxy setup, while keeping the global limiter. | 1 hour |
| Several protected write/payment/media routes lack Joi or equivalent route-level validation. | Unvalidated routes: `services/listing-service/src/routes/listing.js:31-33`, `services/booking-service/src/routes/booking.js:31-36`, `services/media-service/src/routes/media.js:13-16`; validation gap documented in `09_SECURITY.md`. | Add targeted validators for listing updates, availability toggles, booking payment/verification/cancel/delete payloads, and media delete filename params. | 0.5-1 day |
| Gateway lacks security headers middleware. | No Helmet/security-header implementation found; `gateway/src/index.js:14-34` imports Express/Morgan/CORS/rate limiter but no `helmet`; checklist records `Security headers with Helmet` as `Not found` in `09_SECURITY.md`. | Add `helmet` or equivalent header middleware at the Gateway and configure CSP/HSTS intentionally for the BFF/API deployment. | 0.5 day |


### 15.3 — Medium Priority Developer Experience And Operations

| Issue | Evidence | Recommended Fix | Effort |
|---|---|---|---|
| Docker images run without an explicit non-root user. | No `USER` instruction appears in `gateway/Dockerfile:1-25`, `bff/Dockerfile:1-10`, or `services/auth-service/Dockerfile:1-22`; checklist records non-root Docker user as `Not found` in `09_SECURITY.md`. | Add a non-root runtime user to each Dockerfile and verify bind-mounted development volumes still work. | 0.5-1 day |
| No formal test suite exists even though there are auth, payment, migration, and event-driven flows. | Repository scan found no `*.spec.*`, `*.test.*`, `tests/`, or framework config in `00_PHASE0_RECONNAISSANCE.md`; smoke script exists but is not a formal suite. | Add focused tests first around Auth token/password flows, Booking payment state transitions, Listing event consumer cleanup, and migration scripts. | 1-3 days |
| No CI/CD or automated audit workflow exists despite known audit findings. | Repository scan found no CI/CD config in `00_PHASE0_RECONNAISSANCE.md`; dependency audit gap recorded in `09_SECURITY.md`; vulnerabilities recorded in `11_DEPENDENCIES.md`. | Add a minimal CI workflow that installs each package and runs `npm audit --omit=dev`; include smoke-test execution once Docker services are available. | 0.5-1 day |
| Metrics/APM are absent, while the system relies on multiple services, RabbitMQ, Redis, and Docker healthchecks. | Repository scan found no metrics/APM in `00_PHASE0_RECONNAISSANCE.md`; Section 10 documents only Morgan/console logs and healthchecks in `10_OBSERVABILITY.md`, with metrics marked not present in `10_OBSERVABILITY.md`. | Add minimal request/error counters and dependency health metrics at the Gateway and service level. | 1-2 days |
| BFF session cookie lacks explicit `secure` and `sameSite` settings. | BFF session config sets `httpOnly` and `maxAge` only in `bff/src/index.js:53-60`. | Set `sameSite` and environment-aware `secure` cookie options for deployed HTTPS environments. | 1-2 hours |


### 15.4 — Low Priority Maintenance

| Issue | Evidence | Recommended Fix | Effort |
|---|---|---|---|
| Several production packages are major-version behind current releases. | Major outdated list in `11_DEPENDENCIES.md`: `amqplib`, `bcrypt`, `cloudinary`, `ejs`, `express-rate-limit`, `http-proxy-middleware`, `mongoose` in scripts, and `redis`. | Schedule dependency upgrades package-by-package with smoke-test verification after each service change. | 1-3 days |
| Gateway CORS defaults to wildcard origin while credentials are enabled. | `gateway/src/index.js:31-34` uses `origin: process.env.CORS_ORIGIN || '*'` and `credentials: true`; CORS gap documented in `09_SECURITY.md`. | Require `CORS_ORIGIN` outside local development and document the expected deployed origin. | 1-2 hours |
| No Docker healthcheck is defined for the BFF service in Compose. | Section 10 documents healthchecks for Gateway/services and notes no BFF Compose healthcheck in `10_OBSERVABILITY.md`; BFF has `/health` in `bff/src/index.js:78-85`; Compose BFF service lacks healthcheck in `docker-compose.yml:353-374`. | Add a BFF Compose healthcheck using `http://localhost:8080/health`. | 1 hour |

