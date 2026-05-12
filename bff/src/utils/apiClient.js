/**
 * API Client for the BFF.
 * 
 * Translates session-based browser requests into JWT-authenticated API calls.
 * The BFF stores JWT tokens in the session after login. All subsequent API calls
 * forward the token via Authorization header.
 * 
 * Resilience features:
 *   - Request timeout (10s) via AbortController
 *   - Retry with exponential backoff (3 attempts) for 5xx and network errors
 *   - Safe JSON parsing (falls back gracefully on non-JSON responses)
 *   - Automatic token refresh on 401 responses
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;       // 500ms → 1000ms → 2000ms
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Determines if an error or status code is retryable.
 * Only retry on server errors (5xx) and network issues — NOT on 4xx client errors.
 */
function isRetryable(statusCode, error) {
    if (error) {
        // Network errors (ECONNREFUSED, ECONNRESET, AbortError) are retryable
        return error.name === 'AbortError' ||
               error.code === 'ECONNREFUSED' ||
               error.code === 'ECONNRESET' ||
               error.code === 'EPIPE' ||
               error.message?.includes('fetch failed');
    }
    // 5xx server errors and 429 (rate limited) are retryable
    return statusCode >= 500 || statusCode === 429;
}

/**
 * Safely parses JSON from a response.
 * Returns the parsed data or a fallback error object if parsing fails.
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
 * Makes an HTTP request to the API Gateway with retry and timeout.
 * 
 * @param {string} path - API path (e.g., '/api/listings')
 * @param {object} options - { method, body, headers, session }
 * @returns {object} - Parsed JSON response
 */
async function apiCall(path, options = {}) {
    const { method = 'GET', body = null, headers = {}, session = null } = options;

    const url = `${GATEWAY_URL}${path}`;
    const fetchOptions = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };

    // Forward JWT token from session
    if (session?.accessToken) {
        fetchOptions.headers['Authorization'] = `Bearer ${session.accessToken}`;
    }

    if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
    }

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Create a timeout for this attempt
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });

            clearTimeout(timeout);

            // Handle 401 — try automatic token refresh (only on first attempt)
            if (response.status === 401 && session?.refreshToken && attempt === 1) {
                const refreshed = await refreshToken(session);
                if (refreshed) {
                    // Update the Authorization header with the new token and retry immediately
                    fetchOptions.headers['Authorization'] = `Bearer ${session.accessToken}`;
                    continue;
                }
            }

            const data = await safeParseJSON(response);

            if (!response.ok) {
                // If retryable, continue to next attempt
                if (isRetryable(response.status) && attempt < MAX_RETRIES) {
                    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    console.warn(`[API] ${method} ${path} returned ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                // Non-retryable or last attempt — throw
                const error = new Error(data.error || `API call failed: ${response.status}`);
                error.statusCode = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (err) {
            lastError = err;

            // If it's already our custom error (non-retryable 4xx), throw immediately
            if (err.statusCode && !isRetryable(err.statusCode)) {
                throw err;
            }

            // Network/timeout errors — retry if attempts remain
            if (attempt < MAX_RETRIES && isRetryable(null, err)) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`[API] ${method} ${path} failed (${err.message}), retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }

            // Last attempt or non-retryable error
            if (err.name === 'AbortError') {
                const timeoutErr = new Error(`Request timeout: ${method} ${path} (${REQUEST_TIMEOUT_MS}ms)`);
                timeoutErr.statusCode = 504;
                throw timeoutErr;
            }

            throw err;
        }
    }

    // Should not reach here, but just in case
    throw lastError || new Error(`API call failed after ${MAX_RETRIES} attempts`);
}

/**
 * Login via API and store tokens in session.
 */
async function login(credentials, session) {
    const data = await apiCall('/api/auth/login', {
        method: 'POST',
        body: credentials
    });

    if (data.data?.accessToken) {
        session.accessToken = data.data.accessToken;
        session.refreshToken = data.data.refreshToken;
        // Normalize user: Auth Service returns _id, but BFF routes use .id
        const user = data.data.user;
        user.id = user._id;
        session.user = user;
    }

    return data;
}

/**
 * Register via API and store tokens in session.
 */
async function register(userData, session) {
    const data = await apiCall('/api/auth/register', {
        method: 'POST',
        body: userData
    });

    if (data.data?.accessToken) {
        session.accessToken = data.data.accessToken;
        session.refreshToken = data.data.refreshToken;
        // Normalize user: Auth Service returns _id, but BFF routes use .id
        const user = data.data.user;
        user.id = user._id;
        session.user = user;
    }

    return data;
}

/**
 * Logout — clear session and blacklist token.
 */
async function logout(session) {
    try {
        await apiCall('/api/auth/logout', {
            method: 'POST',
            session
        });
    } catch {
        // Logout can fail if token already expired — that's OK
    }
    session.accessToken = null;
    session.refreshToken = null;
    session.user = null;
}

/**
 * Refresh access token using the refresh token.
 */
async function refreshToken(session) {
    if (!session?.refreshToken) return false;

    try {
        const data = await apiCall('/api/auth/refresh', {
            method: 'POST',
            body: { refreshToken: session.refreshToken }
        });

        if (data.data?.accessToken) {
            session.accessToken = data.data.accessToken;
            return true;
        }
    } catch {
        // Refresh failed — force re-login
        session.accessToken = null;
        session.refreshToken = null;
        session.user = null;
    }
    return false;
}

module.exports = { apiCall, login, register, logout, refreshToken, GATEWAY_URL };
