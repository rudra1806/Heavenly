/**
 * JWT utility functions for the Auth Service.
 * 
 * Generates and verifies two types of tokens:
 *   - Access Token: Short-lived (15 min), used for API authentication
 *   - Refresh Token: Long-lived (7 days), used to get new access tokens
 * 
 * Why two tokens?
 *   - Access tokens are short-lived to limit damage if stolen
 *   - Refresh tokens allow users to stay logged in without re-entering credentials
 *   - Different secrets prevent cross-use (can't use a refresh token as an access token)
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';   // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d';   // 7 days

/**
 * Generates an access token containing user identity and role.
 * 
 * @param {object} user - User document from MongoDB
 * @returns {string} Signed JWT access token
 */
function generateAccessToken(user) {
    return jwt.sign(
        {
            id: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
}

/**
 * Generates a refresh token (contains only user ID — minimal payload).
 * 
 * @param {object} user - User document from MongoDB
 * @returns {string} Signed JWT refresh token
 */
function generateRefreshToken(user) {
    return jwt.sign(
        { id: user._id.toString() },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
}

/**
 * Verifies an access token and returns the decoded payload.
 * 
 * @param {string} token - JWT access token
 * @returns {object} Decoded payload { id, username, email, role }
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyAccessToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

/**
 * Verifies a refresh token and returns the decoded payload.
 * 
 * @param {string} token - JWT refresh token
 * @returns {object} Decoded payload { id }
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
function verifyRefreshToken(token) {
    return jwt.verify(token, JWT_REFRESH_SECRET);
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    ACCESS_TOKEN_EXPIRY,
    REFRESH_TOKEN_EXPIRY
};
