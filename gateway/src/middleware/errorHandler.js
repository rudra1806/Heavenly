/**
 * Global error handler for the API Gateway.
 * 
 * Catches any errors that bubble up through the middleware chain.
 * Returns consistent JSON error responses.
 */

function errorHandler(err, req, res, next) {
    console.error(`[Gateway Error] ${req.method} ${req.originalUrl}:`, err.message);

    // If headers already sent, delegate to Express default handler
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.statusCode || err.status || 500;

    res.status(statusCode).json({
        success: false,
        error: statusCode === 500
            ? 'Internal server error'  // Don't expose internal error details
            : err.message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack
        })
    });
}

module.exports = { errorHandler };
