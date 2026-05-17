## Section 4a — Backend Routes

### 4.1 — API Architecture Overview

| Property | Finding | Evidence |
|---|---|---|
| API style | REST/HTTP JSON APIs | `services/*/src/routes/*.js` use Express routers |
| Gateway base | `http://localhost:3000/api` by default | `gateway/src/proxy.js` and `gateway/src/index.js` |
| Versioning | No version segment found | Gateway routes are `/api/auth`, `/api/listings`, `/api/reviews`, `/api/bookings`, `/api/media`, `/api/search`, `/api/geocode`, `/api/admin`, `/api/dashboard` |
| Direct service routes | No `/api` prefix inside services | Service route files define `/auth/*`, `/listings/*`, `/reviews/*`, `/bookings/*`, `/media/*`, `/search`, `/geocode`, `/admin/*` |
| Response wrapper | No centralized wrapper found | Controllers return inline JSON; common shape is `{ success, data }` or `{ success, message, data }` |
| Error shape | Inline per controller | Common shape is `{ success: false, error: "..." }` |

Gateway route mapping:

| Gateway Prefix | Service Route Prefix | Target Service Evidence |
|---|---|---|
| `/api/auth` | `/auth` | `gateway/src/proxy.js` |
| `/api/listings` | `/listings` | `gateway/src/proxy.js` |
| `/api/reviews` | `/reviews` | `gateway/src/proxy.js` |
| `/api/bookings` | `/bookings` | `gateway/src/proxy.js` |
| `/api/media` | `/media` | `gateway/src/proxy.js` |
| `/api/search` | `/search` | `gateway/src/proxy.js` |
| `/api/geocode` | `/geocode` | `gateway/src/proxy.js` |
| `/api/admin` | `/admin` | `gateway/src/proxy.js` |
| `/api/dashboard` | `/dashboard` | `gateway/src/proxy.js` |

Relevant gateway proxy code:

```js
// gateway/src/proxy.js
const ROUTES = [
    { path: '/api/auth', target: SERVICES.auth, servicePrefix: '/auth' },
    { path: '/api/listings', target: SERVICES.listing, servicePrefix: '/listings' },
    { path: '/api/reviews', target: SERVICES.review, servicePrefix: '/reviews' },
    { path: '/api/bookings', target: SERVICES.booking, servicePrefix: '/bookings' },
    { path: '/api/media', target: SERVICES.media, servicePrefix: '/media' },
    { path: '/api/search', target: SERVICES.search, servicePrefix: '/search' },
    { path: '/api/geocode', target: SERVICES.search, servicePrefix: '/geocode' },
// ... rest of file
```

Rate limiting: requests through the gateway pass through `rateLimiter` in `gateway/src/index.js`. Direct service calls that bypass the gateway do not use that gateway rate limiter.

Auth model in route files:

| Route Area | Auth Evidence |
|---|---|
| Gateway bookings/media/admin | `gateway/src/index.js` applies `jwtValidation.required`; admin also uses `jwtValidation.requireAdmin` |
| Auth protected routes | `services/auth-service/src/routes/auth.js` uses `authMiddleware` and `authMiddleware.requireAdmin` |
| Listing protected writes | `services/listing-service/src/routes/listing.js` uses `authMiddleware` |
| Review create/delete | `services/review-service/src/routes/review.js` uses `authMiddleware` |
| Booking create/payment/cancel/delete | `services/booking-service/src/routes/booking.js` uses `authMiddleware` |
| Admin service routes | `services/admin-service/src/routes/admin.js` applies `router.use(authMiddleware)` and `router.use(authMiddleware.requireAdmin)` |


### 4.2 — Complete Endpoint Reference

#### Auth Resource

Route file: `services/auth-service/src/routes/auth.js`  
Controller: `services/auth-service/src/controllers/auth.js`

| Method | Gateway Route | Service Route | Purpose | Auth Required | Handler | Request Body / Query | Success Response | Error Responses |
|---|---|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | `/auth/register` | Create user account and return tokens | No | `authController.register()` | Body: `username`, `email`, `password` | `201 { success, message, data: { user, accessToken, refreshToken } }` | `400` missing fields or Mongoose validation, `409` username/email taken, `500` registration failed |
| POST | `/api/auth/login` | `/auth/login` | Authenticate username/email and password | No | `authController.login()` | Body: `username`, `password` | `200 { success, message, data: { user, accessToken, refreshToken } }` | `400` missing credentials, `401` invalid credentials, `500` login failed |
| POST | `/api/auth/refresh` | `/auth/refresh` | Exchange refresh token for access token | No | `authController.refresh()` | Body: `refreshToken` | `200 { success, data: { accessToken } }` | `400` missing refresh token, `401` expired/invalid/user not found, `500` refresh failed |
| POST | `/api/auth/logout` | `/auth/logout` | Blacklist current access token when Redis is injected | Yes | `authController.logout()` | Header: `Authorization: Bearer <token>` | `200 { success, message }` | `401` from `authMiddleware`, `500` logout failed |
| GET | `/api/auth/me` | `/auth/me` | Return current authenticated profile | Yes | `authController.me()` | Header: `Authorization: Bearer <token>` | `200 { success, data: { user } }` | `401` from `authMiddleware`, `404` user not found, `500` profile failed |
| GET | `/api/auth/users/:id` | `/auth/users/:id` | Fetch user by ID for internal/BFF checks | No service route guard | `authController.getUserById()` | Param: `id` | `200 { success, data: { user: { _id, username, email, role } } }` | `404` user not found, `500` fetch failed |
| GET | `/api/auth/users` | `/auth/users` | List users, optional search | Yes, admin | `authController.getAllUsers()` | Query: `search` optional | `200 { success, data: { users, count } }` | `401/403` from middleware, `500` fetch failed |
| DELETE | `/api/auth/users/:id` | `/auth/users/:id` | Delete user and publish cascade event if publisher injected | Yes, admin | `authController.deleteUser()` | Param: `id` | `200 { success, message }` | `400` self-delete attempt, `401/403` from middleware, `404` user not found, `500` delete failed |

Example request:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"secret123"}'
```

Example response:

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { "_id": "userId", "username": "alice", "email": "alice@example.com", "role": "user" },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```


#### Listing Resource

Route file: `services/listing-service/src/routes/listing.js`  
Controller: `services/listing-service/src/controllers/listing.js`  
Validator: `services/listing-service/src/validators/validateListing.js`

| Method | Gateway Route | Service Route | Purpose | Auth Required | Handler | Request Body / Query | Success Response | Error Responses |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/listings` | `/listings` | List listings sorted by newest | No; gateway/service optional auth only | `listingController.getAllListings()` | Query: `ownerId`, `isAvailable` optional | `200 { success, data: { listings, count } }` | `500` fetch failed |
| GET | `/api/listings/:id` | `/listings/:id` | Fetch one listing | No; gateway/service optional auth only | `listingController.getListing()` | Param: `id` | `200 { success, data: { listing } }` | `404` listing not found, `500` fetch failed |
| POST | `/api/listings` | `/listings` | Create listing | Yes | `listingController.createListing()` | Body validated by `validateListing` | `201 { success, message, data: { listing } }` | `400` Joi/Mongoose validation, `401` auth required, `500` create failed |
| PUT | `/api/listings/:id` | `/listings/:id` | Update listing | Yes, owner/admin in controller | `listingController.updateListing()` | Body: partial `title`, `description`, `price`, `location`, `country`, `maxGuests`, `image` | `200 { success, message, data: { listing } }` | `403` not owner/admin, `404` not found, `400` Mongoose validation, `500` update failed |
| DELETE | `/api/listings/:id` | `/listings/:id` | Delete listing and publish delete event | Yes, owner/admin in controller | `listingController.deleteListing()` | Param: `id` | `200 { success, message }` | `403` not owner/admin, `404` not found, `500` delete failed |
| POST | `/api/listings/:id/toggle-availability` | `/listings/:id/toggle-availability` | Flip `isAvailable` | Yes, owner/admin in controller | `listingController.toggleAvailability()` | Param: `id` | `200 { success, message, data: { listing } }` | `403` not owner/admin, `404` not found, `500` toggle failed |

Validated create fields from `validateListing.js`:

| Field | Validation |
|---|---|
| `title` | required string, trimmed, min 3, max 100 |
| `description` | required string, trimmed, min 10, max 1000 |
| `price` | required positive number |
| `location` | required string, trimmed, min 2, max 100 |
| `country` | required string, trimmed, min 2, max 60 |
| `maxGuests` | optional integer, min 1, max 50 |
| `image.url` | optional URI or empty string |
| `image.filename` | optional string or empty string |
| `geometry.type` | optional `Point` |
| `geometry.coordinates` | optional two-number array |

Example request:

```bash
curl -X POST http://localhost:3000/api/listings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Sea View Stay","description":"Apartment near the coast","price":2500,"location":"Goa","country":"India","maxGuests":4}'
```

Example response:

```json
{
  "success": true,
  "message": "Listing created successfully.",
  "data": { "listing": { "_id": "listingId", "title": "Sea View Stay", "ownerId": "userId" } }
}
```


#### Review Resource

Route file: `services/review-service/src/routes/review.js`  
Controller: `services/review-service/src/controllers/review.js`  
Validator: `services/review-service/src/validators/validateReview.js`

| Method | Gateway Route | Service Route | Purpose | Auth Required | Handler | Request Body / Query | Success Response | Error Responses |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/reviews` | `/reviews` | List reviews, optionally filtered | No; gateway optional auth only | `reviewController.getReviews()` | Query: `listingIds`, `listingId`, `authorId` optional | `200 { success, data: { reviews, count, averageRating } }` | `500` fetch failed |
| GET | `/api/reviews/stats/:listingId` | `/reviews/stats/:listingId` | Listing rating count/average | No; gateway optional auth only | `reviewController.getListingStats()` | Param: `listingId` | `200 { success, data: { listingId, count, averageRating } }` | `500` stats failed |
| GET | `/api/reviews/:id` | `/reviews/:id` | Fetch one review | No; gateway optional auth only | `reviewController.getReview()` | Param: `id` | `200 { success, data: { review } }` | `404` review not found, `500` fetch failed |
| POST | `/api/reviews` | `/reviews` | Create review | Yes | `reviewController.createReview()` | Body validated by `validateReview` | `201 { success, message, data: { review } }` | `400` Joi/Mongoose validation, `401` auth required, `500` create failed |
| DELETE | `/api/reviews/:id` | `/reviews/:id` | Delete review | Yes, author/admin in controller | `reviewController.deleteReview()` | Param: `id` | `200 { success, message }` | `403` not author/admin, `404` not found, `500` delete failed |

Validated create fields from `validateReview.js`:

| Field | Validation |
|---|---|
| `comment` | required string, trimmed, min 5, max 500 |
| `rating` | required integer, min 1, max 5 |
| `listingId` | required string |

Example request:

```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"listingId":"listingId","rating":5,"comment":"Great stay"}'
```

Example response:

```json
{
  "success": true,
  "message": "Review created successfully.",
  "data": { "review": { "_id": "reviewId", "listingId": "listingId", "rating": 5 } }
}
```


#### Booking Resource

Route file: `services/booking-service/src/routes/booking.js`  
Controller: `services/booking-service/src/controllers/booking.js`  
Validator: `services/booking-service/src/validators/validateBooking.js`

| Method | Gateway Route | Service Route | Purpose | Auth Required | Handler | Request Body / Query | Success Response | Error Responses |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/bookings` | `/bookings` | List bookings, optionally filtered | Gateway requires auth; service route itself has no `authMiddleware` | `bookingController.getBookings()` | Query: `userId`, `listingIds`, `listingId`; header role affects hidden-booking filter | `200 { success, data: { bookings, count } }` | `500` fetch failed |
| GET | `/api/bookings/:id` | `/bookings/:id` | Fetch one booking | Gateway requires auth; service route itself has no `authMiddleware` | `bookingController.getBooking()` | Param: `id` | `200 { success, data: { booking } }` | `404` booking not found, `500` fetch failed |
| POST | `/api/bookings` | `/bookings` | Create booking with listing validation and overlap detection | Yes | `bookingController.createBooking()` | Body validated by `validateBooking` | `201 { success, message, data: { booking } }` | `400` listing unavailable/self-book/max guests/listing lookup/validation, `401` auth required, `409` overlap, `500` create failed |
| POST | `/api/bookings/:id/payment` | `/bookings/:id/payment` | Create Razorpay order or simulate payment | Yes, owner in controller | `bookingController.processPayment()` | Param: `id` | Razorpay: `200 { success, message, data: { orderId, amount, currency, bookingId, keyId } }`; simulated: `200 { success, message, data: { booking } }` | `400` already paid/cancelled, `403` not owner, `404` booking not found, `500` payment failed |
| POST | `/api/bookings/:id/verify-payment` | `/bookings/:id/verify-payment` | Verify Razorpay payment signature | Yes, owner in controller | `bookingController.verifyPayment()` | Body: `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` | `200 { success, message, data: { booking } }` | `400` missing params/invalid signature, `403` unauthorized, `404` booking not found, `500` verification failed |
| POST | `/api/bookings/:id/cancel` | `/bookings/:id/cancel` | Cancel booking and refund Razorpay payment if applicable | Yes, owner/admin in controller | `bookingController.cancelBooking()` | Param: `id` | `200 { success, message, data: { booking } }` | `400` already cancelled, `403` not owner/admin, `404` not found, `500` cancel failed |
| DELETE | `/api/bookings/:id` | `/bookings/:id` | Admin hard delete or user soft-delete cancelled booking | Yes, owner/admin in controller | `bookingController.deleteBooking()` | Param: `id` | Admin: `200 { success, message: "Booking permanently deleted." }`; user: `200 { success, message: "Booking removed from your history." }` | `400` non-admin deletes non-cancelled booking, `403` not owner/admin, `404` not found, `500` delete failed |

Validated create fields from `validateBooking.js`:

| Field | Validation |
|---|---|
| `listingId` | required string |
| `checkIn` | required ISO date |
| `checkOut` | required ISO date greater than `checkIn` |
| `guests` | required integer, min 1 |

Example request:

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"listingId":"listingId","checkIn":"2026-06-01","checkOut":"2026-06-03","guests":2}'
```

Example response:

```json
{
  "success": true,
  "message": "Booking created successfully.",
  "data": { "booking": { "_id": "bookingId", "listingId": "listingId", "status": "pending" } }
}
```


#### Media Resource

Route file: `services/media-service/src/routes/media.js`  
Controller: `services/media-service/src/controllers/media.js`

| Method | Gateway Route | Service Route | Purpose | Auth Required | Handler | Request Body / Query | Success Response | Error Responses |
|---|---|---|---|---|---|---|---|---|
| POST | `/api/media/upload` | `/media/upload` | Upload one image to Cloudinary through Multer storage | Gateway requires auth; service route itself has no auth middleware | `mediaController.upload.single('image')`, `mediaController.uploadImage()` | Multipart field: `image`; optional body `filename` used by storage params | `201 { success, data: { url, filename } }` | `400` no image file, `500` upload failed |
| DELETE | `/api/media/:filename` | `/media/:filename` | Delete image from Cloudinary | Gateway requires auth; service route itself has no auth middleware | `mediaController.deleteImage()` | Param: `filename` | `200 { success, message, data: { result } }` | `400` invalid/default filename, `500` delete failed |

Example request:

```bash
curl -X POST http://localhost:3000/api/media/upload \
  -H "Authorization: Bearer <token>" \
  -F "image=@./photo.jpg"
```

Example response:

```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/.../image/upload/...",
    "filename": "photo_1710000000000"
  }
}
```


#### Search Resource

Route file: `services/search-service/src/routes/search.js`  
Controller: `services/search-service/src/controllers/search.js`

| Method | Gateway Route | Service Route | Purpose | Auth Required | Handler | Request Body / Query | Success Response | Error Responses |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/geocode?location=X` | `/geocode?location=X` | Convert location text to coordinates with Redis cache if available | No; gateway route has no explicit JWT middleware for `/api/geocode` | `searchController.geocode()` | Query: `location` required | `200 { success, data: { coordinates, displayName }, cached }`; if no result, returns default `[0,0]` with message | `400` missing location, `500` geocoding failed |
| GET | `/api/search?q=X` | `/search?q=X` | Search in-memory listing index | No; gateway optional auth for `/api/search` | `searchController.search()` | Query: `q`, `minPrice`, `maxPrice` optional | `200 { success, data: { listings, count, indexSize } }` | `500` search failed |

Example request:

```bash
curl "http://localhost:3000/api/geocode?location=Goa%2C%20India"
```

Example response:

```json
{
  "success": true,
  "data": {
    "coordinates": [73.8, 15.3],
    "displayName": "Goa, India"
  },
  "cached": false
}
```


#### Admin Resource

Route file: `services/admin-service/src/routes/admin.js`  
Controller: `services/admin-service/src/controllers/admin.js`

All Admin Service routes apply both `authMiddleware` and `authMiddleware.requireAdmin` through `router.use(...)` in `services/admin-service/src/routes/admin.js`. Through the gateway, `/api/admin` also uses `jwtValidation.required` and `jwtValidation.requireAdmin`.

| Method | Gateway Route | Service Route | Purpose | Auth Required | Handler | Request Body / Query | Success Response | Error Responses |
|---|---|---|---|---|---|---|---|---|
| GET | `/api/admin/dashboard` | `/admin/dashboard` | Platform-wide stats and recent records from Auth, Listing, Review, Booking services | Yes, admin | `adminController.getDashboard()` | None | `200 { success, data: { stats, recent } }` | `401/403` from middleware, `500` dashboard failed |
| GET | `/api/admin/user-dashboard/:userId` | `/admin/user-dashboard/:userId` | Host/guest stats for one user | Yes, admin | `adminController.getUserDashboard()` | Param: `userId` | `200 { success, data: { host, guest } }` | `401/403` from middleware, `500` dashboard failed |
| GET | `/api/admin/users` | `/admin/users` | Delegate user list/search to Auth Service | Yes, admin | `adminController.getAllUsers()` | Query: `search` optional | `200 { success, data: response.data }` | `401/403` from middleware, `500` fetch failed |
| DELETE | `/api/admin/users/:id` | `/admin/users/:id` | Delete user through Auth Service | Yes, admin | `adminController.deleteUser()` | Param: `id` | `200 { success, message }` | Upstream status or `500` delete failed |
| GET | `/api/admin/listings` | `/admin/listings` | List/enrich listings; optional search via Search Service URL derivation | Yes, admin | `adminController.getAllListings()` | Query: `search` optional | `200 { success, data: { listings, count } }` | `401/403` from middleware, `500` fetch failed |
| DELETE | `/api/admin/listings/:id` | `/admin/listings/:id` | Delete listing through Listing Service | Yes, admin | `adminController.deleteListing()` | Param: `id` | `200 { success, message }` | Upstream status or `500` delete failed |
| GET | `/api/admin/reviews` | `/admin/reviews` | List/enrich reviews; optional in-memory controller search | Yes, admin | `adminController.getAllReviews()` | Query: `search` optional | `200 { success, data: { reviews, count } }` | `401/403` from middleware, `500` fetch failed |
| DELETE | `/api/admin/reviews/:id` | `/admin/reviews/:id` | Delete review through Review Service | Yes, admin | `adminController.deleteReview()` | Param: `id` | `200 { success, message }` | Upstream status or `500` delete failed |
| GET | `/api/admin/bookings` | `/admin/bookings` | List/enrich bookings | Yes, admin | `adminController.getAllBookings()` | None | `200 { success, data: { bookings, count } }` | `401/403` from middleware, `500` fetch failed |
| DELETE | `/api/admin/bookings/:id` | `/admin/bookings/:id` | Hard-delete booking through Booking Service | Yes, admin | `adminController.deleteBooking()` | Param: `id` | `200 { success, message }` | Upstream status or `500` delete failed |

Example request:

```bash
curl http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer <admin-token>"
```

Example response:

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalUsers": 10,
      "totalListings": 5,
      "totalReviews": 12,
      "totalBookings": 3
    },
    "recent": { "users": [], "listings": [], "reviews": [], "bookings": [] }
  }
}
```


### 4.3 — DTOs and Validation

No DTO classes were found. Validation is implemented with Joi middleware in three services and Mongoose schema validation in model files. Auth controllers also perform inline required-field checks.

| Validator | File | Used By | Validated Fields |
|---|---|---|---|
| `validateListing` | `services/listing-service/src/validators/validateListing.js` | `POST /listings` in `services/listing-service/src/routes/listing.js` | `title`, `description`, `price`, `location`, `country`, optional `maxGuests`, optional `image`, optional `geometry` |
| `validateBooking` | `services/booking-service/src/validators/validateBooking.js` | `POST /bookings` in `services/booking-service/src/routes/booking.js` | `listingId`, `checkIn`, `checkOut`, `guests` |
| `validateReview` | `services/review-service/src/validators/validateReview.js` | `POST /reviews` in `services/review-service/src/routes/review.js` | `comment`, `rating`, `listingId` |

Validation response shape from Joi validators:

```js
// services/booking-service/src/validators/validateBooking.js
const { error } = bookingSchema.validate(req.body, { abortEarly: false });
if (error) {
    const message = error.details.map(el => el.message).join(', ');
    return res.status(400).json({ success: false, error: message });
}
next();
```

Routes without Joi validator middleware:

| Area | Evidence | Validation Present |
|---|---|---|
| Auth register/login/refresh | `services/auth-service/src/controllers/auth.js` checks required fields inline | Inline checks, no Joi |
| Listing update/delete/toggle | `services/listing-service/src/routes/listing.js` has no validator on `PUT`, `DELETE`, toggle route | Mongoose/controller checks only |
| Booking payment/verify/cancel/delete | `services/booking-service/src/routes/booking.js` has no Joi validator on these routes | Controller checks only |
| Media upload/delete | `services/media-service/src/routes/media.js` has no Joi validator | Multer/controller checks only |
| Search/geocode | `services/search-service/src/controllers/search.js` checks `location`; search filters parsed inline | Inline checks only |
| Admin routes | `services/admin-service/src/routes/admin.js` has no validators | Delegates to services and controller logic |

