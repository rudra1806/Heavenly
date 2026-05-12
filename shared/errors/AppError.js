/**
 * Custom application error class for consistent error handling across services.
 * 
 * Extends the native Error class with an HTTP status code and operational flag.
 * 
 * Usage:
 *   throw new AppError(404, 'Listing not found');
 *   throw new AppError(400, 'Validation failed', { fields: [...] });
 */
class AppError extends Error {
    /**
     * @param {number} statusCode - HTTP status code (e.g., 400, 404, 500)
     * @param {string} message - Human-readable error message
     * @param {object} [details] - Optional additional error details
     */
    constructor(statusCode, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Distinguishes expected errors from bugs
        this.details = details;

        // Capture stack trace, excluding the constructor call from it
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Converts the error to a JSON-friendly object for API responses.
     */
    toJSON() {
        const obj = {
            success: false,
            status: this.status,
            statusCode: this.statusCode,
            error: this.message
        };
        if (this.details) {
            obj.details = this.details;
        }
        return obj;
    }
}

module.exports = AppError;
