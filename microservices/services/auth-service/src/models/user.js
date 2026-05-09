/**
 * User model for the Auth Service.
 * 
 * Key differences from the monolith:
 *   - Uses bcrypt directly instead of passport-local-mongoose plugin
 *   - Password hashing handled via Mongoose pre-save middleware
 *   - No session-related methods — authentication is JWT-based
 * 
 * Fields:
 *   - username: unique, case-insensitive (lowercased on save)
 *   - email: unique
 *   - password: bcrypt-hashed (never stored in plain text)
 *   - role: 'user' or 'admin'
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Schema = mongoose.Schema;

const SALT_ROUNDS = 12; // bcrypt cost factor — higher = slower but more secure

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        lowercase: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

/**
 * Pre-save middleware: Hash password before saving to database.
 * 
 * Only hashes if the password field has been modified (new user or password change).
 * This prevents re-hashing an already-hashed password on unrelated updates.
 */
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

/**
 * Instance method: Compare a candidate password against the stored hash.
 * 
 * @param {string} candidatePassword - Plain text password to verify
 * @returns {Promise<boolean>} True if password matches
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Transform: Remove password from JSON output.
 * 
 * Ensures password hash is NEVER included in API responses,
 * even if a developer accidentally sends the full user object.
 */
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

// Indexes for efficient lookups
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

module.exports = mongoose.model('User', userSchema);
