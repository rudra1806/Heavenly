/**
 * Cluster Map — Displays all listings as clustered markers on the index page.
 *
 * How it works:
 * 1. Reads a GeoJSON FeatureCollection from a <script> tag injected by EJS.
 * 2. Creates a MapLibre map using FREE OpenStreetMap raster tiles.
 * 3. Adds the listings as a GeoJSON source with clustering enabled.
 * 4. Renders cluster circles (colored by count) and individual markers.
 * 5. Clicking a cluster zooms in; clicking a point shows a popup with details.
 *
 * Tile source: OpenStreetMap (free, open data, no credit card).
 */

(function () {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initClusterMap);
    } else {
        initClusterMap();
    }

    function initClusterMap() {
        // Check if MapLibre is loaded
        if (typeof maplibregl === 'undefined') {
            console.error('MapLibre GL JS library not loaded');
            return;
        }

        const mapEl = document.getElementById('cluster-map');
        if (!mapEl) {
            console.log('No cluster map container found on this page');
            return;
        }

        // Listing data is injected as a global variable from EJS
        const listings = window.listingsData || [];
        console.log('Cluster map listings:', listings.length);

        // Build a GeoJSON FeatureCollection from listings
        const geojson = {
            type: 'FeatureCollection',
            features: listings
                .filter(l => l.geometry && l.geometry.coordinates &&
                    !(l.geometry.coordinates[0] === 0 && l.geometry.coordinates[1] === 0))
                .map(l => ({
                    type: 'Feature',
                    geometry: l.geometry,
                    properties: {
                        id: l._id,
                        title: l.title,
                        price: l.price,
                        location: l.location,
                        country: l.country,
                        image: l.image.url
                    }
                }))
        };

        console.log('Valid features for map:', geojson.features.length);

        try {
            // Step 1: Create the map
            const map = new maplibregl.Map({
                container: 'cluster-map',
                style: {
                    version: 8,
                    sources: {
                        'osm-tiles': {
                            type: 'raster',
                            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                            tileSize: 256,
                            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        }
                    },
                    layers: [{
                        id: 'osm-tiles-layer',
                        type: 'raster',
                        source: 'osm-tiles',
                        minzoom: 0,
                        maxzoom: 19
                    }]
                },
                center: [78.9629, 20.5937], // Default center: India
                zoom: 3
            });

            map.addControl(new maplibregl.NavigationControl(), 'top-right');

            map.on('load', () => {
                // Step 2: Add listings as a clustered GeoJSON source
                map.addSource('listings', {
                    type: 'geojson',
                    data: geojson,
                    cluster: true,          // Enable clustering
                    clusterMaxZoom: 14,     // Max zoom to cluster points
                    clusterRadius: 50       // Radius of each cluster (px)
                });

                // Step 3: Cluster circle layer — larger circle for more points
                map.addLayer({
                    id: 'clusters',
                    type: 'circle',
                    source: 'listings',
                    filter: ['has', 'point_count'],
                    paint: {
                        'circle-color': [
                            'step',
                            ['get', 'point_count'],
                            '#51bbd6',   // < 10 points
                            10, '#f1f075', // 10-30 points
                            30, '#f28cb1'  // 30+ points
                        ],
                        'circle-radius': [
                            'step',
                            ['get', 'point_count'],
                            18,          // < 10
                            10, 25,      // 10-30
                            30, 35       // 30+
                        ],
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#fff'
                    }
                });

                // Step 4: Cluster count label
                map.addLayer({
                    id: 'cluster-count',
                    type: 'symbol',
                    source: 'listings',
                    filter: ['has', 'point_count'],
                    layout: {
                        'text-field': '{point_count_abbreviated}',
                        'text-size': 13
                    },
                    paint: {
                        'text-color': '#333'
                    }
                });

                // Step 5: Individual (unclustered) point markers
                map.addLayer({
                    id: 'unclustered-point',
                    type: 'circle',
                    source: 'listings',
                    filter: ['!', ['has', 'point_count']],
                    paint: {
                        'circle-color': '#fe424d',
                        'circle-radius': 8,
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#fff'
                    }
                });

                // Step 6: Click cluster → zoom in
                map.on('click', 'clusters', async (e) => {
                    const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
                    const clusterId = features[0].properties.cluster_id;
                    const zoom = await map.getSource('listings').getClusterExpansionZoom(clusterId);
                    map.easeTo({ center: features[0].geometry.coordinates, zoom });
                });

                // Step 7: Click individual point → show popup with listing info
                map.on('click', 'unclustered-point', (e) => {
                    const { title, price, location, country, id } = e.features[0].properties;
                    const coords = e.features[0].geometry.coordinates.slice();
                    // Build popup using DOM APIs to prevent XSS from user-controlled data
                    const popupContainer = document.createElement('div');
                    popupContainer.className = 'map-popup';
                    const titleEl = document.createElement('h6');
                    const linkEl = document.createElement('a');
                    linkEl.href = `/listings/${id}`;
                    linkEl.textContent = String(title);
                    titleEl.appendChild(linkEl);
                    popupContainer.appendChild(titleEl);
                    const priceEl = document.createElement('p');
                    priceEl.textContent = `₹ ${Number(price).toLocaleString('en-IN')} / night`;
                    popupContainer.appendChild(priceEl);
                    const locationEl = document.createElement('p');
                    const iconEl = document.createElement('i');
                    iconEl.className = 'fa-solid fa-location-dot';
                    locationEl.appendChild(iconEl);
                    locationEl.appendChild(document.createTextNode(` ${location}, ${country}`));
                    popupContainer.appendChild(locationEl);
                    new maplibregl.Popup({ offset: 15 })
                        .setLngLat(coords)
                        .setDOMContent(popupContainer)
                        .addTo(map);
                });

                // Change cursor on hover
                map.on('mouseenter', 'clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
                map.on('mouseleave', 'clusters', () => { map.getCanvas().style.cursor = ''; });
                map.on('mouseenter', 'unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
                map.on('mouseleave', 'unclustered-point', () => { map.getCanvas().style.cursor = ''; });

                console.log('Cluster map initialized successfully');
            });

            map.on('error', (e) => {
                console.error('Map error:', e);
            });
        } catch (error) {
            console.error('Error initializing cluster map:', error);
            mapEl.innerHTML = '<p style="text-align:center;padding:2rem;color:#888;">Error loading map. Please refresh the page.</p>';
        }
    }
})();
