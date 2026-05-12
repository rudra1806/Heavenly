/**
 * Dashboard Response Cache — short-lived in-memory cache for dashboard API data.
 * 
 * Problem: Dashboard pages make multiple API calls to backend services.
 *          When users navigate between tabs quickly, the same data is re-fetched.
 * 
 * Solution: Cache API responses for a short TTL (30s) keyed by userId + endpoint.
 *           Any write operation (POST/PUT/DELETE) invalidates the user's cache.
 * 
 * This is a simple Map-based cache. In production with multiple BFF instances,
 * you'd use Redis instead.
 */

const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// Map<string, { data: any, expiresAt: number }>
const cache = new Map();

/**
 * Get a cached value if it exists and hasn't expired.
 * @param {string} key - Cache key (e.g., `${userId}:listings`)
 * @returns {any|null} - Cached data or null if miss/expired
 */
function get(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

/**
 * Store a value in the cache.
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} [ttl] - Optional TTL override in ms
 */
function set(key, data, ttl = CACHE_TTL_MS) {
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttl
    });
}

/**
 * Invalidate all cache entries for a specific user.
 * Call this after any write operation (create/update/delete).
 * @param {string} userId - User ID whose cache should be cleared
 */
function invalidateUser(userId) {
    for (const key of cache.keys()) {
        if (key.startsWith(`${userId}:`)) {
            cache.delete(key);
        }
    }
}

/**
 * Helper: fetch with cache. Tries cache first, falls back to API call.
 * @param {string} cacheKey - Cache key
 * @param {Function} fetchFn - Async function that returns data
 * @returns {any} - Cached or freshly fetched data
 */
async function fetchWithCache(cacheKey, fetchFn) {
    const cached = get(cacheKey);
    if (cached !== null) {
        return cached;
    }
    const data = await fetchFn();
    set(cacheKey, data);
    return data;
}

// Periodic cleanup of expired entries (every 60s)
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
        if (now > entry.expiresAt) {
            cache.delete(key);
        }
    }
}, 60 * 1000).unref(); // unref() so the timer doesn't prevent process exit

module.exports = { get, set, invalidateUser, fetchWithCache };
