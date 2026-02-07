/**
 * Geocoding utility using Nominatim (OpenStreetMap's free geocoding service).
 * 
 * How it works:
 * 1. Takes a location string (e.g., "Malibu, United States")
 * 2. Sends a request to Nominatim's search API
 * 3. Returns GeoJSON-compatible geometry { type: 'Point', coordinates: [lng, lat] }
 * 
 * Nominatim usage policy: max 1 request/second, include a User-Agent header.
 * https://operations.osmfoundation.org/policies/nominatim/
 */

async function geocode(location) {
    const defaultGeometry = {
        type: 'Point',
        coordinates: [0, 0]
    };

    try {
        const query = encodeURIComponent(location);
        const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Heavenly-App/1.0' // Required by Nominatim usage policy
            }
        });

        if (!response.ok) {
            console.error(`Geocoding: HTTP ${response.status} for "${location}"`);
            return defaultGeometry;
        }

        const data = await response.json();

        if (data.length === 0) {
            // If no results found, return default coordinates (0, 0)
            console.log(`Geocoding: No results found for "${location}"`);
            return defaultGeometry;
        }

        // Nominatim returns lat/lon as strings — convert to numbers
        // GeoJSON standard: coordinates are [longitude, latitude]
        const { lon, lat } = data[0];
        console.log(`Geocoding: "${location}" → [${lon}, ${lat}]`);

        return {
            type: 'Point',
            coordinates: [parseFloat(lon), parseFloat(lat)]
        };
    } catch (error) {
        console.error(`Geocoding error for "${location}":`, error.message);
        return defaultGeometry;
    }
}

module.exports = geocode;
