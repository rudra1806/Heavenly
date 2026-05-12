/**
 * Auth Service routes.
 * 
 * Public routes (no auth required):
 *   POST /auth/register — Create account
 *   POST /auth/login    — Authenticate
 *   POST /auth/refresh  — Get new access token
 * 
 * Protected routes (JWT required):
 *   POST   /auth/logout     — Invalidate token
 *   GET    /auth/me         — Current user profile
 *   GET    /auth/users/:id  — Get user by ID (internal)
 *   GET    /auth/users      — List all users (admin)
 *   DELETE /auth/users/:id  — Delete user (admin)
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.js');

// Import shared auth middleware
// In Docker, shared is at /app/shared; locally, use relative path
let authMiddleware;
try {
    authMiddleware = require('../../../../shared/middleware/authMiddleware');
} catch {
    authMiddleware = require('/app/shared/middleware/authMiddleware');
}

// ===== Public Routes =====

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);

// ===== Protected Routes =====

router.post('/auth/logout', authMiddleware, authController.logout);
router.get('/auth/me', authMiddleware, authController.me);

// ===== Internal / Admin Routes =====

router.get('/auth/users/:id', authController.getUserById);
router.get('/auth/users', authMiddleware, authMiddleware.requireAdmin, authController.getAllUsers);
router.delete('/auth/users/:id', authMiddleware, authMiddleware.requireAdmin, authController.deleteUser);

module.exports = router;
