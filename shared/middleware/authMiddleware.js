const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Express middleware to verify JWT tokens from the Authorization header.
 * 
 * Usage: app.use('/protected', authMiddleware);
 * 
 * On success, attaches decoded user to req.user:
 *   { id, username, email, role }
 * 
 * On failure, returns 401 with JSON error.
 */
function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!JWT_SECRET) {
            console.error('JWT_SECRET is not configured!');
            return res.status(500).json({
                success: false,
                error: 'Server authentication configuration error.'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        // Attach user info to request object for downstream use
        req.user = {
            id: decoded.id,
            username: decoded.username,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired. Please refresh your token.'
            });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token.'
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Authentication error.'
        });
    }
}

/**
 * Middleware to check if the authenticated user has admin role.
 * Must be used AFTER authMiddleware.
 */
authMiddleware.requireAdmin = function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required.'
        });
    }
    next();
};

/**
 * Optional auth — attaches user if token present, but doesn't block if missing.
 * Useful for routes that behave differently for logged-in vs anonymous users.
 */
authMiddleware.optional = function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = {
                id: decoded.id,
                username: decoded.username,
                email: decoded.email,
                role: decoded.role
            };
        }
    } catch (err) {
        // Token invalid or expired — proceed without user
        req.user = null;
    }
    next();
};

module.exports = authMiddleware;
