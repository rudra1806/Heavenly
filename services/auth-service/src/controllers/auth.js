/**
 * Auth Controller — handles registration, login, logout, token refresh, and profile.
 * 
 * Every endpoint returns JSON (no server-side rendering in microservices).
 * The BFF layer will call these endpoints and render EJS templates with the responses.
 */

const User = require('../models/user.js');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
} = require('../utils/jwt.js');

// Redis client — injected via setRedisClient() from index.js
let redisClient = null;

/**
 * Injects the Redis client instance.
 * Called once during service startup from index.js
 */
function setRedisClient(client) {
    redisClient = client;
}

/**
 * POST /auth/register
 * 
 * Creates a new user account and returns JWT tokens.
 * Mirrors the monolith's signup flow but returns tokens instead of setting a session.
 */
async function register(req, res) {
    try {
        const { username, email, password } = req.body;

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username, email, and password are required.'
            });
        }

        // Check if username or email already exists
        const existingUser = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: email.toLowerCase() }
            ]
        });

        if (existingUser) {
            const field = existingUser.username === username.toLowerCase() ? 'Username' : 'Email';
            return res.status(409).json({
                success: false,
                error: `${field} is already taken.`
            });
        }

        // Create and save user (password is auto-hashed by pre-save middleware)
        const user = new User({ username, email, password });
        await user.save();

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        console.log(`[Auth] User registered: ${user.username}`);

        res.status(201).json({
            success: true,
            message: 'Registration successful.',
            data: {
                user: user.toJSON(),
                accessToken,
                refreshToken
            }
        });
    } catch (err) {
        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                error: messages.join(', ')
            });
        }
        console.error('[Auth] Registration error:', err.message);
        res.status(500).json({ success: false, error: 'Registration failed.' });
    }
}

/**
 * POST /auth/login
 * 
 * Authenticates user with username/email + password, returns JWT tokens.
 */
async function login(req, res) {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username/email and password are required.'
            });
        }

        // Find user by username OR email (flexible login)
        const user = await User.findOne({
            $or: [
                { username: username.toLowerCase() },
                { email: username.toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username/email or password.'
            });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username/email or password.'
            });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        console.log(`[Auth] User logged in: ${user.username}`);

        res.json({
            success: true,
            message: 'Login successful.',
            data: {
                user: user.toJSON(),
                accessToken,
                refreshToken
            }
        });
    } catch (err) {
        console.error('[Auth] Login error:', err.message);
        res.status(500).json({ success: false, error: 'Login failed.' });
    }
}

/**
 * POST /auth/logout
 * 
 * Invalidates the current access token by adding it to the Redis blacklist.
 * The token will remain blacklisted until its natural expiry.
 */
async function logout(req, res) {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ') && redisClient) {
            const token = authHeader.split(' ')[1];
            // Blacklist the token — set TTL to match the token's remaining lifetime
            // Using 15 minutes (900s) as max since that's our access token expiry
            await redisClient.set(`blacklist:${token}`, 'true', { EX: 900 });
        }

        console.log(`[Auth] User logged out: ${req.user?.username || 'unknown'}`);

        res.json({
            success: true,
            message: 'Logged out successfully.'
        });
    } catch (err) {
        console.error('[Auth] Logout error:', err.message);
        res.status(500).json({ success: false, error: 'Logout failed.' });
    }
}

/**
 * POST /auth/refresh
 * 
 * Exchanges a valid refresh token for a new access token.
 * This allows users to stay authenticated without re-entering credentials.
 */
async function refresh(req, res) {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token is required.'
            });
        }

        // Verify the refresh token
        const decoded = verifyRefreshToken(refreshToken);

        // Fetch the user to ensure they still exist and get current role
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'User not found. Token is invalid.'
            });
        }

        // Generate new access token with current user data
        const accessToken = generateAccessToken(user);

        res.json({
            success: true,
            data: { accessToken }
        });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Refresh token expired. Please login again.'
            });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid refresh token.'
            });
        }
        console.error('[Auth] Refresh error:', err.message);
        res.status(500).json({ success: false, error: 'Token refresh failed.' });
    }
}

/**
 * GET /auth/me
 * 
 * Returns the current authenticated user's profile.
 * Requires a valid JWT token (validated by authMiddleware).
 */
async function me(req, res) {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found.'
            });
        }

        res.json({
            success: true,
            data: { user: user.toJSON() }
        });
    } catch (err) {
        console.error('[Auth] Profile error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch profile.' });
    }
}

/**
 * GET /auth/users/:id
 * 
 * Internal endpoint — used by other services to fetch user info.
 * e.g., Listing Service needs owner username to display on listing page.
 */
async function getUserById(req, res) {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found.'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (err) {
        console.error('[Auth] getUserById error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch user.' });
    }
}

/**
 * GET /auth/users
 * 
 * Internal/admin endpoint — returns all users (with optional search).
 */
async function getAllUsers(req, res) {
    try {
        const searchQuery = req.query.search;
        let users;

        if (searchQuery && searchQuery.trim() !== '') {
            const escapedQuery = searchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchRegex = new RegExp(escapedQuery, 'i');
            users = await User.find({
                $or: [
                    { username: searchRegex },
                    { email: searchRegex }
                ]
            });
        } else {
            users = await User.find();
        }

        res.json({
            success: true,
            data: {
                users: users.map(u => u.toJSON()),
                count: users.length
            }
        });
    } catch (err) {
        console.error('[Auth] getAllUsers error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch users.' });
    }
}

/**
 * DELETE /auth/users/:id
 * 
 * Deletes a user account. Publishes 'user.deleted' event via RabbitMQ
 * so other services can cascade-delete related data.
 */
async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found.'
            });
        }

        // Prevent admin from deleting themselves
        if (req.user && user._id.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'You cannot delete your own account.'
            });
        }

        await User.findByIdAndDelete(id);

        // Publish event for cascade deletion in other services
        // This is imported in index.js and injected — see publishUserDeleted
        if (deleteUser._publishEvent) {
            await deleteUser._publishEvent('user.deleted', {
                userId: id,
                username: user.username
            });
        }

        console.log(`[Auth] User deleted: ${user.username}`);

        res.json({
            success: true,
            message: `User "${user.username}" deleted successfully.`
        });
    } catch (err) {
        console.error('[Auth] deleteUser error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to delete user.' });
    }
}

module.exports = {
    register,
    login,
    logout,
    refresh,
    me,
    getUserById,
    getAllUsers,
    deleteUser,
    setRedisClient
};
