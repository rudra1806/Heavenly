/**
 * HTTP client for synchronous inter-service communication.
 * 
 * When one microservice needs data from another in real-time
 * (e.g., Booking Service needs listing price from Listing Service),
 * it uses this client instead of directly querying another service's database.
 * 
 * Features:
 *   - Timeout handling (8s default)
 *   - Retry with exponential backoff (2 retries for 5xx/network errors)
 *   - Safe JSON parsing (handles non-JSON responses gracefully)
 *   - Automatic JSON parsing
 *   - Error wrapping with service name for debugging
 *   - Forwards JWT token for authenticated internal calls
 * 
 * Usage:
 *   const client = require('@heavenly/shared').serviceClient;
 *   const listing = await client.get('http://listing-service:3002/listings/abc123', req);
 */

const AppError = require('../errors/AppError');

const DEFAULT_TIMEOUT = 8000; // 8 seconds (increased from 5s for aggregation calls)
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 300;    // 300ms → 600ms

/**
 * Determines if an error or status code is retryable.
 */
function isRetryable(statusCode, error) {
    if (error) {
        return error.name === 'AbortError' ||
               error.code === 'ECONNREFUSED' ||
               error.code === 'ECONNRESET' ||
               error.code === 'EPIPE' ||
               error.message?.includes('fetch failed');
    }
    return statusCode >= 500 || statusCode === 429;
}

/**
 * Safely parses JSON from a response.
 * Returns parsed data or a fallback error object.
 */
async function safeParseJSON(response) {
    try {
        const text = await response.text();
        if (!text || text.trim().length === 0) {
            return { success: false, error: `Empty response (${response.status})` };
        }
        return JSON.parse(text);
    } catch {
        return { success: false, error: `Non-JSON response (${response.status})` };
    }
}

/**
 * Makes an HTTP request to another microservice with retry and timeout.
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

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
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

            const data = await safeParseJSON(response);

            if (!response.ok) {
                // If retryable and attempts remain, retry
                if (isRetryable(response.status) && attempt <= MAX_RETRIES) {
                    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    console.warn(`[ServiceClient] ${options.method || 'GET'} ${url} returned ${response.status}, retrying in ${delay}ms (${attempt}/${MAX_RETRIES + 1})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                throw new AppError(
                    response.status,
                    data.error || `Service request failed: ${url}`
                );
            }

            return data;
        } catch (err) {
            lastError = err;

            // If it's our custom AppError with a non-retryable status, throw immediately
            if (err instanceof AppError && !isRetryable(err.statusCode)) {
                throw err;
            }

            // Network/timeout errors — retry if attempts remain
            if (attempt <= MAX_RETRIES && isRetryable(null, err)) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`[ServiceClient] ${options.method || 'GET'} ${url} failed (${err.message}), retrying in ${delay}ms (${attempt}/${MAX_RETRIES + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            if (err instanceof AppError) throw err;

            if (err.name === 'AbortError') {
                throw new AppError(504, `Service timeout: ${url}`);
            }

            // Network error — service is down or unreachable
            throw new AppError(503, `Service unavailable: ${url} — ${err.message}`);
        }
    }

    // Should not reach here, but just in case
    throw lastError || new AppError(503, `Service call failed after retries: ${url}`);
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
