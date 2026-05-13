## Section 5 — Frontend Documentation

### 5.1 — UI Architecture

| Property | Value | Evidence |
|---|---|---|
| Frontend type | Backend-for-Frontend, server-rendered HTML | `bff/src/index.js` |
| Framework | Express | `bff/package.json`, `bff/src/index.js` |
| Template engine | EJS with ejs-mate layouts | `bff/package.json`, `bff/src/index.js`, `bff/src/views/layouts/boilerplate.ejs` |
| Static assets | CSS, client JS, favicon | `bff/src/public/` |
| Browser-facing port | `8080` default | `bff/src/index.js`, `bff/Dockerfile`, `docker-compose.yml` |
| API boundary | BFF calls API Gateway | `bff/src/utils/apiClient.js` uses `GATEWAY_URL` |
| Rendering strategy | Server-rendered EJS pages | `app.engine('ejs', ejsMate)`, `app.set('view engine', 'ejs')` in `bff/src/index.js` |

Folder structure:

| Folder | Purpose |
|---|---|
| `bff/src/routes/` | Browser-facing Express routes |
| `bff/src/views/` | EJS pages, layouts, and includes |
| `bff/src/public/css/` | Page/area-specific CSS files |
| `bff/src/public/js/` | Browser-side scripts for maps and form validation |
| `bff/src/utils/` | Gateway API client and dashboard cache |

Key UI entry point:

```js
// bff/src/index.js
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', authRoutes);
app.use('/', adminRoutes);
// ... rest of file
```


### 5.2 — Routing

Routing is implemented server-side through Express routers. No client-side router was found.

| Route | Component / View File | Auth Required | Purpose |
|---|---|---|---|
| `GET /` | `bff/src/views/home.ejs` | No | Home page |
| `GET /signup` | `bff/src/views/users/signup.ejs` | No; redirects if session user exists | Signup form |
| `POST /signup` | Redirect only | No | Register through API and store session |
| `GET /login` | `bff/src/views/users/login.ejs` | No; redirects if session user exists | Login form |
| `POST /login` | Redirect only | No | Login through API and store session |
| `GET /logout` | Redirect only | No | Clear session and call logout API |
| `GET /listings` | `bff/src/views/listings/index.ejs` | No | Browse/search listings |
| `GET /listings/new` | `bff/src/views/listings/new.ejs` | Yes, `isLoggedIn` | New listing form |
| `GET /listings/:id` | `bff/src/views/listings/show.ejs` | No | Listing detail page |
| `POST /listings` | Redirect only | Yes, `isLoggedIn` | Create listing with optional image |
| `GET /listings/:id/edit` | `bff/src/views/listings/edit.ejs` | Yes, `isLoggedIn` | Edit listing form |
| `PUT /listings/:id` | Redirect only | Yes, `isLoggedIn` | Update listing |
| `DELETE /listings/:id` | Redirect only | Yes, `isLoggedIn` | Delete listing |
| `POST /listings/:id/reviews` | Redirect only | Yes, `isLoggedIn` | Create review |
| `DELETE /listings/:id/reviews/:reviewId` | Redirect only | Yes, `isLoggedIn` | Delete review |
| `GET /listings/:id/book` | `bff/src/views/bookings/new.ejs` | Yes, `isLoggedIn` | Booking form |
| `POST /listings/:id/book` | Redirect only | Yes, `isLoggedIn` | Create booking |
| `POST /bookings` | Redirect only | Yes, `isLoggedIn` | Booking creation fallback |
| `GET /bookings/:id` | `bff/src/views/bookings/show.ejs` | Yes, `isLoggedIn` | Booking detail |
| `GET /bookings/:id/payment` | `bff/src/views/bookings/payment.ejs` | Yes, `isLoggedIn` | Payment page |
| `POST /bookings/:id/payment` | JSON or redirect | Yes, `isLoggedIn` | Start payment |
| `POST /bookings/:id/verify-payment` | JSON | Yes, `isLoggedIn` | Verify Razorpay payment |
| `POST /bookings/:id/cancel` | Redirect only | Yes, `isLoggedIn` | Cancel booking |
| `GET /dashboard` | `bff/src/views/dashboard/index.ejs` | Yes, `isLoggedIn` | User dashboard overview |
| `GET /dashboard/listings` | `bff/src/views/dashboard/listings.ejs` | Yes, `isLoggedIn` | User listings dashboard |
| `POST /dashboard/listings/:id/toggle-availability` | Redirect only | Yes, `isLoggedIn` | Toggle listing availability |
| `GET /dashboard/bookings` | `bff/src/views/dashboard/bookings.ejs` | Yes, `isLoggedIn` | User bookings |
| `GET /dashboard/listings/:id/bookings` | `bff/src/views/dashboard/listing-bookings.ejs` | Yes, `isLoggedIn` | Bookings for one listing |
| `GET /dashboard/host-bookings` | `bff/src/views/dashboard/host-bookings.ejs` | Yes, `isLoggedIn` | Host bookings |
| `GET /dashboard/host-reviews` | `bff/src/views/dashboard/host-reviews.ejs` | Yes, `isLoggedIn` | Host reviews |
| `POST /dashboard/listings/:id/bookings/:bookingId/cancel` | Redirect only | Yes, `isLoggedIn` | Cancel listing booking |
| `POST /dashboard/host-bookings/:bookingId/cancel` | Redirect only | Yes, `isLoggedIn` | Cancel host booking |
| `GET /admin` | Redirect to `/admin/dashboard` | Yes, `isLoggedIn`, `isAdmin` | Admin landing redirect |
| `GET /admin/dashboard` | `bff/src/views/admin/dashboard.ejs` | Yes, `isLoggedIn`, `isAdmin` | Admin dashboard |
| `GET /admin/users` | `bff/src/views/admin/users.ejs` | Yes, `isLoggedIn`, `isAdmin` | Manage users |
| `DELETE /admin/users/:id` | Redirect only | Yes, `isLoggedIn`, `isAdmin` | Delete user |
| `GET /admin/listings` | `bff/src/views/admin/listings.ejs` | Yes, `isLoggedIn`, `isAdmin` | Manage listings |
| `DELETE /admin/listings/:id` | Redirect only | Yes, `isLoggedIn`, `isAdmin` | Delete listing |
| `GET /admin/reviews` | `bff/src/views/admin/reviews.ejs` | Yes, `isLoggedIn`, `isAdmin` | Manage reviews |
| `DELETE /admin/reviews/:id` | Redirect only | Yes, `isLoggedIn`, `isAdmin` | Delete review |
| `GET /admin/bookings` | `bff/src/views/admin/bookings.ejs` | Yes, `isLoggedIn`, `isAdmin` | Manage bookings |
| `POST /admin/bookings/:id/cancel` | Redirect only | Yes, `isLoggedIn`, `isAdmin` | Cancel booking |
| `DELETE /admin/bookings/:id` | Redirect only | Yes, `isLoggedIn`, `isAdmin` | Delete booking |
| `GET /contact` | `bff/src/views/pages/contact.ejs` | No | Contact page |
| `GET /privacy` | `bff/src/views/pages/privacy.ejs` | No | Privacy page |
| `GET /terms` | `bff/src/views/pages/terms.ejs` | No | Terms page |

Protected route implementation:

```js
// bff/src/middleware.js
async function isLoggedIn(req, res, next) {
    if (!req.session?.user || !req.session?.accessToken) {
        req.session.redirectUrl = req.originalUrl;
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
    }
// ... rest of file
```


### 5.3 — State Management

No Redux, Zustand, React Context, or equivalent client-side global state library was found. The frontend state that exists is server-side BFF state plus small page-local browser state.

| State | Location | Purpose |
|---|---|---|
| Session user/token state | `bff/src/index.js`, `bff/src/utils/apiClient.js` | Stores `session.user`, `session.accessToken`, and `session.refreshToken` after login/register |
| Template globals | `bff/src/index.js` | Exposes `currentUser`, `success`, and `error` to all EJS templates |
| User validation cache | `bff/src/middleware.js` | In-memory `Map` that avoids checking user existence on every protected request |
| Dashboard cache | `bff/src/utils/dashboardCache.js` | In-memory `Map` with 30 second TTL for dashboard API responses |
| Payment page browser state | `bff/src/views/bookings/payment.ejs` | DOM state for payment default/processing/success panels |
| Map page browser state | `bff/src/public/js/clusterMap.js`, `bff/src/public/js/showMap.js` | Reads listing/geolocation data from EJS-injected globals/data attributes |

Session setup:

```js
// bff/src/index.js
const sessionOptions = {
    secret: process.env.SESSION_SECRET || 'heavenly-bff-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }
};
app.use(session(sessionOptions));
```

Dashboard cache setup:

```js
// bff/src/utils/dashboardCache.js
const CACHE_TTL_MS = 30 * 1000;
const cache = new Map();
function set(key, data, ttl = CACHE_TTL_MS) {
    cache.set(key, { data, expiresAt: Date.now() + ttl });
}
// ... rest of file
```


### 5.4 — API Integration Layer

The BFF has a dedicated API integration layer in `bff/src/utils/apiClient.js`.

| Feature | Evidence |
|---|---|
| Gateway base URL | `const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000'` |
| JSON request wrapper | `apiCall(path, options = {})` |
| Session JWT forwarding | Adds `Authorization: Bearer ${session.accessToken}` |
| Timeout | Uses `AbortController` and `REQUEST_TIMEOUT_MS = 10000` |
| Retry | Retries up to 3 attempts for 5xx, 429, and network errors |
| Token refresh | On first 401, calls `refreshToken(session)` when `session.refreshToken` exists |
| Auth helpers | Exports `login`, `register`, `logout`, `refreshToken` |

API client flow:

```js
// bff/src/utils/apiClient.js
const url = `${GATEWAY_URL}${path}`;
const fetchOptions = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers }
};
if (session?.accessToken) {
    fetchOptions.headers['Authorization'] = `Bearer ${session.accessToken}`;
}
// ... rest of file
```

Routes using the API layer:

| BFF Route File | API Use |
|---|---|
| `bff/src/routes/auth.js` | `login`, `register`, `logout` helpers |
| `bff/src/routes/listings.js` | Listing CRUD, search/geocode-backed listing data, media upload through gateway |
| `bff/src/routes/reviews.js` | Review create/delete |
| `bff/src/routes/bookings.js` | Booking create/show/payment/verify/cancel |
| `bff/src/routes/dashboard.js` | Dashboard listing, booking, review aggregation |
| `bff/src/routes/admin.js` | Admin dashboard and admin CRUD actions |
| `bff/src/middleware.js` | User existence validation through `/api/auth/users/:id` |

Direct browser `fetch` also exists in `bff/src/views/bookings/payment.ejs` for the payment page. It calls BFF routes `/bookings/:id/payment` and `/bookings/:id/verify-payment`, not the API Gateway directly.


### 5.5 — Component Catalog

This frontend does not use a JavaScript component framework. Components are EJS pages/includes plus static scripts.

Meaningful EJS includes:

| Include | File | Purpose |
|---|---|---|
| Layout shell | `bff/src/views/layouts/boilerplate.ejs` | Shared HTML document, CSS/CDN links, navbar, flash, footer, scripts |
| Navbar | `bff/src/views/includes/navbar.ejs` | Brand, navigation, auth/admin links based on `currentUser` |
| Flash | `bff/src/views/includes/flash.ejs` | Success/error alert rendering |
| Footer | `bff/src/views/includes/footer.ejs` | Footer links/socials/copyright |
| Dashboard sidebar | `bff/src/views/includes/dashboard-sidebar.ejs` | Dashboard navigation with active state |

Page templates with meaningful logic:

| Area | Files | Notes |
|---|---|---|
| Home | `bff/src/views/home.ejs` | Static marketing/content page with linked listing actions |
| Listings | `bff/src/views/listings/index.ejs`, `show.ejs`, `new.ejs`, `edit.ejs` | Search state, listing cards, map data injection, owner actions, booking/review entry points |
| Bookings | `bff/src/views/bookings/new.ejs`, `payment.ejs`, `show.ejs`, `index.ejs` | Booking form, payment page, booking summary/detail |
| Dashboard | `bff/src/views/dashboard/*.ejs` | User/host listing, booking, review dashboards |
| Admin | `bff/src/views/admin/*.ejs` | Admin dashboard and management pages |
| Auth | `bff/src/views/users/login.ejs`, `signup.ejs` | Login and signup forms |
| Static pages | `bff/src/views/pages/contact.ejs`, `privacy.ejs`, `terms.ejs` | Static informational pages |
| Error | `bff/src/views/error.ejs` | 404/error rendering target |

Client-side scripts:

| Script | File | Purpose |
|---|---|---|
| Cluster map | `bff/src/public/js/clusterMap.js` | Reads `window.listingsData`; renders clustered listing markers using MapLibre/OpenStreetMap tiles |
| Show map | `bff/src/public/js/showMap.js` | Reads `#map` data attributes; renders one listing marker using MapLibre/OpenStreetMap tiles |
| Form validation | `bff/src/public/js/formvalidation.js` | Applies Bootstrap validation classes to `.needs-validation` forms |
| Payment script | Inline in `bff/src/views/bookings/payment.ejs` | Starts payment, opens Razorpay Checkout when available, verifies payment, updates DOM success state |


### 5.6 — Authentication Flow (Frontend)

Frontend authentication is present and session-based in the browser-facing BFF, backed by JWT tokens from the Auth Service.

Flow:

1. User submits `/signup` or `/login` form handled by `bff/src/routes/auth.js`.
2. The route calls `register()` or `login()` from `bff/src/utils/apiClient.js`.
3. The API client posts to `/api/auth/register` or `/api/auth/login` through the gateway.
4. When tokens come back, `apiClient.js` stores `session.accessToken`, `session.refreshToken`, and `session.user`.
5. `bff/src/index.js` exposes `res.locals.currentUser = req.session.user || null` to all EJS templates.
6. Protected routes use `isLoggedIn` from `bff/src/middleware.js`.
7. Admin routes also use `isAdmin`, which checks `req.session.user.role === 'admin'`.
8. Later API calls forward `session.accessToken` as a Bearer token.
9. On 401, `apiClient.js` attempts refresh with `session.refreshToken`.

Session write on login/register:

```js
// bff/src/utils/apiClient.js
if (data.data?.accessToken) {
    session.accessToken = data.data.accessToken;
    session.refreshToken = data.data.refreshToken;
    const user = data.data.user;
    user.id = user._id;
    session.user = user;
}
```

Template auth usage:

| File | Behavior |
|---|---|
| `bff/src/views/includes/navbar.ejs` | Shows Login/Sign Up when `!currentUser`; shows Dashboard/user/logout when logged in; shows Admin when `currentUser.role === 'admin'` |
| `bff/src/views/listings/show.ejs` | Shows booking action for non-owner logged-in users; login prompt for anonymous users; owner/admin management actions |
| `bff/src/routes/admin.js` | Applies `isLoggedIn, isAdmin` to all admin pages/actions |


### 5.7 — Styling System

No Tailwind, CSS Modules, or shared design-token system was found. Styling is global CSS plus Bootstrap, Font Awesome, Google Fonts, and MapLibre CSS loaded from the EJS layout.

| Styling Source | Evidence | Purpose |
|---|---|---|
| Bootstrap 5 CDN | `bff/src/views/layouts/boilerplate.ejs` | Grid/components/forms/alerts/scripts |
| Font Awesome CDN | `bff/src/views/layouts/boilerplate.ejs` | Icons in nav, cards, dashboard, forms |
| Google Fonts CDN | `bff/src/views/layouts/boilerplate.ejs` | `Poppins`, `Inter`, `Playfair Display` |
| MapLibre CSS CDN | `bff/src/views/layouts/boilerplate.ejs` | Map rendering styles |
| Global local CSS | `bff/src/public/css/*.css` | Page/area styling |

Local CSS files:

| File | Scope Implied By Name |
|---|---|
| `bff/src/public/css/base.css` | Base/global styles |
| `bff/src/public/css/navbar.css` | Navigation |
| `bff/src/public/css/footer.css` | Footer |
| `bff/src/public/css/home.css` | Home page |
| `bff/src/public/css/listing.css` | Listing index/forms/cards |
| `bff/src/public/css/show.css` | Listing show page |
| `bff/src/public/css/form.css` | Form styling |
| `bff/src/public/css/auth.css` | Login/signup pages |
| `bff/src/public/css/pages.css` | Static pages |
| `bff/src/public/css/admin.css` | Admin pages |
| `bff/src/public/css/dashboard.css` | Dashboard pages |
| `bff/src/public/css/booking.css` | Booking/payment pages |
| `bff/src/public/css/map.css` | Map containers/popups |

Layout CSS loading:

```html
<!-- bff/src/views/layouts/boilerplate.ejs -->
<link rel="stylesheet" href="/css/base.css">
<link rel="stylesheet" href="/css/navbar.css">
<link rel="stylesheet" href="/css/footer.css">
<link rel="stylesheet" href="/css/home.css">
<link rel="stylesheet" href="/css/listing.css">
<!-- ... rest of file -->
```

No shared design system package or token file was found. Styling is organized by global CSS files and template-level class names.

