SECTION: Backend Documentation — Services, Middleware, Events, Errors, Integrations
FILE: 04b_BACKEND_SERVICES.md
COVERS:
- Gateway and service middleware confirmed in `gateway/src/index.js`, `gateway/src/middleware/*`, service `src/index.js` files, and `shared/middleware/authMiddleware.js`.
- Controller-owned service logic in `services/*/src/controllers/*.js`.
- Shared HTTP client, shared RabbitMQ broker, shared auth middleware, and shared AppError utility.
- Error handling patterns in gateway and service entry points.
- RabbitMQ event consumers and publishers found in services and `shared/events/broker.js`.
- Media upload handling through Multer + Cloudinary.
- External integrations: internal service HTTP calls, Cloudinary, Razorpay, Nominatim/OpenStreetMap.
SKIPS:
- Separate service-class layer skipped because no `services/*/src/services/` folders or service class files were found.
- Dependency Injection framework graph skipped because no NestJS, InversifyJS, tsyringe, Spring, or equivalent DI framework was found.
- GraphQL, gRPC, WebSocket, and email handling skipped because no supporting packages or source files were found.

## Section 4b — Backend Services

### 4.4 — Middleware Stack

The backend has two middleware layers: gateway-level middleware and per-service middleware.

Gateway middleware order from `gateway/src/index.js`:

| # | Middleware | File | Applies To | What It Does |
|---:|---|---|---|---|
| 1 | `morgan(...)` | `gateway/src/index.js` | All gateway requests | Logs method, URL, status, content length, response time |
| 2 | `cors({ origin, credentials })` | `gateway/src/index.js` | All gateway requests | Allows cross-origin calls; origin comes from `CORS_ORIGIN` or `*` |
| 3 | `rateLimiter` | `gateway/src/middleware/rateLimiter.js` | All gateway requests except `/health` | Limits to 500 requests per 15 minutes per user/IP |
| 4 | `/health` route | `gateway/src/index.js` | `GET /health` | Returns gateway health JSON |
| 5 | `jwtValidation.optional` | `gateway/src/index.js` | `/api/listings`, `/api/reviews`, `/api/search` | Adds `req.user` when token is valid; allows anonymous access |
| 6 | `jwtValidation.required` | `gateway/src/index.js` | `/api/bookings`, `/api/media`, `/api/admin` | Blocks missing/invalid tokens with 401 |
| 7 | `jwtValidation.requireAdmin` | `gateway/src/index.js` | `/api/admin` | Blocks non-admin users with 403 |
| 8 | `setupProxies(app)` | `gateway/src/proxy.js` | `/api/*` routes | Forwards requests to service URLs and forwards `X-User-*` headers |
| 9 | `errorHandler` | `gateway/src/middleware/errorHandler.js` | Gateway errors | Returns `{ success: false, error }`; includes stack only in development |

Service entry-point middleware pattern:

| Service | Middleware in `src/index.js` | Notable Differences |
|---|---|---|
| Auth | `morgan`, `cors`, `express.json`, health, routes, 404, error handler | Connects MongoDB; optional Redis; optional RabbitMQ publisher |
| Listing | `morgan`, `cors`, `express.json`, health, routes, 404, error handler | Injects `serviceClient`, `publishEvent`, media/search URLs; optional RabbitMQ consumers |
| Review | `morgan`, `cors`, `express.json`, health, routes, 404, error handler | Injects `publishEvent`; optional RabbitMQ consumers |
| Booking | `morgan`, `cors`, `express.json`, health, routes, 404, error handler | Initializes Razorpay; injects `serviceClient`, `publishEvent`, listing URL |
| Media | `morgan`, `cors`, `express.json`, health, routes, 404, error handler | No DB or message broker |
| Search | `morgan`, `cors`, `express.json`, health, routes, 404, error handler | Optional Redis; optional RabbitMQ; initial listing sync |
| Admin | `morgan`, `cors`, `express.json`, health, routes, 404, error handler | Pure aggregator; no DB or message broker |

Shared route auth middleware:

| Middleware | File | Behavior |
|---|---|---|
| `authMiddleware` | `shared/middleware/authMiddleware.js` | Verifies `Authorization: Bearer <token>` with `JWT_SECRET`; attaches `{ id, username, email, role }` to `req.user` |
| `authMiddleware.requireAdmin` | `shared/middleware/authMiddleware.js` | Returns 403 unless `req.user.role === 'admin'` |
| `authMiddleware.optional` | `shared/middleware/authMiddleware.js` | Attaches user when token is valid; otherwise continues with `req.user = null` |

Relevant gateway middleware snippet:

```js
// gateway/src/index.js
app.use(rateLimiter);
app.get('/health', (req, res) => {
    res.json({ service: 'api-gateway', status: 'healthy', timestamp: new Date().toISOString() });
});
app.use('/api/listings', jwtValidation.optional);
app.use('/api/bookings', jwtValidation.required);
app.use('/api/admin', jwtValidation.required, jwtValidation.requireAdmin);
// ... rest of file
```

✅ CHECKPOINT: 4.4 — Middleware Stack complete. Proceeding to 4.5 — Services Layer.

### 4.5 — Services Layer

No separate service-class layer was found. Business logic is implemented in controller modules, with shared utilities injected from service entry points where needed.

| Service | Logic Module | Methods | Calls | Returns |
|---|---|---|---|---|
| Auth | `services/auth-service/src/controllers/auth.js` | `register`, `login`, `logout`, `refresh`, `me`, `getUserById`, `getAllUsers`, `deleteUser`, `setRedisClient` | `User` model, JWT utils, Redis client, optional RabbitMQ publisher | JSON auth/user responses |
| Listing | `services/listing-service/src/controllers/listing.js` | `getAllListings`, `getListing`, `createListing`, `updateListing`, `deleteListing`, `toggleAvailability`, `setDependencies` | `Listing` model, Search Service, Media Service, RabbitMQ publisher | JSON listing responses |
| Review | `services/review-service/src/controllers/review.js` | `getReviews`, `getReview`, `createReview`, `deleteReview`, `getListingStats`, `setPublishEvent` | `Review` model, optional RabbitMQ publisher | JSON review/stats responses |
| Booking | `services/booking-service/src/controllers/booking.js` | `getBookings`, `getBooking`, `createBooking`, `processPayment`, `verifyPayment`, `cancelBooking`, `deleteBooking`, `setDependencies` | `Booking` model, Listing Service, Razorpay utils, RabbitMQ publisher | JSON booking/payment responses |
| Media | `services/media-service/src/controllers/media.js` | `upload`, `uploadImage`, `deleteImage` | Multer, Cloudinary SDK | JSON media responses |
| Search | `services/search-service/src/controllers/search.js` | `geocode`, `search`, `indexListing`, `removeFromIndex`, `getIndexSize`, `setRedisClient` | Redis client, Nominatim/OpenStreetMap, in-memory `Map` | JSON geocode/search responses |
| Admin | `services/admin-service/src/controllers/admin.js` | `getDashboard`, `getAllUsers`, `deleteUser`, `getAllListings`, `deleteListing`, `getAllReviews`, `deleteReview`, `getAllBookings`, `deleteBooking`, `getUserDashboard`, `setDependencies` | `serviceClient`, Auth/Listings/Reviews/Bookings service URLs | JSON aggregated admin responses |
| Shared HTTP client | `shared/utils/serviceClient.js` | `get`, `post`, `put`, `delete`, `request` | `fetch`, `AppError`, timeout/retry logic | Parsed JSON or `AppError` |
| Shared broker | `shared/events/broker.js` | `connectRabbitMQ`, `publishEvent`, `consumeEvent`, `closeRabbitMQ` | `amqplib`, `eventNames` | RabbitMQ channel operations |

Important flow: Booking creation.

```js
// services/booking-service/src/controllers/booking.js
const response = await serviceClient.get(`${LISTING_SERVICE_URL}/listings/${listingId}`);
listing = response.data?.listing;
// ...
const overlapping = await Booking.findOne({
    listingId,
    status: { $in: ['pending', 'confirmed'] },
    $or: [{ checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }]
});
// ... rest of file
```

Important flow: Listing creation with geocoding and event publication.

```js
// services/listing-service/src/controllers/listing.js
const geoResponse = await serviceClient.get(
    `${SEARCH_SERVICE_URL}/geocode?location=${encodeURIComponent(location + ', ' + country)}`
);
// ...
const listing = new Listing(listingData);
await listing.save();
if (publishEvent) {
    await publishEvent('listing.created', { listingId: listing._id.toString(), title: listing.title });
}
// ... rest of file
```

Important flow: Admin aggregation.

```js
// services/admin-service/src/controllers/admin.js
const [usersRes, listingsRes, reviewsRes, bookingsRes] = await Promise.all([
    safeGet(`${AUTH_URL}/auth/users`, { authorization: req.headers.authorization }),
    safeGet(`${LISTING_URL}/listings`),
    safeGet(`${REVIEW_URL}/reviews`),
    safeGet(`${BOOKING_URL}/bookings`)
]);
// ... rest of file
```

✅ CHECKPOINT: 4.5 — Services Layer complete. Proceeding to 4.6 — Error Handling.

### 4.6 — Error Handling

Custom error handling exists, but there is no single shared Express exception filter used by every service.

| Area | File | Behavior |
|---|---|---|
| Gateway global error handler | `gateway/src/middleware/errorHandler.js` | Logs `[Gateway Error]`; returns status from `err.statusCode`/`err.status` or 500; hides 500 details outside development |
| Service 404 handlers | `services/*/src/index.js` | Return `404 { success: false, error: "Route not found: METHOD path" }` |
| Service error handlers | `services/*/src/index.js` | Log `[Service Error]`; return `{ success: false, error }`, hiding 500 details as `Internal server error` |
| Controller-local errors | `services/*/src/controllers/*.js` | Controllers catch known failures and return explicit JSON errors |
| Shared client errors | `shared/errors/AppError.js` and `shared/utils/serviceClient.js` | Wrap non-OK HTTP responses, timeouts, and unavailable services with status codes |
| RabbitMQ handler errors | `shared/events/broker.js` | Logs handler errors and `nack`s messages with requeue enabled |

Gateway error response format:

```js
// gateway/src/middleware/errorHandler.js
res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
});
```

Shared service client error behavior:

```js
// shared/utils/serviceClient.js
if (err.name === 'AbortError') {
    throw new AppError(504, `Service timeout: ${url}`);
}
throw new AppError(503, `Service unavailable: ${url} — ${err.message}`);
```

Controller-level validation examples:

| Controller | Evidence |
|---|---|
| Auth | `register()` returns 400 for missing `username`, `email`, or `password`; 409 for duplicate username/email |
| Listing | `createListing()` returns 401 when owner ID is missing; catches Mongoose `ValidationError` as 400 |
| Booking | `createBooking()` returns 409 for date overlap; `processPayment()` returns 400 when payment is already complete |
| Media | `uploadImage()` returns 400 when `req.file` is missing |
| Search | `geocode()` returns 400 when `location` query is missing |

No custom exception classes beyond `shared/errors/AppError.js` were found.

✅ CHECKPOINT: 4.6 — Error Handling complete. Proceeding to 4.7 — Message Queue / Background Jobs.

### 4.7 — Message Queue / Background Jobs

RabbitMQ is present and implemented through `shared/events/broker.js`. There are no standalone worker entry files; consumers run inside service processes when `RABBITMQ_URL` is configured and connection succeeds.

Broker configuration:

| Setting | Value | Evidence |
|---|---|---|
| Exchange | `heavenly.events` | `shared/events/eventNames.js` |
| Exchange type | `topic` | `shared/events/broker.js` |
| Queue durability | `durable: true` | `shared/events/broker.js` |
| Message persistence | `persistent: true` when publishing | `shared/events/broker.js` |
| Consumer prefetch | `prefetch(1)` | `shared/events/broker.js` |
| Reconnect | Exponential backoff and consumer resubscription | `shared/events/broker.js` |

Event publishers found:

| Publisher | Event(s) | Evidence |
|---|---|---|
| Auth Service | `user.deleted` | `services/auth-service/src/controllers/auth.js` assigns `deleteUser._publishEvent` from service startup |
| Listing Service | `listing.created`, `listing.updated`, `listing.deleted` | `services/listing-service/src/controllers/listing.js` |
| Review Service | `review.created`, `review.deleted` | `services/review-service/src/controllers/review.js` |
| Booking Service | `booking.created`, `booking.payment.completed`, `booking.cancelled` | `services/booking-service/src/controllers/booking.js` |

Event consumers found:

| Consumer File | Queue Name(s) | Routing Key(s) | Action |
|---|---|---|---|
| `services/listing-service/src/events/consumers.js` | `listing-service.user-deleted` | `user.deleted` | Finds/deletes listings owned by deleted user; republishes `listing.deleted` for each listing |
| `services/review-service/src/events/consumers.js` | `review-service.listing-deleted`, `review-service.user-deleted` | `listing.deleted`, `user.deleted` | Deletes reviews by listing or author |
| `services/booking-service/src/events/consumers.js` | `booking-service.listing-deleted`, `booking-service.user-deleted` | `listing.deleted`, `user.deleted` | Deletes bookings for deleted listing or deleted guest user |
| `services/search-service/src/events/consumers.js` | `search-service.listing-created`, `search-service.listing-updated`, `search-service.listing-deleted` | `listing.created`, `listing.updated`, `listing.deleted` | Adds/updates/removes entries in the in-memory search index |

Broker consumer snippet:

```js
// shared/events/broker.js
await channel.assertQueue(queueName, { durable: true });
await channel.bindQueue(queueName, eventNames.EXCHANGE, routingKey);
await channel.prefetch(1);
channel.consume(queueName, async (msg) => {
    const content = JSON.parse(msg.content.toString());
    await handler(content.data, content);
    channel.ack(msg);
});
```

Finding: `services/listing-service/src/events/consumers.js` calls `require('../utils/serviceClient.js')`, but no `services/listing-service/src/utils/` folder was found. The shared client exists at `shared/utils/serviceClient.js`; this import path is likely broken if that cascade image-delete branch executes.

✅ CHECKPOINT: 4.7 — Message Queue / Background Jobs complete. Proceeding to 4.8 — File Upload Handling.

### 4.8 — File Upload Handling

File upload handling is present through the Media Service and BFF listing routes.

| Layer | File | Behavior |
|---|---|---|
| Media route | `services/media-service/src/routes/media.js` | `POST /media/upload` uses `mediaController.upload.single('image')` before `uploadImage()` |
| Media controller | `services/media-service/src/controllers/media.js` | Configures Cloudinary, CloudinaryStorage, Multer, upload/delete handlers |
| BFF listing route | `bff/src/routes/listings.js` | Uses Multer for listing form image input before calling gateway/media routes |

Confirmed upload constraints in `services/media-service/src/controllers/media.js`:

| Setting | Value |
|---|---|
| Storage provider | Cloudinary |
| Folder | `Heavenly_DEV` |
| Allowed formats | `jpg`, `jpeg`, `png`, `avif` |
| File field name | `image` |
| Filename behavior | Uses `req.body.filename` or original filename stem; strips non-alphanumeric/underscore/hyphen characters; appends timestamp |

Upload code:

```js
// services/media-service/src/controllers/media.js
const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
        let customFilename = req.body?.filename?.trim() || file.originalname.split('.')[0];
        customFilename = customFilename.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
        return { folder: 'Heavenly_DEV', allowed_formats: ['jpg', 'jpeg', 'png', 'avif'] };
    }
});
const upload = multer({ storage });
```

Delete behavior:

| Endpoint | Guard | Behavior |
|---|---|---|
| `DELETE /media/:filename` | Gateway requires auth on `/api/media`; service route has no local auth middleware | Rejects missing filename and `default.jpg`; calls `cloudinary.uploader.destroy(filename)` |

✅ CHECKPOINT: 4.8 — File Upload Handling complete. Proceeding to 4.9 — External API Integrations.

### 4.9 — External API Integrations

External integrations are present.

| Integration | SDK / API | File(s) | Data Sent | Data Received / Used | Error Handling |
|---|---|---|---|---|---|
| Internal service HTTP calls | Native `fetch` through `shared/utils/serviceClient.js` | `shared/utils/serviceClient.js`, controllers in Booking/Admin/Listing/Search | JSON body or query params; forwards `Authorization` when request object is supplied | Parsed JSON from peer services | Timeout, retry on 5xx/429/network errors, `AppError` on failure |
| Cloudinary | `cloudinary`, `multer-storage-cloudinary` | `services/media-service/src/controllers/media.js` | Image file, folder `Heavenly_DEV`, sanitized filename | Uploaded file path/filename; delete result | Controller returns 400 for no file/invalid filename; 500 on SDK errors |
| Razorpay | `razorpay` SDK | `services/booking-service/src/utils/razorpay.js`, `services/booking-service/src/controllers/booking.js` | Order amount in paise, currency, receipt, notes; payment signature data; refund payment ID | Order IDs, payment verification, refund IDs | Missing credentials disable Razorpay; order failures fall back to simulated payment; verification failure returns 400 |
| Nominatim/OpenStreetMap | `fetch` to `https://nominatim.openstreetmap.org/search` | `services/search-service/src/controllers/search.js` | Query string `format=json&q=<location>&limit=1`, `User-Agent`, `Accept-Language` headers | Coordinates and display name | Missing location returns 400; no result returns default `[0, 0]`; errors return 500 |

Razorpay initialization:

```js
// services/booking-service/src/utils/razorpay.js
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
if (!keyId || !keySecret) {
    console.warn('[Razorpay] Credentials not found. Payment will use simulation mode.');
    return null;
}
razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
```

Nominatim geocoding:

```js
// services/search-service/src/controllers/search.js
const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;
const response = await fetch(url, {
    headers: {
        'User-Agent': 'HeavenlyApp/1.0 (learning project)',
        'Accept-Language': 'en'
    }
});
```

✅ CHECKPOINT: 4.9 — External API Integrations complete. Proceeding to 4.10 — Dependency Injection Graph.

### 4.10 — Dependency Injection Graph

> ⬜ NOT PRESENT — Dependency Injection Framework
> Evidence: No NestJS / InversifyJS / tsyringe / Spring package or DI container setup found in repository.
> This section is skipped. If this feature is added later, document it here.

✅ CHECKPOINT: 4.10 — Dependency Injection Graph complete. Proceeding to stop as instructed.
