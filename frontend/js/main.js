const API_BASE_URL = "http://localhost:8000/api";

// Import map module
import * as MapModule from './map.js';

// DOM Elements
let app = document.getElementById("app");
let currentPage = "dashboard";
let selectedStations = new Set();
let chartsCache = {};

// State
let stations = [];
let systemStats = null;

// ===== MODAL MANAGEMENT =====
function showModal(title, content, onConfirm) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="border-b border-gray-200 p-6">
        <h3 class="text-xl font-bold text-gray-800">${title}</h3>
      </div>
      <div class="p-6">${content}</div>
      <div class="border-t border-gray-200 p-6 flex gap-3 justify-end">
        <button onclick="this.closest('.modal-overlay').remove()" class="btn-secondary">Cancelar</button>
        <button onclick="this.closest('.modal-overlay').remove(); (${onConfirm})()" class="btn-primary">Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}

// ===== FETCH HELPERS =====
async function fetchStations() {
  try {
    const response = await fetch(`${API_BASE_URL}/stations?active=true`);
    stations = await response.json();
    return stations;
  } catch (error) {
    console.error("Error fetching stations:", error);
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
      showNotification("Estación creada exitosamente", "success");
      switchPage("stations");
    } else {
      showNotification("Error creando estación", "error");
    }
  } catch (error) {
    console.error("Error:", error);
    showNotification("Error en la solicitud", "error");
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
      showNotification("Estación actualizada", "success");
      renderPage();
    }
  } catch (error) {
    console.error("Error:", error);
    showNotification("Error actualizando estación", "error");
  }
}

async function deleteStation(stationId) {
  const station = stations.find(s => s.id === stationId);
  showModal(
    "Confirmar eliminación",
    `¿Estás seguro de que quieres eliminar <strong>${station?.name}</strong>? Esta acción no se puede deshacer.`,
    `async function() {
      try {
        await fetch(\`${API_BASE_URL}/stations/${stationId}\`, { method: "DELETE" });
        await fetchStations();
        showNotification("Estación eliminada", "success");
        renderPage();
      } catch (error) {
        console.error("Error:", error);
        showNotification("Error eliminando estación", "error");
      }
    }`
  );
}

function downloadCSV(data, filename) {
  const keys = Object.keys(data[0] || {});
  const csv = [keys.join(","), ...data.map(row => keys.map(k => JSON.stringify(row[k] || "")).join(","))].join("\n");
  const element = document.createElement("a");
  element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function downloadJSON(data, filename) {
  const element = document.createElement("a");
  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2)));
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

async function exportData() {
  if (selectedStations.size === 0) {
    showNotification("Selecciona al menos una estación", "warning");
    return;
  }

  const ids = Array.from(selectedStations).join(",");
  const hours = parseInt(document.getElementById("exportHours")?.value || 24);
  const format = document.getElementById("exportFormat")?.value || "json";

  try {
    const response = await fetch(`${API_BASE_URL}/stations/bulk/export?station_ids=${ids}&hours=${hours}`);
    const data = await response.json();

    if (format === "json") {
      downloadJSON(data, `weather_export_${new Date().toISOString().split('T')[0]}.json`);
    } else {
      const csvData = data.flatMap(station => 
        station.data.map(record => ({
          station: station.name,
          temperature: record.temperature,
          humidity: record.humidity,
          wind_speed: record.wind_speed,
          timestamp: record.timestamp
        }))
      );
      downloadCSV(csvData, `weather_export_${new Date().toISOString().split('T')[0]}.csv`);
    }
    showNotification("Datos exportados correctamente", "success");
  } catch (error) {
    console.error("Error exporting:", error);
    showNotification("Error en la exportación", "error");
  }
}

function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white shadow-lg z-50 transition-smooth
    ${type === "success" ? "bg-green-500" : type === "error" ? "bg-red-500" : type === "warning" ? "bg-yellow-500" : "bg-blue-500"}`;
  notification.innerHTML = `
    <div class="flex items-center gap-2">
      <i class="fas fa-${type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"}"></i>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ===== UI RENDERING =====

function renderNavbar() {
  return `
    <nav class="sticky top-0 z-40 bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-xl">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex justify-between items-center mb-4">
          <div class="flex items-center gap-3">
            <i class="fas fa-cloud text-2xl"></i>
            <h1 class="text-3xl font-bold">🌤️ Weather Stations</h1>
          </div>
          <div class="text-sm text-blue-100">
            ${stations.length} estaciones
          </div>
        </div>
        <div class="flex gap-2 flex-wrap">
          ${["dashboard", "map", "stations", "analytics", "add", "export", "settings"].map(page => `
            <button onclick="switchPage('${page}')" 
              class="px-4 py-2 rounded-lg text-sm font-medium transition-smooth ${
                currentPage === page 
                  ? "bg-white text-blue-600 shadow-lg" 
                  : "text-blue-100 hover:bg-blue-700"
              }">
              ${page === "dashboard" ? "📊 Dashboard" : 
                page === "map" ? "📍 Mapa" :
                page === "stations" ? "🏢 Estaciones" :
                page === "analytics" ? "📈 Análisis" :
                page === "add" ? "➕ Nueva" :
                page === "export" ? "📥 Exportar" :
                "⚙️ Ajustes"}
            </button>
          `).join("")}
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
          <p class="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    `;
  }

  const statCards = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="stats-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 font-medium">Total Estaciones</p>
            <p class="text-3xl font-bold text-blue-600 mt-2">${systemStats.total_stations || 0}</p>
          </div>
          <i class="fas fa-building text-4xl text-blue-200"></i>
        </div>
      </div>
      <div class="stats-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 font-medium">Estaciones Activas</p>
            <p class="text-3xl font-bold text-green-600 mt-2">${systemStats.active_stations || 0}</p>
          </div>
          <i class="fas fa-check-circle text-4xl text-green-200"></i>
        </div>
      </div>
      <div class="stats-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 font-medium">Estaciones Inactivas</p>
            <p class="text-3xl font-bold text-red-600 mt-2">${systemStats.inactive_stations || 0}</p>
          </div>
          <i class="fas fa-times-circle text-4xl text-red-200"></i>
        </div>
      </div>
      <div class="stats-card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 font-medium">Total Registros</p>
            <p class="text-3xl font-bold text-purple-600 mt-2">${systemStats.total_records || 0}</p>
          </div>
          <i class="fas fa-database text-4xl text-purple-200"></i>
        </div>
      </div>
    </div>
  `;

  const recentStations = stations.slice(0, 6).map(s => `
    <div class="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-smooth group">
      <div class="flex justify-between items-start mb-3">
        <div>
          <h3 class="font-bold text-gray-800 group-hover:text-blue-600 transition-smooth">${s.name}</h3>
          <p class="text-xs text-gray-500">${s.location}</p>
        </div>
        <span class="px-2 py-1 text-xs rounded-full ${s.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}">
          ${s.active ? "Activa" : "Inactiva"}
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
        <div><i class="fas fa-map-marker-alt"></i> ${s.latitude.toFixed(4)}</div>
        <div><i class="fas fa-map-marker-alt"></i> ${s.longitude.toFixed(4)}</div>
      </div>
      <div class="flex gap-2">
        <button onclick="viewStationDetails('${s.id}')" class="flex-1 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-smooth">
          <i class="fas fa-eye"></i> Ver
        </button>
        <button onclick="switchToEditStation('${s.id}')" class="flex-1 text-xs bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500 transition-smooth">
          <i class="fas fa-edit"></i> Editar
        </button>
      </div>
    </div>
  `).join("");

  return `
    <div class="space-y-8">
      ${statCards}
      
      <div>
        <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i class="fas fa-star text-yellow-500"></i> Estaciones Recientes
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${recentStations}
        </div>
      </div>
    </div>
  `;
}

function renderMap() {
  return `
    <div class="space-y-4">
      <div class="bg-white rounded-lg shadow-lg p-4">
        <div id="map-container" style="height: 600px; width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-blue-50 rounded-lg border-2 border-blue-200 p-4">
          <h3 class="font-bold text-blue-900 flex items-center gap-2">
            <i class="fas fa-info-circle"></i> Uso del Mapa
          </h3>
          <ul class="text-sm text-blue-800 mt-3 space-y-1">
            <li>🔍 Zoom para ver detalles</li>
            <li>🖱️ Arrastra para mover</li>
            <li>📍 Haz clic en marcadores</li>
          </ul>
        </div>
        <div class="bg-green-50 rounded-lg border-2 border-green-200 p-4">
          <h3 class="font-bold text-green-900 flex items-center gap-2">
            <i class="fas fa-check-circle"></i> Estaciones Activas
          </h3>
          <p class="text-2xl font-bold text-green-600 mt-2">${stations.filter(s => s.active).length}</p>
        </div>
        <div class="bg-red-50 rounded-lg border-2 border-red-200 p-4">
          <h3 class="font-bold text-red-900 flex items-center gap-2">
            <i class="fas fa-times-circle"></i> Estaciones Inactivas
          </h3>
          <p class="text-2xl font-bold text-red-600 mt-2">${stations.filter(s => !s.active).length}</p>
        </div>
      </div>
    </div>
  `;
}

function renderStationsManagement() {
  if (stations.length === 0) {
    return `
      <div class="bg-white rounded-lg shadow-lg p-12 text-center">
        <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
        <p class="text-gray-500 text-lg">No hay estaciones disponibles</p>
        <button onclick="switchPage('add')" class="btn-primary mt-4">
          <i class="fas fa-plus"></i> Crear Primera Estación
        </button>
      </div>
    `;
  }

  const rows = stations.map(s => `
    <tr class="table-row-hover border-b">
      <td class="px-6 py-4">
        <input type="checkbox" onchange="toggleStation('${s.id}', this.checked)" class="w-4 h-4 cursor-pointer">
      </td>
      <td class="px-6 py-4 font-medium text-gray-900">${s.name}</td>
      <td class="px-6 py-4 text-gray-600">${s.location}</td>
      <td class="px-6 py-4 text-sm text-gray-500">${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}</td>
      <td class="px-6 py-4">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${s.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}">
          <i class="fas ${s.active ? "fa-check-circle" : "fa-times-circle"} mr-1"></i>
          ${s.active ? "Activa" : "Inactiva"}
        </span>
      </td>
      <td class="px-6 py-4 text-sm text-gray-500">
        ${s.last_data_time ? new Date(s.last_data_time).toLocaleString('es-ES') : "Sin datos"}
      </td>
      <td class="px-6 py-4 flex gap-2">
        <button onclick="viewStationDetails('${s.id}')" class="text-blue-600 hover:text-blue-800 hover:underline transition-smooth">
          <i class="fas fa-eye"></i> Ver
        </button>
        <button onclick="switchToEditStation('${s.id}')" class="text-yellow-600 hover:text-yellow-800 hover:underline transition-smooth">
          <i class="fas fa-edit"></i> Editar
        </button>
        <button onclick="window.deleteStationHandler('${s.id}')" class="text-red-600 hover:text-red-800 hover:underline transition-smooth">
          <i class="fas fa-trash"></i> Eliminar
        </button>
      </td>
    </tr>
  `).join("");

  return `
    <div class="bg-white rounded-lg shadow-lg overflow-hidden">
      <div class="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-800">Gestión de Estaciones</h2>
        <button onclick="switchPage('add')" class="btn-primary">
          <i class="fas fa-plus"></i> Nueva Estación
        </button>
      </div>
      <table class="w-full">
        <thead class="bg-gray-100 border-b-2">
          <tr>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              <input type="checkbox" onchange="toggleAllStations(this.checked)" class="w-4 h-4 cursor-pointer">
            </th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Ubicación</th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Coordenadas</th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Última Actualización</th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderAddStation() {
  return `
    <div class="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <h2 class="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-2">
        <i class="fas fa-plus-circle text-blue-600"></i> Nueva Estación Meteorológica
      </h2>
      <form onsubmit="handleAddStation(event)" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-id-card"></i> ID Estación
            </label>
            <input type="text" id="stationId" required class="input-field" placeholder="ej: ESP32_001">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-tag"></i> Nombre
            </label>
            <input type="text" id="stationName" required class="input-field" placeholder="ej: Estación Central">
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            <i class="fas fa-map-pin"></i> Ubicación
          </label>
          <input type="text" id="stationLocation" required class="input-field" placeholder="ej: Madrid, España">
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-arrows-alt-v"></i> Latitud
            </label>
            <input type="number" id="stationLatitude" required step="0.0001" class="input-field" placeholder="40.4168">
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-arrows-alt-h"></i> Longitud
            </label>
            <input type="number" id="stationLongitude" required step="0.0001" class="input-field" placeholder="-3.7038">
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            <i class="fas fa-pen"></i> Descripción
          </label>
          <textarea id="stationDescription" class="input-field" rows="4" placeholder="Descripción detallada de la estación..."></textarea>
        </div>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p class="text-sm text-blue-800">
            <i class="fas fa-lightbulb"></i> <strong>Consejo:</strong> Asegúrate de que las coordenadas sean precisas para una mejor visualización en el mapa.
          </p>
        </div>

        <div class="flex gap-4 pt-6">
          <button type="submit" class="flex-1 btn-primary text-lg py-3 font-semibold">
            <i class="fas fa-save"></i> Crear Estación
          </button>
          <button type="button" onclick="switchPage('stations')" class="flex-1 btn-secondary text-lg py-3 font-semibold">
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
    return s ? `<div class="flex items-center gap-2 p-2 bg-blue-50 rounded"><i class="fas fa-check-circle text-green-600"></i> ${s.name}</div>` : "";
  }).join("");

  return `
    <div class="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <h2 class="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-2">
        <i class="fas fa-download text-blue-600"></i> Exportar Datos
      </h2>
      
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <i class="fas fa-building"></i> Estaciones Seleccionadas (${selectedStations.size})
          </h3>
          <div class="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 max-h-48 overflow-y-auto">
            ${stationsList ? stationsList : '<p class="text-gray-500 text-center py-8"><i class="fas fa-inbox"></i> Selecciona estaciones en la pestaña Estaciones</p>'}
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-clock"></i> Período (últimas N horas)
            </label>
            <select id="exportHours" class="input-field">
              <option value="1">📌 1 hora</option>
              <option value="6">📌 6 horas</option>
              <option value="24" selected>📌 24 horas</option>
              <option value="72">📌 3 días</option>
              <option value="168">📌 1 semana</option>
              <option value="720">📌 1 mes</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              <i class="fas fa-file"></i> Formato de Exportación
            </label>
            <select id="exportFormat" class="input-field">
              <option value="json">📄 JSON</option>
              <option value="csv">📊 CSV</option>
            </select>
          </div>
        </div>

        <div class="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 p-6 rounded-lg">
          <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <i class="fas fa-info-circle text-blue-600"></i> Información de Exportación
          </h4>
          <ul class="text-sm text-gray-700 space-y-2">
            <li>✓ Descargará datos de las estaciones seleccionadas</li>
            <li>✓ Filtrados por el período especificado</li>
            <li>✓ Incluye temperatura, humedad, viento, lluvia</li>
            <li>✓ Timestamps con zona horaria</li>
          </ul>
        </div>

        <button onclick="exportData()" class="w-full btn-primary text-lg py-4 font-semibold rounded-lg">
          <i class="fas fa-download"></i> Descargar Datos
        </button>
      </div>
    </div>
  `;
}

function renderAnalytics() {
  return `
    <div class="space-y-6">
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i class="fas fa-chart-line text-blue-600"></i> Análisis de Datos
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Seleccionar Estación</label>
            <select id="analyticsStation" onchange="loadStationAnalytics(this.value)" class="input-field">
              <option value="">-- Selecciona una estación --</option>
              ${stations.map(s => `<option value="${s.id}">${s.name}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Período</label>
            <select id="analyticsPeriod" onchange="loadStationAnalytics(document.getElementById('analyticsStation').value)" class="input-field">
              <option value="24">24 horas</option>
              <option value="168">1 semana</option>
              <option value="720">1 mes</option>
            </select>
          </div>
        </div>
        <div id="analyticsChart" class="mt-6">
          <canvas id="tempChart" style="max-height: 400px;"></canvas>
        </div>
      </div>
    </div>
  `;
}

function renderSettings() {
  return `
    <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <h2 class="text-3xl font-bold mb-8 text-gray-800 flex items-center gap-2">
        <i class="fas fa-cog text-blue-600"></i> Ajustes
      </h2>
      
      <div class="space-y-6">
        <div class="border-2 border-gray-200 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <i class="fas fa-database text-blue-600"></i> Información del Sistema
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-600">API URL:</p>
              <p class="font-mono text-gray-800">${API_BASE_URL}</p>
            </div>
            <div>
              <p class="text-gray-600">Versión:</p>
              <p class="font-mono text-gray-800">1.0.0</p>
            </div>
          </div>
        </div>

        <div class="border-2 border-gray-200 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <i class="fas fa-sync text-green-600"></i> Actualizar Datos
          </h3>
          <button onclick="refreshAllData()" class="btn-primary">
            <i class="fas fa-refresh"></i> Actualizar Ahora
          </button>
        </div>

        <div class="border-2 border-gray-200 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <i class="fas fa-trash text-red-600"></i> Datos Locales
          </h3>
          <button onclick="clearCache()" class="btn-secondary">
            <i class="fas fa-broom"></i> Limpiar Caché
          </button>
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
  
  if (!stats) return;

  const ctx = document.getElementById("tempChart");
  if (chartsCache[stationId]) chartsCache[stationId].destroy();
  
  chartsCache[stationId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Temperatura", "Humedad", "Velocidad Viento"],
      datasets: [{
        label: "Promedio",
        data: [stats.temperature?.avg || 0, stats.humidity?.avg || 0, stats.wind_speed?.avg || 0],
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2
      }, {
        label: "Mínimo",
        data: [stats.temperature?.min || 0, stats.humidity?.min || 0, stats.wind_speed?.min || 0],
        backgroundColor: "rgba(34, 197, 94, 0.5)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 2
      }, {
        label: "Máximo",
        data: [stats.temperature?.max || 0, stats.humidity?.max || 0, stats.wind_speed?.max || 0],
        backgroundColor: "rgba(239, 68, 68, 0.5)",
        borderColor: "rgba(239, 68, 68, 1)",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true, position: "top" }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function handleAddStation(event) {
  event.preventDefault();
  
  const stationData = {
    id: document.getElementById("stationId").value,
    name: document.getElementById("stationName").value,
    location: document.getElementById("stationLocation").value,
    latitude: parseFloat(document.getElementById("stationLatitude").value),
    longitude: parseFloat(document.getElementById("stationLongitude").value),
    description: document.getElementById("stationDescription").value,
  };

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
  } else {
    selectedStations.clear();
  }
  renderPage();
}

function switchToEditStation(stationId) {
  const station = stations.find(s => s.id === stationId);
  if (!station) return;

  const content = `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium">Nombre</label>
        <input type="text" id="editName" value="${station.name}" class="input-field mt-1">
      </div>
      <div>
        <label class="block text-sm font-medium">Ubicación</label>
        <input type="text" id="editLocation" value="${station.location}" class="input-field mt-1">
      </div>
      <div class="flex gap-4">
        <div class="flex-1">
          <label class="block text-sm font-medium">Latitud</label>
          <input type="number" id="editLat" value="${station.latitude}" step="0.0001" class="input-field mt-1">
        </div>
        <div class="flex-1">
          <label class="block text-sm font-medium">Longitud</label>
          <input type="number" id="editLng" value="${station.longitude}" step="0.0001" class="input-field mt-1">
        </div>
      </div>
      <div>
        <label class="flex items-center gap-2 mt-4">
          <input type="checkbox" id="editActive" ${station.active ? "checked" : ""} class="w-4 h-4">
          <span class="text-sm font-medium">Estación Activa</span>
        </label>
      </div>
    </div>
  `;

  showModal(
    `Editar: ${station.name}`,
    content,
    `function() {
      const updates = {
        name: document.getElementById("editName").value,
        location: document.getElementById("editLocation").value,
        latitude: parseFloat(document.getElementById("editLat").value),
        longitude: parseFloat(document.getElementById("editLng").value),
        active: document.getElementById("editActive").checked
      };
      updateStation("${stationId}", updates);
    }`
  );
}

function viewStationDetails(stationId) {
  const station = stations.find(s => s.id === stationId);
  if (!station) return;

  app.innerHTML = renderNavbar() + `
    <div class="max-w-4xl mx-auto p-8">
      <button onclick="switchPage('stations')" class="mb-4 text-blue-600 hover:underline flex items-center gap-2">
        <i class="fas fa-arrow-left"></i> Volver a Estaciones
      </button>
      
      <div class="bg-white rounded-lg shadow-lg p-8">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h1 class="text-4xl font-bold text-gray-800">${station.name}</h1>
            <p class="text-gray-600 mt-2">${station.location}</p>
          </div>
          <span class="px-4 py-2 rounded-full text-lg font-medium ${station.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}">
            ${station.active ? "Activa" : "Inactiva"}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="stats-card">
            <p class="text-sm text-gray-600">Latitud</p>
            <p class="text-2xl font-bold text-blue-600">${station.latitude.toFixed(4)}</p>
          </div>
          <div class="stats-card">
            <p class="text-sm text-gray-600">Longitud</p>
            <p class="text-2xl font-bold text-blue-600">${station.longitude.toFixed(4)}</p>
          </div>
          <div class="stats-card">
            <p class="text-sm text-gray-600">Última Actualización</p>
            <p class="text-lg font-bold text-blue-600">${station.last_data_time ? new Date(station.last_data_time).toLocaleString('es-ES') : "Sin datos"}</p>
          </div>
        </div>

        <div class="flex gap-4">
          <button onclick="switchToEditStation('${station.id}')" class="btn-primary flex-1">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button onclick="window.deleteStationHandler('${station.id}'); switchPage('stations')" class="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex-1">
            <i class="fas fa-trash"></i> Eliminar
          </button>
        </div>
      </div>
    </div>
  `;
}

async function refreshAllData() {
  showNotification("Actualizando datos...", "info");
  await Promise.all([fetchStations(), fetchSystemStats()]);
  renderPage();
  showNotification("Datos actualizados", "success");
}

function clearCache() {
  chartsCache = {};
  selectedStations.clear();
  localStorage.clear();
  showNotification("Caché limpiado", "success");
  renderPage();
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

// ===== INITIALIZATION =====
async function init() {
  try {
    await fetchStations();
    await fetchSystemStats();
    await renderPage();
  } catch (error) {
    console.error("Initialization error:", error);
    app.innerHTML = `
      <div class="flex items-center justify-center h-screen">
        <div class="text-center text-red-600">
          <i class="fas fa-exclamation-circle text-6xl mb-4"></i>
          <p class="text-xl">Error inicializando la aplicación</p>
          <p class="text-sm mt-2">${error.message}</p>
        </div>
      </div>
    `;
  }
}

// Make functions globally available
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

// Start the app
init();
