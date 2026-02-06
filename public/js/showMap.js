/**
 * Show Page Map — Displays a single listing's location on a MapLibre map.
 *
 * How it works:
 * 1. Reads the listing's coordinates from a data attribute on the #map element.
 * 2. Creates a MapLibre map using FREE OpenStreetMap raster tiles (no API key).
 * 3. Centers the map on the listing's geocoded coordinates.
 * 4. Places a marker at that location.
 * 5. Adds a popup with the listing title, price, and location.
 *
 * Tile source: OpenStreetMap (free, open data, no credit card).
 */

(function () {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMap);
    } else {
        initMap();
    }

    function initMap() {
        // Check if MapLibre is loaded
        if (typeof maplibregl === 'undefined') {
            console.error('MapLibre GL JS library not loaded');
            return;
        }

        const mapEl = document.getElementById('map');
        if (!mapEl) {
            console.log('No map container found on this page');
            return;
        }

        // Read coordinates and listing data injected from EJS via data attributes
        const lng = parseFloat(mapEl.dataset.lng);
        const lat = parseFloat(mapEl.dataset.lat);
        const title = mapEl.dataset.title;
        const location = mapEl.dataset.location;
        const price = mapEl.dataset.price;

        console.log('Map data:', { lng, lat, title, location, price });

        // If coordinates are default (0,0) or invalid — geocoding didn't find a result
        if (!lng || !lat || (lng === 0 && lat === 0) || isNaN(lng) || isNaN(lat)) {
            mapEl.innerHTML = '<p style="text-align:center;padding:2rem;color:#888;">Map not available for this location.</p>';
            return;
        }

        try {
            // Step 1: Create the MapLibre map instance
            // Uses OpenStreetMap raster tiles served via a free tile server
            const map = new maplibregl.Map({
                container: 'map',                   // HTML element ID
                style: {
                    version: 8,
                    sources: {
                        'osm-tiles': {
                            type: 'raster',
                            tiles: [
                                'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                            ],
                            tileSize: 256,
                            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        }
                    },
                    layers: [
                        {
                            id: 'osm-tiles-layer',
                            type: 'raster',
                            source: 'osm-tiles',
                            minzoom: 0,
                            maxzoom: 19
                        }
                    ]
                },
                center: [lng, lat],                 // [longitude, latitude]
                zoom: 12                            // Zoom level (0-18)
            });

            // Step 2: Add navigation controls (zoom in/out, compass)
            map.addControl(new maplibregl.NavigationControl(), 'top-right');

            // Step 3: Create a popup with listing details
            const popup = new maplibregl.Popup({ offset: 30 })
                .setHTML(
                    `<div class="map-popup">
                        <h6>${title}</h6>
                        <p>₹ ${Number(price).toLocaleString('en-IN')} / night</p>
                        <p><i class="fa-solid fa-location-dot"></i> ${location}</p>
                    </div>`
                );

            // Step 4: Place a marker on the map at the listing's coordinates
            new maplibregl.Marker({ color: '#fe424d' })  // Red marker matching the brand
                .setLngLat([lng, lat])
                .setPopup(popup)                           // Attach popup to marker
                .addTo(map);

            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Error initializing map:', error);
            mapEl.innerHTML = '<p style="text-align:center;padding:2rem;color:#888;">Error loading map. Please refresh the page.</p>';
        }
    }
})();
