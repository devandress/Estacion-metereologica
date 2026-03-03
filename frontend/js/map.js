/**
 * Map management module for Weather Station Dashboard
 * Handles interactive map visualization with Leaflet.js and clustering
 */

let map = null;
let markerClusterGroup = null;
let markersByStationId = {};
let heatmapLayers = {};
let currentLayer = "stations"; // "stations" or "heatmap"

export function initMap(containerId = "map-container", stations = []) {
    if (map) return map;
    
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Map container ${containerId} not found`);
        return null;
    }
    
    // Create map with a world view; fitMapBounds() will zoom to actual stations
    map = L.map(containerId).setView([20, -40], 3);
    
    // Add multiple tile layer options
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 2
    });
    
    const sateliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
        minZoom: 2
    });
    
    osmLayer.addTo(map);
    
    // Layer control
    const baseMaps = {
        "Mapa": osmLayer,
        "Satélite": sateliteLayer
    };
    L.control.layers(baseMaps).addTo(map);
    
    // Initialize marker layer — use MarkerCluster if available, fall back to plain FeatureGroup
    try {
        if (typeof L.markerClusterGroup === 'function') {
            markerClusterGroup = L.markerClusterGroup({
                maxClusterRadius: 80,
                disableClusteringAtZoom: 15,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: true
            });
        } else {
            console.warn('MarkerCluster plugin not found, using plain layer group');
            markerClusterGroup = L.featureGroup();
        }
    } catch (e) {
        console.warn('MarkerCluster failed, using plain layer group:', e);
        markerClusterGroup = L.featureGroup();
    }
    map.addLayer(markerClusterGroup);
    
    // Add scale control
    L.control.scale().addTo(map);
    
    // Add stations immediately if provided
    console.log(`[map] initMap called with ${stations.length} station(s)`);
    if (stations && stations.length > 0) {
        stations.forEach(station => {
            try {
                addStationMarker(station);
            } catch (e) {
                console.error(`[map] failed to add marker for ${station.name}:`, e);
            }
        });
        fitMapBounds();
    }
    
    // Add search functionality
    addMapSearch();
    
    return map;
}

function addMapSearch() {
    // Simple search box
    const searchControl = L.Control.extend({
        options: {
            position: 'topright'
        },
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
            container.style.backgroundColor = 'white';
            container.style.padding = '5px';
            container.style.borderRadius = '4px';
            
            const input = L.DomUtil.create('input', 'map-search-input', container);
            input.type = 'text';
            input.placeholder = 'Buscar estación...';
            input.style.padding = '5px';
            input.style.width = '200px';
            input.style.border = '1px solid #ccc';
            input.style.borderRadius = '4px';
            
            input.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                Object.entries(markersByStationId).forEach(([id, marker]) => {
                    // You could add filtering logic here
                });
            });
            
            return container;
        }
    });
    
    new searchControl().addTo(map);
}

export function addStationMarker(station, onClickCallback = null) {
    if (!map || !markerClusterGroup) {
        console.error("Map not initialized");
        return null;
    }
    
    // Create custom icon based on station status — pure inline styles (no Tailwind)
    const bgColor = station.active ? '#10b981' : '#ef4444';
    const icon = L.divIcon({
        html: `<div style="
            width:14px;height:14px;
            background:${bgColor};
            border-radius:50%;
            border:2px solid white;
            box-shadow:0 2px 6px rgba(0,0,0,0.5);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10],
        className: ''
    });
    
    // Create marker
    const marker = L.marker([station.latitude, station.longitude], { icon });
    
    // Create popup content with more details
    const popupContent = `
        <div class="w-56 popup-content" style="font-family: sans-serif;">
            <div style="padding: 12px;">
                <h3 class="font-bold text-lg mb-2" style="color: #1f2937; margin: 0 0 8px 0;">${station.name}</h3>
                <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">
                    <p style="margin: 4px 0;"><i class="fas fa-map-marker-alt"></i> ${station.location}</p>
                    <p style="margin: 4px 0;"><i class="fas fa-chart-line"></i> ${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}</p>
                </div>
                <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-bottom: 8px;">
                    <span style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; color: white; background-color: ${station.active ? '#10b981' : '#ef4444'};">
                        ${station.active ? '✓ Activa' : '✗ Inactiva'}
                    </span>
                </div>
                ${station.last_data_time ? `
                    <p style="font-size: 12px; color: #9ca3af; margin: 4px 0;">
                        Última actualización: ${new Date(station.last_data_time).toLocaleString('es-ES')}
                    </p>
                ` : '<p style="font-size: 12px; color: #ef4444;">Sin datos disponibles</p>'}
                <div style="margin-top: 8px; display: flex; gap: 4px;">
                    <button class="view-station-btn" data-station-id="${station.id}" 
                            style="flex: 1; padding: 6px; font-size: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Detalles
                    </button>
                    <button class="zoom-station-btn" data-station-id="${station.id}"
                            style="flex: 1; padding: 6px; font-size: 12px; background-color: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Zoom
                    </button>
                </div>
            </div>
        </div>
    `;
    
    marker.bindPopup(popupContent, { maxWidth: 250, className: 'station-popup' });
    
    // Add click listener
    marker.on('click', function() {
        if (onClickCallback) {
            onClickCallback(station);
        }
    });
    
    // Popup opens only on click, not hover (hover caused popup to disappear before clicking)
    
    markerClusterGroup.addLayer(marker);
    markersByStationId[station.id] = marker;
    
    return marker;
}

export function updateStationMarker(station) {
    if (markersByStationId[station.id]) {
        const marker = markersByStationId[station.id];
        
        // Update popup with new data
        const popupContent = `
            <div class="w-56 popup-content" style="font-family: sans-serif;">
                <div style="padding: 12px;">
                    <h3 class="font-bold text-lg mb-2" style="color: #1f2937;">${station.name}</h3>
                    <div style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">
                        <p style="margin: 4px 0;"><i class="fas fa-map-marker-alt"></i> ${station.location}</p>
                        <p style="margin: 4px 0;"><i class="fas fa-thermometer"></i> Temp: ${station.temperature || 'N/A'}°C</p>
                    </div>
                    <span style="display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; color: white; background-color: ${station.active ? '#10b981' : '#ef4444'};">
                        ${station.active ? '✓ Activa' : '✗ Inactiva'}
                    </span>
                </div>
            </div>
        `;
        
        marker.setPopupContent(popupContent);
    }
}

export function removeStationMarker(stationId) {
    if (markersByStationId[stationId]) {
        markerClusterGroup.removeLayer(markersByStationId[stationId]);
        delete markersByStationId[stationId];
    }
}

export function fitMapBounds() {
    if (!map) return;
    // Build bounds from actual marker positions (more reliable than markerClusterGroup.getBounds())
    const latlngs = Object.values(markersByStationId).map(m => m.getLatLng());
    if (latlngs.length === 0) {
        map.setView([20, -99], 5);
        return;
    }
    if (latlngs.length === 1) {
        map.setView(latlngs[0], 11);
        return;
    }
    try {
        const bounds = L.latLngBounds(latlngs);
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
        }
    } catch (e) {
        console.warn("Could not fit bounds:", e);
        map.setView(latlngs[0], 8);
    }
}

export function clearAllMarkers() {
    markerClusterGroup.clearLayers();
    markersByStationId = {};
}

export function highlightMarker(stationId) {
    if (markersByStationId[stationId]) {
        const marker = markersByStationId[stationId];
        marker.openPopup();
        map.setView(marker.getLatLng(), 14, { animate: true });
    }
}

export function addWeatherLayer(stationData) {
    /**
     * Add a custom layer showing weather data on the map
     * This could include heat maps, wind vectors, etc.
     */
    if (!map) return [];
    
    // Remove existing weather layer if present
    if (heatmapLayers.weatherLayer) {
        map.removeLayer(heatmapLayers.weatherLayer);
    }
    
    // Create feature group for weather visualization
    const weatherLayerGroup = L.featureGroup();
    
    // Example: Add circle markers sized by temperature
    const circles = stationData
        .filter(station => station.temperature !== null && station.temperature !== undefined)
        .map(station => {
            const radius = Math.max(5, Math.min(20, (station.temperature || 20) / 2));
            const color = getTemperatureColor(station.temperature);
            
            const circle = L.circleMarker([station.latitude, station.longitude], {
                radius: radius,
                fillColor: color,
                color: '#fff',
                weight: 2,
                opacity: 0.8,
                fillOpacity: 0.7
            });
            
            circle.bindPopup(`
                <div style="font-family: sans-serif;">
                    <strong>${station.name}</strong><br>
                    🌡️ Temp: ${station.temperature}°C<br>
                    💧 Humedad: ${station.humidity || 'N/A'}%<br>
                    💨 Viento: ${station.wind_speed || 'N/A'} km/h
                </div>
            `);
            
            weatherLayerGroup.addLayer(circle);
            return circle;
        });
    
    if (circles.length > 0) {
        weatherLayerGroup.addTo(map);
        heatmapLayers.weatherLayer = weatherLayerGroup;
    }
    
    return circles;
}

export function removeWeatherLayer() {
    if (heatmapLayers.weatherLayer) {
        map.removeLayer(heatmapLayers.weatherLayer);
        delete heatmapLayers.weatherLayer;
    }
}

function getTemperatureColor(temp) {
    if (temp < -10) return '#0284c7'; // cold blue
    if (temp < 0) return '#06b6d4';   // cool cyan
    if (temp < 10) return '#10b981';  // cool green
    if (temp < 20) return '#eab308';  // warm yellow
    if (temp < 30) return '#f97316';  // warm orange
    if (temp < 40) return '#dc2626';  // hot red
    return '#7c2d12';                 // extreme red
}

export function getMap() {
    return map;
}

export function toggleWeatherVisualization(enable = true) {
    if (enable && currentLayer !== "heatmap") {
        currentLayer = "heatmap";
        // Will be implemented with actual weather data
    } else if (!enable && currentLayer !== "stations") {
        currentLayer = "stations";
        removeWeatherLayer();
    }
}

export function getStationMarker(stationId) {
    return markersByStationId[stationId];
}

export function getAllMarkers() {
    return Object.values(markersByStationId);
}

export function destroyMap() {
    if (map) {
        map.remove();
        map = null;
        markerClusterGroup = null;
        markersByStationId = {};
    }
}

