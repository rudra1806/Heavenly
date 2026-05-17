/**
 * BFF (Backend-for-Frontend) — Entry Point
 * 
 * The user-facing server. Replaces `app.js` from the monolith.
 * 
 * Responsibilities:
 *   - Renders the existing EJS templates with data from microservices
 *   - Manages session cookies (stores JWT tokens in session)
 *   - Serves static files (CSS, JS, images)
 *   - Translates form submissions into API Gateway calls
 * 
 * This is the ONLY service the browser talks to directly.
 * All data flows through: Browser → BFF → API Gateway → Microservices
 * 
 * Port: 8080
 */

const express = require('express');
const path = require('path');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const morgan = require('morgan');

// Routes
const authRoutes = require('./routes/auth.js');
const listingRoutes = require('./routes/listings.js');
const reviewRoutes = require('./routes/reviews.js');
const bookingRoutes = require('./routes/bookings.js');
const dashboardRoutes = require('./routes/dashboard.js');
const adminRoutes = require('./routes/admin.js');
const pageRoutes = require('./routes/pages.js');

let setupMetrics;
try {
    ({ setupMetrics } = require('../../shared/src/metrics'));
} catch {
    ({ setupMetrics } = require('/app/shared/src/metrics'));
}

const app = express();
const PORT = process.env.PORT || 8080;

// ===== View Engine =====
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ===== Middleware =====
app.use(morgan('[:date[iso]] :method :url :status :response-time ms'));
setupMetrics(app, 'bff');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

// ===== Session Configuration =====
// In-memory session store (no MongoDB dependency like the monolith)
// In production, use connect-redis or connect-mongo
const sessionOptions = {
    secret: process.env.SESSION_SECRET || 'heavenly-bff-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    }
};
app.use(session(sessionOptions));
app.use(flash());

// ===== Template Locals (replaces Passport's res.locals.currentUser) =====
app.use((req, res, next) => {
    // Make user info available to all templates
    res.locals.currentUser = req.session.user || null;
    res.locals.success = req.flash('success');
    // Support both flash messages and query param errors
    // Query param errors are used when session is destroyed (e.g., user deleted)
    const flashErrors = req.flash('error');
    const queryError = req.query.error;
    res.locals.error = queryError ? [...flashErrors, queryError] : flashErrors;
    next();
});

// ===== Health Check =====
app.get('/health', (req, res) => {
    res.json({
        service: 'bff',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        type: 'frontend server (EJS + session → JWT)'
    });
});

// ===== Routes =====
// Home
app.get('/', (req, res) => {
    res.render('home.ejs');
});

// Mount route modules (same URL structure as the monolith)
app.use('/', authRoutes);
app.use('/', adminRoutes);
app.use('/', dashboardRoutes);
app.use('/', listingRoutes);
app.use('/', reviewRoutes);
app.use('/', bookingRoutes);
app.use('/', pageRoutes);

// ===== 404 Handler =====
app.use((req, res) => {
    res.status(404).render('error.ejs', {
        statusCode: 404,
        message: 'Page Not Found'
    });
});

// ===== Error Handler =====
app.use((err, req, res, next) => {
    console.error(`[BFF Error] ${req.method} ${req.originalUrl}:`, err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).render('error.ejs', {
        statusCode,
        message: err.message || 'Something went wrong!'
    });
});

// ===== Start Server =====
app.listen(PORT, () => {
    console.log(`[BFF] Running on port ${PORT}`);
    console.log(`[BFF] Gateway URL: ${process.env.GATEWAY_URL || 'http://localhost:3000'}`);
    console.log(`[BFF] Session → JWT translation layer active`);
});

module.exports = app;
