/**
 * API Client for the BFF.
 * 
 * Translates session-based browser requests into JWT-authenticated API calls.
 * The BFF stores JWT tokens in the session after login. All subsequent API calls
 * forward the token via Authorization header.
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

/**
 * Makes an HTTP request to the API Gateway.
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

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.error || `API call failed: ${response.status}`);
        error.statusCode = response.status;
        error.data = data;
        throw error;
    }

    return data;
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
        session.user = data.data.user;
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
        session.user = data.data.user;
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
