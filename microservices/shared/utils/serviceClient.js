/**
 * HTTP client for synchronous inter-service communication.
 * 
 * When one microservice needs data from another in real-time
 * (e.g., Booking Service needs listing price from Listing Service),
 * it uses this client instead of directly querying another service's database.
 * 
 * Features:
 *   - Timeout handling (5s default)
 *   - Automatic JSON parsing
 *   - Error wrapping with service name for debugging
 *   - Forwards JWT token for authenticated internal calls
 * 
 * Usage:
 *   const client = require('@heavenly/shared').serviceClient;
 *   const listing = await client.get('http://listing-service:3002/listings/abc123', req);
 */

const AppError = require('../errors/AppError');

const DEFAULT_TIMEOUT = 5000; // 5 seconds

/**
 * Makes an HTTP request to another microservice.
 * 
 * @param {string} url - Full URL of the target service endpoint
 * @param {object} options - Fetch options (method, body, headers, etc.)
 * @param {object} [req] - Express request object (to forward auth token)
 * @returns {Promise<object>} Parsed JSON response
 */
async function request(url, options = {}, req = null) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Forward the JWT token for authenticated internal calls
    if (req && req.headers && req.headers.authorization) {
        headers['Authorization'] = req.headers.authorization;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

        const response = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        clearTimeout(timeout);

        const data = await response.json();

        if (!response.ok) {
            throw new AppError(
                response.status,
                data.error || `Service request failed: ${url}`
            );
        }

        return data;
    } catch (err) {
        if (err instanceof AppError) throw err;

        if (err.name === 'AbortError') {
            throw new AppError(504, `Service timeout: ${url}`);
        }

        // Network error — service is down or unreachable
        throw new AppError(503, `Service unavailable: ${url} — ${err.message}`);
    }
}

/**
 * Convenience methods for common HTTP verbs.
 */
module.exports = {
    /**
     * GET request to another service.
     * @param {string} url - Target URL
     * @param {object} [req] - Express request (for auth forwarding)
     */
    get: (url, req = null) => request(url, { method: 'GET' }, req),

    /**
     * POST request to another service.
     * @param {string} url - Target URL
     * @param {object} body - Request body
     * @param {object} [req] - Express request (for auth forwarding)
     */
    post: (url, body, req = null) => request(url, { method: 'POST', body }, req),

    /**
     * PUT request to another service.
     * @param {string} url - Target URL
     * @param {object} body - Request body
     * @param {object} [req] - Express request (for auth forwarding)
     */
    put: (url, body, req = null) => request(url, { method: 'PUT', body }, req),

    /**
     * DELETE request to another service.
     * @param {string} url - Target URL
     * @param {object} [req] - Express request (for auth forwarding)
     */
    delete: (url, req = null) => request(url, { method: 'DELETE' }, req),

    /**
     * Raw request with full control over options.
     */
    request
};
