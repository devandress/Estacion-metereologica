const API_BASE_URL = "http://localhost:8000/api";

import * as MapModule from './map.js';

// ===== STATE MANAGEMENT =====
let app = document.getElementById("app");
let currentPage = "dashboard";
let selectedStations = new Set();
let chartsCache = {};
let stations = [];
let systemStats = null;
let autoRefreshInterval = null;

// ===== UTILITY FUNCTIONS =====
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `fixed top-20 right-4 px-6 py-4 rounded-lg text-white shadow-2xl z-50 transition-smooth
    ${type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : type === "warning" ? "bg-yellow-500" : "bg-blue-500"}`;
  notification.innerHTML = `
    <div class="flex items-center gap-3">
      <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : type === "warning" ? "exclamation-triangle" : "info-circle"}"></i>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function showModal(title, content, onConfirm, onCancel = null) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="border-b border-gray-200 p-6">
        <h3 class="text-2xl font-bold text-gray-800">${title}</h3>
      </div>
      <div class="p-8">${content}</div>
      <div class="border-t border-gray-200 p-6 flex gap-3 justify-end">
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()${onCancel ? '; ' + onCancel + '()' : ''}">Cancelar</button>
        <button class="btn-primary" onclick="this.closest('.modal-overlay').remove(); (${onConfirm})()">Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

// ===== API CALLS =====
async function fetchStations() {
  try {
    const response = await fetch(`${API_BASE_URL}/stations`);
    stations = await response.json();
    return stations;
  } catch (error) {
    console.error("Error fetching stations:", error);
    showNotification("Error cargando estaciones", "error");
    return [];
  }
}

async function fetchSystemStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/stations/stats/overview`);
    systemStats = await response.json();
    return systemStats;
  } catch (error) {
    console.error("Error fetching stats:", error);
    return null;
  }
}

async function fetchStationData(stationId, hours = 24) {
  try {
    const response = await fetch(`${API_BASE_URL}/stations/${stationId}/data?hours=${hours}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching station data:", error);
    return [];
  }
}

async function fetchStationStats(stationId, hours = 24) {
  try {
    const response = await fetch(`${API_BASE_URL}/stations/${stationId}/stats?hours=${hours}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching stats:", error);
    return null;
  }
}

async function createStation(stationData) {
  try {
    const response = await fetch(`${API_BASE_URL}/stations/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stationData),
    });
    if (response.ok) {
      await fetchStations();
      showNotification("✓ Estación creada exitosamente", "success");
      await switchPage("stations");
    } else {
      showNotification("✗ Error creando estación", "error");
    }
  } catch (error) {
    console.error("Error:", error);
    showNotification("✗ Error en la solicitud", "error");
  }
}

async function updateStation(stationId, updates) {
  try {
    const response = await fetch(`${API_BASE_URL}/stations/${stationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (response.ok) {
      await fetchStations();
      showNotification("✓ Estación actualizada", "success");
      await renderPage();
    }
  } catch (error) {
    console.error("Error:", error);
    showNotification("✗ Error actualizando estación", "error");
  }
}

async function deleteStation(stationId) {
  const station = stations.find(s => s.id === stationId);
  const content = `
    <div class="space-y-4">
      <p class="text-gray-700">¿Estás seguro de que quieres eliminar <strong class="text-red-600">${station?.name}</strong>?</p>
      <p class="text-sm text-red-600"><i class="fas fa-exclamation-triangle"></i> Esta acción no se puede deshacer.</p>
    </div>
  `;
  
  showModal(
    "Confirmar eliminación",
    content,
    `async function() {
      try {
        await fetch(\`${API_BASE_URL}/stations/${stationId}\`, { method: "DELETE" });
        await fetchStations();
        showNotification("✓ Estación eliminada", "success");
        await renderPage();
      } catch (error) {
        console.error("Error:", error);
        showNotification("✗ Error eliminando estación", "error");
      }
    }`
  );
}

// ===== UI COMPONENTS =====
function renderNavbar() {
  const activeCount = stations.filter(s => s.active).length;
  const inactiveCount = stations.filter(s => !s.active).length;
  
  return `
    <nav class="sticky top-0 z-40 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white shadow-2xl">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-4">
            <div class="text-3xl">🌤️</div>
            <div>
              <h1 class="text-3xl font-bold">Weather Stations</h1>
              <p class="text-xs text-blue-100">Dashboard Meteorológico Avanzado</p>
            </div>
          </div>
          <div class="flex gap-6 text-sm">
            <div class="flex items-center gap-2">
              <i class="fas fa-check-circle text-green-300"></i>
              <div>
                <p class="text-blue-100">Activas</p>
                <p class="text-2xl font-bold">${activeCount}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <i class="fas fa-times-circle text-red-300"></i>
              <div>
                <p class="text-blue-100">Inactivas</p>
                <p class="text-2xl font-bold">${inactiveCount}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <i class="fas fa-database text-yellow-300"></i>
              <div>
                <p class="text-blue-100">Total</p>
                <p class="text-2xl font-bold">${stations.length}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex gap-2 flex-wrap">
          ${["dashboard", "map", "stations", "analytics", "add", "export", "settings"].map(page => {
            const icons = {
              dashboard: "📊",
              map: "🗺️",
              stations: "🏢",
              analytics: "📈",
              add: "➕",
              export: "📥",
              settings: "⚙️"
            };
            const labels = {
              dashboard: "Dashboard",
              map: "Mapa",
              stations: "Estaciones",
              analytics: "Análisis",
              add: "Nueva",
              export: "Exportar",
              settings: "Ajustes"
            };
            return `
              <button onclick="switchPage('${page}')" 
                class="px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${
                  currentPage === page 
                    ? "bg-white text-blue-600 shadow-lg" 
                    : "text-blue-100 hover:bg-blue-700"
                }">
                ${icons[page]} ${labels[page]}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    </nav>
  `;
}

function renderDashboard() {
  if (!systemStats) {
    return `
      <div class="flex items-center justify-center h-96">
        <div class="text-center">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
          <p class="text-gray-600">Cargando datos del sistema...</p>
        </div>
      </div>
    `;
  }

  const statCards = `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stats-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 font-medium">Total Estaciones</p>
            <p class="text-4xl font-bold text-blue-600 mt-2">${systemStats.total_stations || 0}</p>
          </div>
          <i class="fas fa-building text-5xl text-blue-100"></i>
        </div>
      </div>
      <div class="stats-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 font-medium">Estaciones Activas</p>
            <p class="text-4xl font-bold text-green-600 mt-2">${systemStats.active_stations || 0}</p>
          </div>
          <i class="fas fa-check-circle text-5xl text-green-100"></i>
        </div>
      </div>
      <div class="stats-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 font-medium">Estaciones Inactivas</p>
            <p class="text-4xl font-bold text-red-600 mt-2">${systemStats.inactive_stations || 0}</p>
          </div>
          <i class="fas fa-times-circle text-5xl text-red-100"></i>
        </div>
      </div>
      <div class="stats-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 font-medium">Total Registros</p>
            <p class="text-4xl font-bold text-purple-600 mt-2">${systemStats.total_records || 0}</p>
          </div>
          <i class="fas fa-database text-5xl text-purple-100"></i>
        </div>
      </div>
    </div>
  `;

  const recentStations = stations.slice(0, 6).map(s => {
    const tempColor = s.latest_data?.temperature > 25 ? "temperature-hot" : 
                      s.latest_data?.temperature > 15 ? "temperature-warm" :
                      s.latest_data?.temperature > 5 ? "temperature-cool" : "temperature-cold";
    
    return `
      <div class="weather-card ${s.active ? 'active' : 'inactive'}">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="font-bold text-lg text-gray-800">${s.name}</h3>
            <p class="text-xs text-gray-500 flex items-center gap-1">
              <i class="fas fa-map-marker-alt"></i> ${s.location}
            </p>
          </div>
          <span class="px-3 py-1 text-xs rounded-full font-medium badge ${s.active ? 'badge-success' : 'badge-error'}">
            <i class="fas ${s.active ? 'fa-check-circle' : 'fa-times-circle'} mr-1"></i>${s.active ? "Activa" : "Inactiva"}
          </span>
        </div>
        
        <div class="grid grid-cols-2 gap-3 mb-4">
          ${s.latest_data ? `
            <div class="weather-metric">
              <i class="fas fa-thermometer-half ${tempColor}"></i>
              <div class="text-sm">
                <p class="text-gray-600">Temperatura</p>
                <p class="font-bold text-lg">${s.latest_data.temperature?.toFixed(1) || "--"}°C</p>
              </div>
            </div>
            <div class="weather-metric">
              <i class="fas fa-droplet text-blue-500"></i>
              <div class="text-sm">
                <p class="text-gray-600">Humedad</p>
                <p class="font-bold text-lg">${s.latest_data.humidity?.toFixed(1) || "--"}%</p>
              </div>
            </div>
            <div class="weather-metric">
              <i class="fas fa-wind text-cyan-500"></i>
              <div class="text-sm">
                <p class="text-gray-600">Viento</p>
                <p class="font-bold text-lg">${s.latest_data.wind_speed?.toFixed(1) || "--"} m/s</p>
              </div>
            </div>
            <div class="weather-metric">
              <i class="fas fa-cloud-rain text-slate-500"></i>
              <div class="text-sm">
                <p class="text-gray-600">Lluvia</p>
                <p class="font-bold text-lg">${s.latest_data.rain?.toFixed(1) || "--"} mm</p>
              </div>
            </div>
          ` : `
            <div class="col-span-2 text-center py-4 text-gray-500">
              <i class="fas fa-inbox text-2xl mb-2"></i>
              <p class="text-sm">Sin datos disponibles</p>
            </div>
          `}
        </div>
        
        <div class="flex gap-2">
          <button onclick="viewStationDetails('${s.id}')" class="flex-1 text-xs bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-smooth font-medium">
            <i class="fas fa-eye"></i> Ver Detalles
          </button>
          <button onclick="switchToEditStation('${s.id}')" class="flex-1 text-xs bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 transition-smooth font-medium">
            <i class="fas fa-edit"></i> Editar
          </button>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="space-y-8">
      ${statCards}
      
      <div class="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-500">
        <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          <i class="fas fa-star text-yellow-500 text-xl"></i> Estaciones Recientes
        </h2>
        <div class="station-grid">
          ${recentStations}
        </div>
      </div>
    </div>
  `;
}

function renderMap() {
  const activeCount = stations.filter(s => s.active).length;
  const inactiveCount = stations.filter(s => !s.active).length;
  
  return `
    <div class="space-y-6">
      <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        <div id="map-container" class="map-container"></div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-300 p-6">
          <h3 class="font-bold text-blue-900 text-lg flex items-center gap-2 mb-3">
            <i class="fas fa-info-circle text-blue-600"></i> Información del Mapa
          </h3>
          <ul class="text-sm text-blue-800 space-y-2">
            <li><i class="fas fa-mouse"></i> Usa el ratón para desplazarte</li>
            <li><i class="fas fa-search"></i> Zoom con la rueda del ratón</li>
            <li><i class="fas fa-click"></i> Haz clic en marcadores para ver detalles</li>
            <li><i class="fas fa-layer-group"></i> Cambia capas en la esquina superior derecha</li>
          </ul>
        </div>
        
        <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-300 p-6">
          <h3 class="font-bold text-green-900 text-lg flex items-center gap-2 mb-3">
            <i class="fas fa-check-circle text-green-600"></i> Estaciones Activas
          </h3>
          <p class="text-4xl font-bold text-green-600 mb-2">${activeCount}</p>
          <p class="text-sm text-green-700">Enviando datos en tiempo real</p>
        </div>
        
        <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-2 border-red-300 p-6">
          <h3 class="font-bold text-red-900 text-lg flex items-center gap-2 mb-3">
            <i class="fas fa-times-circle text-red-600"></i> Estaciones Inactivas
          </h3>
          <p class="text-4xl font-bold text-red-600 mb-2">${inactiveCount}</p>
          <p class="text-sm text-red-700">Requieren revisión</p>
        </div>
      </div>
    </div>
  `;
}

function renderStationsManagement() {
  if (stations.length === 0) {
    return `
      <div class="bg-white rounded-xl shadow-lg p-16 text-center border-t-4 border-blue-500">
        <i class="fas fa-inbox text-6xl text-gray-300 mb-6"></i>
        <p class="text-gray-500 text-xl font-medium mb-2">No hay estaciones disponibles</p>
        <p class="text-gray-400 mb-6">Crea la primera estación meteorológica</p>
        <button onclick="switchPage('add')" class="btn-primary text-lg py-3 px-6">
          <i class="fas fa-plus"></i> Crear Primera Estación
        </button>
      </div>
    `;
  }

  const rows = stations.map(s => {
    const tempColor = s.latest_data?.temperature > 25 ? "temperature-hot" : 
                      s.latest_data?.temperature > 15 ? "temperature-warm" :
                      s.latest_data?.temperature > 5 ? "temperature-cool" : "temperature-cold";
    
    return `
      <tr class="table-row-hover border-b hover:bg-blue-50">
        <td class="px-6 py-4">
          <input type="checkbox" onchange="toggleStation('${s.id}', this.checked)" class="w-5 h-5 cursor-pointer text-blue-600">
        </td>
        <td class="px-6 py-4">
          <div>
            <p class="font-semibold text-gray-900">${s.name}</p>
            <p class="text-xs text-gray-500">${s.id}</p>
          </div>
        </td>
        <td class="px-6 py-4 text-gray-700 flex items-center gap-2">
          <i class="fas fa-map-pin text-blue-500"></i> ${s.location}
        </td>
        <td class="px-6 py-4 text-gray-600 font-mono text-sm">
          ${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}
        </td>
        <td class="px-6 py-4">
          <span class="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium gap-2 ${s.active ? 'badge-success' : 'badge-error'}">
            <i class="fas ${s.active ? 'fa-check-circle' : 'fa-times-circle'}"></i>
            ${s.active ? "Activa" : "Inactiva"}
          </span>
        </td>
        <td class="px-6 py-4">
          ${s.latest_data ? `
            <div class="flex items-center gap-2">
              <i class="fas fa-thermometer-half ${tempColor}"></i>
              <span class="font-semibold">${s.latest_data.temperature?.toFixed(1) || "--"}°C</span>
              <span class="text-gray-500">${s.latest_data.humidity?.toFixed(0) || "--"}%</span>
            </div>
          ` : `<span class="text-gray-400">Sin datos</span>`}
        </td>
        <td class="px-6 py-4 text-xs text-gray-500">
          ${s.last_data_time ? new Date(s.last_data_time).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : "Nunca"}
        </td>
        <td class="px-6 py-4">
          <div class="flex gap-2">
            <button onclick="viewStationDetails('${s.id}')" class="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium transition-smooth" title="Ver detalles">
              <i class="fas fa-eye"></i> Ver
            </button>
            <button onclick="switchToEditStation('${s.id}')" class="text-orange-600 hover:text-orange-800 hover:underline text-sm font-medium transition-smooth" title="Editar">
              <i class="fas fa-edit"></i> Editar
            </button>
            <button onclick="window.deleteStationHandler('${s.id}')" class="text-red-600 hover:text-red-800 hover:underline text-sm font-medium transition-smooth" title="Eliminar">
              <i class="fas fa-trash"></i> Eliminar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  return `
    <div class="bg-white rounded-xl shadow-lg overflow-hidden border-t-4 border-blue-500">
      <div class="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-gray-50">
        <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <i class="fas fa-list text-blue-600"></i> Gestión de Estaciones (${stations.length})
        </h2>
        <button onclick="switchPage('add')" class="btn-primary">
          <i class="fas fa-plus"></i> Nueva Estación
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">
                <input type="checkbox" onchange="toggleAllStations(this.checked)" class="w-5 h-5 cursor-pointer text-blue-600">
              </th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Nombre</th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Ubicación</th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Coordenadas</th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Estado</th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Últimos Datos</th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Última Actualización</th>
              <th class="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAddStation() {
  return `
    <div class="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8 border-t-4 border-blue-500">
      <h2 class="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
        <i class="fas fa-plus-circle text-blue-600 text-4xl"></i> Nueva Estación
      </h2>
      <form onsubmit="handleAddStation(event)" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <i class="fas fa-id-card text-blue-500"></i> ID Estación *
            </label>
            <input type="text" id="stationId" required class="input-field" placeholder="ej: STATION_001" pattern="^[A-Za-z0-9_-]+$">
            <p class="text-xs text-gray-500 mt-1">Solo letras, números, guiones y guiones bajos</p>
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <i class="fas fa-tag text-blue-500"></i> Nombre *
            </label>
            <input type="text" id="stationName" required class="input-field" placeholder="ej: Estación Central">
          </div>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <i class="fas fa-map-pin text-blue-500"></i> Ubicación *
          </label>
          <input type="text" id="stationLocation" required class="input-field" placeholder="ej: Madrid, España">
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <i class="fas fa-latitude text-blue-500"></i> Latitud *
            </label>
            <input type="number" id="stationLatitude" required step="0.000001" class="input-field" placeholder="40.416755" min="-90" max="90">
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <i class="fas fa-longitude text-blue-500"></i> Longitud *
            </label>
            <input type="number" id="stationLongitude" required step="0.000001" class="input-field" placeholder="-3.703790" min="-180" max="180">
          </div>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <i class="fas fa-pen text-blue-500"></i> Descripción
          </label>
          <textarea id="stationDescription" class="input-field" rows="4" placeholder="Descripción detallada de la estación (opcional)..."></textarea>
        </div>

        <div class="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 p-6 rounded-lg">
          <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fas fa-lightbulb text-yellow-500"></i> Consejos para Crear Estaciones
          </h4>
          <ul class="text-sm text-gray-700 space-y-2">
            <li>✓ Usa ID únicos y descriptivos (ej: STATION_MADRID_001)</li>
            <li>✓ Verifica las coordenadas en Google Maps</li>
            <li>✓ La descripción ayuda a identificar la estación</li>
            <li>✓ Las estaciones se mostrarán en el mapa automáticamente</li>
          </ul>
        </div>

        <div class="flex gap-4 pt-6">
          <button type="submit" class="flex-1 btn-primary text-lg py-3 font-bold rounded-lg">
            <i class="fas fa-save"></i> Crear Estación
          </button>
          <button type="button" onclick="switchPage('stations')" class="flex-1 btn-secondary text-lg py-3 font-bold rounded-lg">
            <i class="fas fa-times"></i> Cancelar
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderExport() {
  const stationsList = Array.from(selectedStations).map(id => {
    const s = stations.find(st => st.id === id);
    return s ? `
      <div class="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <i class="fas fa-check-circle text-green-600"></i>
        <span class="font-medium text-gray-800">${s.name}</span>
        <span class="text-xs text-gray-500 ml-auto">${s.location}</span>
      </div>
    ` : "";
  }).join("");

  return `
    <div class="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8 border-t-4 border-blue-500">
      <h2 class="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
        <i class="fas fa-download text-blue-600 text-4xl"></i> Exportar Datos
      </h2>
      
      <div class="space-y-8">
        <div class="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-300 p-6">
          <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i class="fas fa-building text-blue-600"></i> Estaciones Seleccionadas
          </h3>
          <div class="bg-white p-4 rounded-lg border border-gray-200 max-h-56 overflow-y-auto space-y-2">
            ${stationsList ? stationsList : '<p class="text-center text-gray-500 py-8"><i class="fas fa-inbox text-2xl mb-2"></i><br>Selecciona estaciones en la pestaña "Estaciones"</p>'}
          </div>
          <p class="text-sm text-blue-700 mt-3 font-medium">
            <i class="fas fa-info-circle"></i> ${selectedStations.size} estación${selectedStations.size !== 1 ? 's' : ''} seleccionada${selectedStations.size !== 1 ? 's' : ''}
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <i class="fas fa-clock text-blue-500"></i> Período de Datos
            </label>
            <select id="exportHours" class="input-field text-lg">
              <option value="1">📌 Última 1 hora</option>
              <option value="6">📌 Últimas 6 horas</option>
              <option value="24" selected>📌 Últimas 24 horas</option>
              <option value="72">📌 Últimos 3 días</option>
              <option value="168">📌 Última semana</option>
              <option value="720">📌 Último mes</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <i class="fas fa-file text-blue-500"></i> Formato de Exportación
            </label>
            <select id="exportFormat" class="input-field text-lg">
              <option value="json">📄 JSON (Datos Estructurados)</option>
              <option value="csv">📊 CSV (Hoja de Cálculo)</option>
            </select>
          </div>
        </div>

        <div class="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 p-6 rounded-lg">
          <h4 class="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fas fa-info-circle text-yellow-600"></i> Información de Exportación
          </h4>
          <ul class="text-sm text-gray-700 space-y-2">
            <li><i class="fas fa-check text-green-600"></i> Se descargarán datos de las estaciones seleccionadas</li>
            <li><i class="fas fa-check text-green-600"></i> Filtrados por el período especificado</li>
            <li><i class="fas fa-check text-green-600"></i> Incluye: Temperatura, Humedad, Viento, Lluvia</li>
            <li><i class="fas fa-check text-green-600"></i> Timestamps con zona horaria</li>
            <li><i class="fas fa-check text-green-600"></i> Nombre del archivo incluye fecha</li>
          </ul>
        </div>

        <button onclick="exportData()" class="w-full btn-primary text-lg py-4 font-bold rounded-lg">
          <i class="fas fa-download"></i> Descargar Datos
        </button>
      </div>
    </div>
  `;
}

function renderAnalytics() {
  return `
    <div class="space-y-6">
      <div class="bg-white rounded-xl shadow-lg p-8 border-t-4 border-blue-500">
        <h2 class="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3">
          <i class="fas fa-chart-line text-blue-600 text-4xl"></i> Análisis Detallado
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <i class="fas fa-building text-blue-500"></i> Seleccionar Estación
            </label>
            <select id="analyticsStation" onchange="loadStationAnalytics(this.value)" class="input-field text-lg">
              <option value="">-- Selecciona una estación --</option>
              ${stations.map(s => `<option value="${s.id}">${s.name} (${s.location})</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <i class="fas fa-calendar text-blue-500"></i> Período
            </label>
            <select id="analyticsPeriod" onchange="loadStationAnalytics(document.getElementById('analyticsStation').value)" class="input-field text-lg">
              <option value="24">📅 Últimas 24 horas</option>
              <option value="168">📅 Última semana</option>
              <option value="720">📅 Último mes</option>
            </select>
          </div>
        </div>
        <div id="analyticsChart" class="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <canvas id="tempChart" style="max-height: 500px;"></canvas>
        </div>
      </div>
    </div>
  `;
}

function renderSettings() {
  return `
    <div class="max-w-2xl mx-auto space-y-6">
      <div class="bg-white rounded-xl shadow-lg p-8 border-t-4 border-blue-500">
        <h2 class="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-3">
          <i class="fas fa-cog text-blue-600 text-4xl"></i> Ajustes del Sistema
        </h2>
        
        <div class="space-y-6">
          <div class="border-2 border-gray-300 rounded-lg p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-server text-blue-600"></i> Información del Sistema
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-600 font-semibold uppercase">API URL</p>
                <p class="font-mono text-sm text-gray-800 mt-2 break-all">${API_BASE_URL}</p>
              </div>
              <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-600 font-semibold uppercase">Versión</p>
                <p class="font-mono text-2xl text-gray-800 mt-2 font-bold">1.0.0</p>
              </div>
              <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-600 font-semibold uppercase">Estaciones</p>
                <p class="font-mono text-2xl text-gray-800 mt-2 font-bold">${stations.length}</p>
              </div>
              <div class="bg-gray-50 p-4 rounded-lg">
                <p class="text-xs text-gray-600 font-semibold uppercase">Registros Total</p>
                <p class="font-mono text-2xl text-gray-800 mt-2 font-bold">${systemStats?.total_records || 0}</p>
              </div>
            </div>
          </div>

          <div class="border-2 border-green-300 rounded-lg p-6 bg-gradient-to-r from-green-50 to-emerald-50">
            <h3 class="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
              <i class="fas fa-sync-alt text-green-600"></i> Actualizar Datos
            </h3>
            <p class="text-sm text-green-800 mb-4">Recarga la información de todas las estaciones desde el servidor.</p>
            <button onclick="refreshAllData()" class="btn-primary bg-green-600 hover:bg-green-700">
              <i class="fas fa-refresh"></i> Actualizar Ahora
            </button>
          </div>

          <div class="border-2 border-orange-300 rounded-lg p-6 bg-gradient-to-r from-orange-50 to-amber-50">
            <h3 class="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
              <i class="fas fa-trash text-orange-600"></i> Limpiar Caché Local
            </h3>
            <p class="text-sm text-orange-800 mb-4">Elimina datos almacenados localmente. No afecta los datos del servidor.</p>
            <button onclick="clearCache()" class="btn-secondary">
              <i class="fas fa-broom"></i> Limpiar Caché
            </button>
          </div>

          <div class="border-2 border-blue-300 rounded-lg p-6 bg-gradient-to-r from-blue-50 to-cyan-50">
            <h3 class="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
              <i class="fas fa-info-circle text-blue-600"></i> Ayuda y Documentación
            </h3>
            <p class="text-sm text-blue-800">Para más información sobre cómo usar el sistema, consulta la documentación o contacta al administrador.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ===== EVENT HANDLERS =====
async function loadStationAnalytics(stationId) {
  if (!stationId) return;
  
  const period = document.getElementById("analyticsPeriod").value;
  const stats = await fetchStationStats(stationId, parseInt(period));
  
  if (!stats) {
    showNotification("No se pudieron cargar los datos de análisis", "error");
    return;
  }

  const ctx = document.getElementById("tempChart");
  if (!ctx) return;
  
  if (chartsCache[stationId]) {
    chartsCache[stationId].destroy();
  }
  
  chartsCache[stationId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Temperatura (°C)", "Humedad (%)", "Velocidad Viento (m/s)"],
      datasets: [{
        label: "Promedio",
        data: [
          stats.temperature?.avg || 0,
          stats.humidity?.avg || 0,
          stats.wind_speed?.avg || 0
        ],
        backgroundColor: "rgba(59, 130, 246, 0.6)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        borderRadius: 8
      }, {
        label: "Mínimo",
        data: [
          stats.temperature?.min || 0,
          stats.humidity?.min || 0,
          stats.wind_speed?.min || 0
        ],
        backgroundColor: "rgba(34, 197, 94, 0.6)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 2,
        borderRadius: 8
      }, {
        label: "Máximo",
        data: [
          stats.temperature?.max || 0,
          stats.humidity?.max || 0,
          stats.wind_speed?.max || 0
        ],
        backgroundColor: "rgba(239, 68, 68, 0.6)",
        borderColor: "rgba(239, 68, 68, 1)",
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: { font: { size: 12, weight: 'bold' }, padding: 15 }
        },
        title: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: { font: { size: 11 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

function handleAddStation(event) {
  event.preventDefault();
  
  const stationData = {
    id: document.getElementById("stationId").value.trim(),
    name: document.getElementById("stationName").value.trim(),
    location: document.getElementById("stationLocation").value.trim(),
    latitude: parseFloat(document.getElementById("stationLatitude").value),
    longitude: parseFloat(document.getElementById("stationLongitude").value),
    description: document.getElementById("stationDescription").value.trim(),
  };

  if (isNaN(stationData.latitude) || isNaN(stationData.longitude)) {
    showNotification("Coordenadas inválidas", "error");
    return;
  }

  createStation(stationData);
}

function toggleStation(stationId, checked) {
  if (checked) {
    selectedStations.add(stationId);
  } else {
    selectedStations.delete(stationId);
  }
}

function toggleAllStations(checked) {
  if (checked) {
    stations.forEach(s => selectedStations.add(s.id));
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
  } else {
    selectedStations.clear();
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  }
}

function switchToEditStation(stationId) {
  const station = stations.find(s => s.id === stationId);
  if (!station) return;

  const content = `
    <div class="space-y-5">
      <div>
        <label class="block text-sm font-bold text-gray-700 mb-2">Nombre</label>
        <input type="text" id="editName" value="${station.name}" class="input-field">
      </div>
      <div>
        <label class="block text-sm font-bold text-gray-700 mb-2">Ubicación</label>
        <input type="text" id="editLocation" value="${station.location}" class="input-field">
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">Latitud</label>
          <input type="number" id="editLat" value="${station.latitude}" step="0.000001" class="input-field">
        </div>
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">Longitud</label>
          <input type="number" id="editLng" value="${station.longitude}" step="0.000001" class="input-field">
        </div>
      </div>
      <label class="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-smooth">
        <input type="checkbox" id="editActive" ${station.active ? "checked" : ""} class="w-5 h-5 text-blue-600 rounded">
        <span class="font-medium text-gray-800">Estación Activa</span>
      </label>
    </div>
  `;

  showModal(
    `✏️ Editar: ${station.name}`,
    content,
    `async function() {
      const updates = {
        name: document.getElementById("editName").value.trim(),
        location: document.getElementById("editLocation").value.trim(),
        latitude: parseFloat(document.getElementById("editLat").value),
        longitude: parseFloat(document.getElementById("editLng").value),
        active: document.getElementById("editActive").checked
      };
      if (isNaN(updates.latitude) || isNaN(updates.longitude)) {
        showNotification("Coordenadas inválidas", "error");
        return;
      }
      await updateStation("${stationId}", updates);
    }`
  );
}

function viewStationDetails(stationId) {
  const station = stations.find(s => s.id === stationId);
  if (!station) return;

  const tempColor = station.latest_data?.temperature > 25 ? "temperature-hot" : 
                    station.latest_data?.temperature > 15 ? "temperature-warm" :
                    station.latest_data?.temperature > 5 ? "temperature-cool" : "temperature-cold";

  app.innerHTML = renderNavbar() + `
    <div class="max-w-5xl mx-auto p-8">
      <button onclick="switchPage('stations')" class="mb-6 text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2 text-lg font-medium transition-smooth">
        <i class="fas fa-arrow-left"></i> Volver a Estaciones
      </button>
      
      <div class="bg-white rounded-xl shadow-2xl overflow-hidden border-t-4 border-blue-500">
        <div class="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-8">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-4xl font-bold mb-2">${station.name}</h1>
              <p class="text-blue-100 flex items-center gap-2">
                <i class="fas fa-map-marker-alt"></i> ${station.location}
              </p>
            </div>
            <span class="px-6 py-3 rounded-full text-lg font-bold bg-white ${station.active ? 'text-green-600' : 'text-red-600'}">
              ${station.active ? '✓ Activa' : '✗ Inactiva'}
            </span>
          </div>
        </div>

        <div class="p-8 space-y-8">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="stats-card">
              <p class="text-sm text-gray-600 font-medium flex items-center gap-2">
                <i class="fas fa-latitude text-blue-500"></i> Latitud
              </p>
              <p class="text-3xl font-bold text-blue-600 mt-2">${station.latitude.toFixed(6)}</p>
            </div>
            <div class="stats-card">
              <p class="text-sm text-gray-600 font-medium flex items-center gap-2">
                <i class="fas fa-longitude text-blue-500"></i> Longitud
              </p>
              <p class="text-3xl font-bold text-blue-600 mt-2">${station.longitude.toFixed(6)}</p>
            </div>
            <div class="stats-card">
              <p class="text-sm text-gray-600 font-medium flex items-center gap-2">
                <i class="fas fa-clock text-blue-500"></i> Última Actualización
              </p>
              <p class="text-lg font-bold text-blue-600 mt-2">${station.last_data_time ? new Date(station.last_data_time).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : "Sin datos"}</p>
            </div>
          </div>

          ${station.latest_data ? `
            <div class="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-8">
              <h3 class="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <i class="fas fa-cloud text-blue-500"></i> Últimos Datos Meteorológicos
              </h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white rounded-lg p-6 border-2 border-blue-200 text-center">
                  <i class="fas fa-thermometer-half ${tempColor} text-4xl mb-3"></i>
                  <p class="text-gray-600 text-sm font-medium">Temperatura</p>
                  <p class="text-3xl font-bold text-gray-800 mt-2">${station.latest_data.temperature?.toFixed(1) || "--"}°C</p>
                </div>
                <div class="bg-white rounded-lg p-6 border-2 border-blue-200 text-center">
                  <i class="fas fa-droplet text-blue-500 text-4xl mb-3"></i>
                  <p class="text-gray-600 text-sm font-medium">Humedad</p>
                  <p class="text-3xl font-bold text-gray-800 mt-2">${station.latest_data.humidity?.toFixed(1) || "--"}%</p>
                </div>
                <div class="bg-white rounded-lg p-6 border-2 border-blue-200 text-center">
                  <i class="fas fa-wind text-cyan-500 text-4xl mb-3"></i>
                  <p class="text-gray-600 text-sm font-medium">Viento</p>
                  <p class="text-3xl font-bold text-gray-800 mt-2">${station.latest_data.wind_speed?.toFixed(1) || "--"} m/s</p>
                </div>
                <div class="bg-white rounded-lg p-6 border-2 border-blue-200 text-center">
                  <i class="fas fa-cloud-rain text-slate-500 text-4xl mb-3"></i>
                  <p class="text-gray-600 text-sm font-medium">Lluvia</p>
                  <p class="text-3xl font-bold text-gray-800 mt-2">${station.latest_data.rain?.toFixed(1) || "--"} mm</p>
                </div>
              </div>
            </div>
          ` : `
            <div class="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 text-center">
              <i class="fas fa-inbox text-4xl text-yellow-500 mb-3"></i>
              <p class="text-yellow-800 font-medium">Sin datos disponibles para esta estación</p>
            </div>
          `}

          <div class="bg-gray-50 rounded-lg border-2 border-gray-300 p-6">
            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <i class="fas fa-info-circle text-blue-600"></i> Información Adicional
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p class="text-sm text-gray-600 font-medium mb-2">ID de la Estación</p>
                <p class="font-mono text-gray-800 bg-white p-3 rounded-lg border border-gray-300">${station.id}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 font-medium mb-2">Descripción</p>
                <p class="text-gray-800 bg-white p-3 rounded-lg border border-gray-300">${station.description || "Sin descripción"}</p>
              </div>
            </div>
          </div>

          <div class="flex gap-4">
            <button onclick="switchToEditStation('${station.id}')" class="flex-1 btn-primary text-lg py-3 font-bold rounded-lg">
              <i class="fas fa-edit"></i> Editar Estación
            </button>
            <button onclick="window.deleteStationHandler('${station.id}'); switchPage('stations')" class="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-bold text-lg transition-smooth">
              <i class="fas fa-trash"></i> Eliminar
            </button>
            <button onclick="switchPage('map')" class="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-bold text-lg transition-smooth">
              <i class="fas fa-map"></i> Ver en Mapa
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function refreshAllData() {
  showNotification("⏳ Actualizando datos del sistema...", "info");
  await Promise.all([fetchStations(), fetchSystemStats()]);
  await renderPage();
  showNotification("✓ Datos actualizados correctamente", "success");
}

function clearCache() {
  chartsCache = {};
  selectedStations.clear();
  localStorage.clear();
  showNotification("✓ Caché limpiado", "success");
}

async function switchPage(page) {
  currentPage = page;
  await renderPage();
}

async function renderPage() {
  app.innerHTML = renderNavbar();

  switch (currentPage) {
    case "dashboard":
      if (!systemStats) await fetchSystemStats();
      app.innerHTML += `<div class="max-w-7xl mx-auto p-8">${renderDashboard()}</div>`;
      break;
    case "map":
      app.innerHTML += `<div class="max-w-7xl mx-auto p-8">${renderMap()}</div>`;
      setTimeout(() => {
        MapModule.initMap("map-container");
        stations.forEach(station => {
          MapModule.addStationMarker(station, (s) => viewStationDetails(s.id));
        });
        MapModule.fitMapBounds();
      }, 100);
      break;
    case "stations":
      app.innerHTML += `<div class="max-w-7xl mx-auto p-8">${renderStationsManagement()}</div>`;
      break;
    case "add":
      app.innerHTML += `<div class="max-w-7xl mx-auto p-8">${renderAddStation()}</div>`;
      break;
    case "export":
      app.innerHTML += `<div class="max-w-7xl mx-auto p-8">${renderExport()}</div>`;
      break;
    case "analytics":
      app.innerHTML += `<div class="max-w-7xl mx-auto p-8">${renderAnalytics()}</div>`;
      break;
    case "settings":
      app.innerHTML += `<div class="max-w-7xl mx-auto p-8">${renderSettings()}</div>`;
      break;
  }
}

async function init() {
  try {
    showNotification("🚀 Cargando Weather Stations...", "info");
    await fetchStations();
    await fetchSystemStats();
    await renderPage();
    showNotification("✓ Sistema listo", "success");
  } catch (error) {
    console.error("Initialization error:", error);
    app.innerHTML = `
      <div class="flex items-center justify-center h-screen bg-gradient-to-br from-red-50 to-red-100">
        <div class="text-center bg-white rounded-xl shadow-2xl p-12 max-w-md">
          <i class="fas fa-exclamation-circle text-6xl text-red-600 mb-4"></i>
          <p class="text-2xl font-bold text-red-600 mb-2">Error de Inicialización</p>
          <p class="text-gray-600 mb-6">${error.message}</p>
          <button onclick="location.reload()" class="btn-primary">
            <i class="fas fa-refresh"></i> Reintentar
          </button>
        </div>
      </div>
    `;
  }
}

// ===== EXPORT FUNCTIONS =====
async function exportData() {
  if (selectedStations.size === 0) {
    showNotification("Selecciona al menos una estación", "warning");
    return;
  }

  showNotification("⏳ Preparando exportación...", "info");
  
  const ids = Array.from(selectedStations).join(",");
  const hours = parseInt(document.getElementById("exportHours")?.value || 24);
  const format = document.getElementById("exportFormat")?.value || "json";

  try {
    const response = await fetch(`${API_BASE_URL}/stations/bulk/export?station_ids=${ids}&hours=${hours}`);
    const data = await response.json();

    const timestamp = new Date().toISOString().split('T')[0];
    
    if (format === "json") {
      const json = JSON.stringify(data, null, 2);
      const element = document.createElement("a");
      element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(json));
      element.setAttribute("download", `weather_export_${timestamp}.json`);
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else {
      const csvData = data.flatMap(station => 
        station.data.map(record => ({
          estacion: station.name,
          ubicacion: station.location,
          temperatura: record.temperature,
          humedad: record.humidity,
          viento: record.wind_speed,
          lluvia: record.rain,
          timestamp: record.timestamp
        }))
      );
      
      const keys = Object.keys(csvData[0] || {});
      const csv = [keys.join(","), ...csvData.map(row => 
        keys.map(k => {
          const val = row[k];
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(",")
      )].join("\n");
      
      const element = document.createElement("a");
      element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
      element.setAttribute("download", `weather_export_${timestamp}.csv`);
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
    
    showNotification("✓ Datos exportados correctamente", "success");
  } catch (error) {
    console.error("Error exporting:", error);
    showNotification("✗ Error en la exportación", "error");
  }
}

// ===== GLOBAL EXPORTS =====
window.switchPage = switchPage;
window.renderPage = renderPage;
window.toggleStation = toggleStation;
window.toggleAllStations = toggleAllStations;
window.viewStationDetails = viewStationDetails;
window.switchToEditStation = switchToEditStation;
window.deleteStationHandler = deleteStation;
window.handleAddStation = handleAddStation;
window.exportData = exportData;
window.loadStationAnalytics = loadStationAnalytics;
window.refreshAllData = refreshAllData;
window.clearCache = clearCache;
window.showNotification = showNotification;

// Start
init();
