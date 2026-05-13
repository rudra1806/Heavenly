SECTION: Security Analysis
FILE: 09_SECURITY.md
COVERS:
- JWT authentication in Auth Service, Gateway, shared middleware, and BFF session guards.
- Admin role authorization in Gateway, shared middleware, Admin Service, BFF admin routes, and Booking Service ownership/admin checks.
- Password hashing with bcrypt in the Auth Service user model and seed script.
- Joi validation for listing, booking, and review create routes; Mongoose validation for user fields.
- CORS configuration in the Gateway and services.
- Gateway rate limiting with `express-rate-limit`.
- Secrets and credential handling from `.env.example`, `.env`, `.gitignore`, Docker Compose, and `process.env.*` references.
- File upload security observations from Media Service Cloudinary/Multer configuration.
SKIPS:
- API security headers subsection skipped because no `helmet` or explicit security-header middleware was found.
- OAuth strategy skipped because Phase 0 found JWT authentication only.
- API-key authentication skipped because Phase 0 found JWT authentication only.
- HTTPS enforcement marked absent in the checklist because no app-level HTTPS redirect or HSTS configuration was found.

## Section 9 — Security Analysis

### 9.1 — Authentication Strategy

Authentication is JWT-based.

| Area | Implementation | Evidence |
|---|---|---|
| Token generation | Auth Service signs access and refresh tokens with `jsonwebtoken`. | `services/auth-service/src/utils/jwt.js:14-18`, `services/auth-service/src/utils/jwt.js:28-49` |
| Token verification | Auth Service verifies access and refresh tokens with `jwt.verify`. | `services/auth-service/src/utils/jwt.js:62-73` |
| Gateway auth enforcement | Gateway applies optional JWT validation to browse/read routes and required JWT validation to bookings, media, and admin routes. | `gateway/src/index.js:53-61` |
| Gateway admin enforcement | `/api/admin` requires both `jwtValidation.required` and `jwtValidation.requireAdmin`. | `gateway/src/index.js:61`, `gateway/src/middleware/jwtValidation.js:82-90` |
| Service-level auth middleware | Shared middleware validates bearer tokens and attaches decoded user details to `req.user`. | `shared/middleware/authMiddleware.js:15-40` |
| BFF session guard | BFF stores JWT/session user data and protects pages with `isLoggedIn`. | `bff/src/middleware.js:22-85` |
| BFF admin guard | BFF checks `req.session.user.role === 'admin'`. | `bff/src/middleware.js:90-96` |

Noted gaps:

| Gap | Evidence | Impact |
|---|---|---|
| No startup validation for `JWT_SECRET` / `JWT_REFRESH_SECRET`. | Secrets are read from `process.env` in `services/auth-service/src/utils/jwt.js:16-17`; shared middleware handles missing `JWT_SECRET` at request time in `shared/middleware/authMiddleware.js:28-34`. | Misconfiguration can surface during auth requests instead of at boot. |
| Auth Service internal user lookup route is not protected at the service route layer. | `router.get('/auth/users/:id', authController.getUserById)` has no `authMiddleware` in `services/auth-service/src/routes/auth.js:43`. | This may be intentional for internal service calls, but service-level access depends on network/gateway boundaries. |

✅ CHECKPOINT: 9.1 — Authentication Strategy complete. Proceeding to 9.2 — Password Handling.

### 9.2 — Password Handling

Password hashing is implemented with bcrypt.

| Control | Implementation | Evidence |
|---|---|---|
| Password field exists | `password` is required and has minimum length 6 in the Mongoose user schema. | `services/auth-service/src/models/user.js:39-43` |
| Hashing algorithm | `bcrypt` is imported directly. | `services/auth-service/src/models/user.js:16-20` |
| Salt rounds | `SALT_ROUNDS = 12`. | `services/auth-service/src/models/user.js:20` |
| Hash before save | Mongoose `pre('save')` hashes modified passwords with `bcrypt.genSalt` and `bcrypt.hash`. | `services/auth-service/src/models/user.js:59-64` |
| Password verification | `comparePassword` uses `bcrypt.compare`. | `services/auth-service/src/models/user.js:72-74` |
| Password excluded from JSON | `toJSON()` deletes `user.password`. | `services/auth-service/src/models/user.js:82-85` |
| Seed passwords hashed | Seed script hashes admin/sample users with bcrypt before insertion. | `scripts/seed-microservices.js:79-96` |

Noted gaps:

| Gap | Evidence | Impact |
|---|---|---|
| `.env.example` includes development admin password value. | `.env.example:28-30` | This is acceptable for an example file only if real deployments override it. |
| Seed script logs generated/admin password values to console. | `scripts/seed-microservices.js:274-281` | Seed output may expose development credentials in terminal logs. |

✅ CHECKPOINT: 9.2 — Password Handling complete. Proceeding to 9.3 — Input Validation.

### 9.3 — Input Validation

Input validation is present, but it is not applied consistently across every write route.

| Layer | Validation Found | Evidence |
|---|---|---|
| Listing create request | Joi schema validates `title`, `description`, `price`, `location`, `country`, optional `maxGuests`, `image`, and `geometry`. | `services/listing-service/src/validators/validateListing.js:6-65`; applied in `services/listing-service/src/routes/listing.js:30` |
| Booking create request | Joi schema validates `listingId`, ISO `checkIn`, ISO `checkOut` after `checkIn`, and positive integer `guests`. | `services/booking-service/src/validators/validateBooking.js:5-33`; applied in `services/booking-service/src/routes/booking.js:30` |
| Review create request | Joi schema validates `comment`, `rating`, and `listingId`. | `services/review-service/src/validators/validateReview.js:5-34`; applied in `services/review-service/src/routes/review.js:29` |
| User registration | Manual required-field checks plus Mongoose schema validation for username/email/password. | `services/auth-service/src/controllers/auth.js:34-42`, `services/auth-service/src/controllers/auth.js:80-87`, `services/auth-service/src/models/user.js:22-48` |
| File upload metadata | Media Service sanitizes custom Cloudinary public ID input and limits allowed formats to `jpg`, `jpeg`, `png`, and `avif`. | `services/media-service/src/controllers/media.js:20-30` |

Routes found without Joi middleware or equivalent route-level schema validation:

| Route | Gap | Evidence |
|---|---|---|
| `PUT /listings/:id` | Protected route updates listing data but does not apply `validateListing`. | `services/listing-service/src/routes/listing.js:31` |
| `POST /listings/:id/toggle-availability` | Protected state-changing route has no body/schema validation. | `services/listing-service/src/routes/listing.js:33` |
| `POST /bookings/:id/payment` | Protected payment route has no Joi middleware. | `services/booking-service/src/routes/booking.js:31` |
| `POST /bookings/:id/verify-payment` | Protected payment verification route has no Joi middleware. | `services/booking-service/src/routes/booking.js:32` |
| `POST /bookings/:id/cancel` | Protected cancellation route has no Joi middleware. | `services/booking-service/src/routes/booking.js:33` |
| `DELETE /media/:filename` | Delete route has no schema middleware; controller rejects missing/default filename only. | `services/media-service/src/routes/media.js:16`, `services/media-service/src/controllers/media.js:73-82` |

✅ CHECKPOINT: 9.3 — Input Validation complete. Proceeding to 9.4 — API Security Headers.

### 9.4 — API Security Headers

> ⬜ NOT PRESENT — API Security Headers
> Evidence: No `helmet` package, `app.use(helmet(...))`, `Strict-Transport-Security`, `Content-Security-Policy`, or security-header middleware found in repository.
> This section is skipped. If this feature is added later, document it here.

✅ CHECKPOINT: 9.4 — API Security Headers complete. Proceeding to 9.5 — CORS Configuration.

### 9.5 — CORS Configuration

CORS is configured in the Gateway and enabled with default settings in each backend service.

| Component | CORS Configuration | Evidence |
|---|---|---|
| Gateway | `cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true })` | `gateway/src/index.js:30-34` |
| Auth Service | `app.use(cors())` | `services/auth-service/src/index.js:41` |
| Listing Service | `app.use(cors())` | `services/listing-service/src/index.js:40` |
| Review Service | `app.use(cors())` | `services/review-service/src/index.js:36` |
| Booking Service | `app.use(cors())` | `services/booking-service/src/index.js:38` |
| Media Service | `app.use(cors())` | `services/media-service/src/index.js:26` |
| Search Service | `app.use(cors())` | `services/search-service/src/index.js:36` |
| Admin Service | `app.use(cors())` | `services/admin-service/src/index.js:37` |

Noted gaps:

| Gap | Evidence | Impact |
|---|---|---|
| Gateway defaults to wildcard origin while also setting `credentials: true`. | `gateway/src/index.js:31-34` | A deployment without `CORS_ORIGIN` has broad browser access policy at the gateway layer. |
| Services use `cors()` defaults. | Service index files listed above | Services allow default CORS behavior if exposed directly instead of only behind the gateway. |

✅ CHECKPOINT: 9.5 — CORS Configuration complete. Proceeding to 9.6 — Rate Limiting.

### 9.6 — Rate Limiting

Gateway-level rate limiting is implemented with `express-rate-limit`.

| Limiter | Scope | Configuration | Evidence |
|---|---|---|---|
| `rateLimiter` | Applied globally before proxy setup. | 500 requests per 15 minutes; standard headers enabled; legacy headers disabled; skips `/health`. | `gateway/src/index.js:41-42`, `gateway/src/middleware/rateLimiter.js:23-48` |
| `authRateLimiter` | Defined but not applied in the files found. | 20 requests per 15 minutes with auth-specific error response. | Defined in `gateway/src/middleware/rateLimiter.js:50-65`; no usage found beyond export |

Noted gap:

| Gap | Evidence | Impact |
|---|---|---|
| The stricter `authRateLimiter` is exported but not mounted on `/api/auth`. | `gateway/src/middleware/rateLimiter.js:51-65`; `gateway/src/index.js:41-64`; `gateway/src/proxy.js:31-36` | Auth routes receive the global 500/15m limit, not the intended 20/15m brute-force limit described in the limiter file comments. |

✅ CHECKPOINT: 9.6 — Rate Limiting complete. Proceeding to 9.7 — Secrets and Credentials.

### 9.7 — Secrets and Credentials

Secrets are configured through environment variables, with several development defaults present in examples and Compose fallbacks.

| Secret / Credential | Handling Found | Evidence |
|---|---|---|
| JWT secrets | Read from `process.env.JWT_SECRET` and `process.env.JWT_REFRESH_SECRET`; listed in `.env.example`; passed through Docker Compose. | `services/auth-service/src/utils/jwt.js:16-17`, `.env.example:4-5`, `docker-compose.yml:68-69` |
| Session secret | BFF reads `SESSION_SECRET` with fallback `heavenly-bff-session-secret`. | `bff/src/index.js:53-60` |
| Cloudinary credentials | Media Service reads `CLOUD_NAME`, `CLOUD_API_KEY`, and `CLOUD_API_SECRET` from environment. | `services/media-service/src/controllers/media.js:12-17`, `.env.example:15-17` |
| RabbitMQ credentials | Compose and seed scripts use `RABBITMQ_USER` / `RABBITMQ_PASS`; Compose has fallback password `heavenly123`. | `docker-compose.yml:41-43`, `scripts/seed-microservices.js:235-238` |
| Razorpay credentials | Booking Service reads `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`; missing values disable Razorpay initialization. | `services/booking-service/src/utils/razorpay.js:16-24`, `.env.example:35-36` |
| Local `.env` file | `.env` exists locally with secret variable names, and `.gitignore` excludes `.env`; `git ls-files` shows only `.env.example` tracked. | `.gitignore:1-2`; local `.env` variable names found by scan; `git ls-files .env .env.example` returned `.env.example` only |

Hardcoded/default credential observations:

| Finding | Evidence | Risk |
|---|---|---|
| BFF has a hardcoded fallback session secret. | `bff/src/index.js:53-60` | Non-Compose local runs can use a predictable session signing secret. |
| `.env.example` contains development RabbitMQ and admin password values. | `.env.example:22-30` | Safe as documentation only if real deployments override them. |
| Docker Compose RabbitMQ password fallback is `heavenly123`. | `docker-compose.yml:42-43` | Deployment without `RABBITMQ_PASS` uses a predictable broker password. |
| Seed script includes sample user passwords and logs generated credentials. | `scripts/seed-microservices.js:39-45`, `scripts/seed-microservices.js:274-281` | Development seed logs can expose credentials. |

✅ CHECKPOINT: 9.7 — Secrets and Credentials complete. Proceeding to 9.8 — Security Checklist.

### 9.8 — Security Checklist

| Check | Status | Evidence / Location | Action Needed |
|---|---|---|---|
| Passwords hashed with bcrypt/argon2 | ✅ | `services/auth-service/src/models/user.js:59-64`; `scripts/seed-microservices.js:79-96` | — |
| JWT secret from env var | ✅ | `services/auth-service/src/utils/jwt.js:16-17`; `gateway/src/middleware/jwtValidation.js:14-15`; `shared/middleware/authMiddleware.js:1-3` | Add startup validation so missing secrets fail fast. |
| Inputs validated with library | ✅ | Joi validators in `services/listing-service/src/validators/validateListing.js`, `services/booking-service/src/validators/validateBooking.js`, and `services/review-service/src/validators/validateReview.js` | Add validation to the uncovered write/payment/media routes listed in 9.3. |
| Rate limiting on auth routes | ✅ | Global limiter mounted at `gateway/src/index.js:41-42`; `/api/auth` proxy route exists at `gateway/src/proxy.js:31-36` | Mount exported `authRateLimiter` for `/api/auth` if the intended 20/15m brute-force limit should apply. |
| HTTPS enforced | ❌ | Not found | Add HTTPS redirect/HSTS at the gateway or reverse-proxy layer and document it here. |
| No hardcoded credentials | ❌ | Hardcoded/default values found in `bff/src/index.js:53-60`, `.env.example:22-30`, `docker-compose.yml:42-43`, `scripts/seed-microservices.js:39-45` | Replace production defaults with required env validation; keep only safe placeholders in examples. |
| Security headers with Helmet | ❌ | Not found | Add `helmet` or equivalent security-header middleware. |
| Non-root Docker user | ❌ | Not found | Add `USER` instructions to `gateway/Dockerfile`, `bff/Dockerfile`, and `services/*/Dockerfile`. |
| Dependencies audited | ❌ | Not found | Add a documented audit command or CI/dependency scanning step. |
| SQL injection prevention | ⬜ N/A | Phase 0 found no relational database, SQL query layer, Prisma, TypeORM, or Sequelize; MongoDB/Mongoose is used instead. | — |

✅ CHECKPOINT: 9.8 — Security Checklist complete. Proceeding to stop as instructed.
