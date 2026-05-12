/**
 * JWT validation middleware for the API Gateway.
 * 
 * This runs AT THE GATEWAY LEVEL before requests are proxied to services.
 * It validates the JWT token and attaches user info to the request,
 * which the proxy then forwards via X-User-* headers.
 * 
 * Three modes:
 *   - required: Blocks request if no valid token (401)
 *   - optional: Attaches user if token present, passes through if not
 *   - requireAdmin: Blocks if user is not an admin (403)
 */

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Extracts and verifies JWT from the Authorization header.
 * Returns decoded payload or null.
 */
function extractUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    try {
        const token = authHeader.split(' ')[1];
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

const jwtValidation = {
    /**
     * Requires a valid JWT. Returns 401 if missing or invalid.
     */
    required: (req, res, next) => {
        const user = extractUser(req);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required. Please provide a valid token.'
            });
        }

        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        };

        next();
    },

    /**
     * Attaches user if token is present, but allows anonymous access.
     */
    optional: (req, res, next) => {
        const user = extractUser(req);

        if (user) {
            req.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            };
        } else {
            req.user = null;
        }

        next();
    },

    /**
     * Requires admin role. Must be used AFTER required.
     */
    requireAdmin: (req, res, next) => {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required.'
            });
        }
        next();
    }
};

module.exports = { jwtValidation };
