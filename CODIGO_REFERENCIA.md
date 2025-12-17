# 💻 REFERENCIA DE CÓDIGO - Nuevo Frontend

**Para desarrolladores y customización**

---

## 🎨 Clases CSS Tailwind Personalizado

### Definidas en `index.html`:

```css
/* Transiciones suaves */
.transition-smooth { 
  transition: all 0.3s ease-in-out; 
}

/* Efecto de vidrio */
.glass-effect { 
  backdrop-filter: blur(10px); 
  background: rgba(255,255,255,0.8); 
}

/* Tarjeta de estadísticas */
.stats-card { 
  @apply bg-gradient-to-br from-blue-50 to-blue-100 
         border border-blue-200 rounded-lg p-4 
         transition-smooth hover:shadow-lg hover:scale-105; 
}

/* Botón primario */
.btn-primary { 
  @apply bg-gradient-to-r from-blue-500 to-blue-600 
         text-white px-4 py-2 rounded-lg 
         hover:shadow-lg transition-smooth; 
}

/* Botón secundario */
.btn-secondary { 
  @apply bg-gray-200 text-gray-800 px-4 py-2 rounded-lg 
         hover:bg-gray-300 transition-smooth; 
}

/* Campo de entrada */
.input-field { 
  @apply w-full border-2 border-gray-300 rounded-lg px-4 py-2 
         focus:outline-none focus:border-blue-500 transition-smooth; 
}

/* Fila de tabla al pasar mouse */
.table-row-hover { 
  @apply hover:bg-blue-50 transition-smooth; 
}

/* Modal - fondo semitransparente */
.modal-overlay { 
  @apply fixed inset-0 bg-black bg-opacity-50 
         flex items-center justify-center z-50; 
}

/* Modal - caja blanca */
.modal-content { 
  @apply bg-white rounded-lg shadow-2xl max-w-md w-full mx-4; 
}
```

---

## 🔧 Funciones Principales

### 1. Mostrar Notificaciones

```javascript
// Éxito
showNotification("Estación creada exitosamente", "success");

// Error
showNotification("Error creando estación", "error");

// Advertencia
showNotification("Verificar datos antes de enviar", "warning");

// Información
showNotification("Datos actualizados correctamente", "info");

// Código interno
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 px-6 py-3 
    rounded-lg text-white shadow-lg z-50 transition-smooth
    ${type === "success" ? "bg-green-500" : 
      type === "error" ? "bg-red-500" : 
      type === "warning" ? "bg-yellow-500" : 
      "bg-blue-500"}`;
  notification.innerHTML = `
    <div class="flex items-center gap-2">
      <i class="fas fa-${type === "success" ? "check-circle" : ...}"></i>
      <span>${message}</span>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
```

### 2. Mostrar Modales

```javascript
// Parámetros
showModal(title, content, onConfirmCallback);

// Ejemplo 1: Editar estación
showModal(
  `Editar: ${station.name}`,
  `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium">Nombre</label>
        <input type="text" id="editName" value="${station.name}" 
               class="input-field mt-1">
      </div>
      <div>
        <label class="block text-sm font-medium">Ubicación</label>
        <input type="text" id="editLocation" value="${station.location}" 
               class="input-field mt-1">
      </div>
    </div>
  `,
  `function() {
    const updates = {
      name: document.getElementById("editName").value,
      location: document.getElementById("editLocation").value
    };
    updateStation("${stationId}", updates);
  }`
);

// Ejemplo 2: Confirmación simple
showModal(
  "Confirmar eliminación",
  `¿Eliminar <strong>${station.name}</strong>?`,
  `async function() {
    await fetch(\`${API_BASE_URL}/stations/${stationId}\`, 
               { method: "DELETE" });
    renderPage();
  }`
);

// Código interno
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
        <button onclick="this.closest('.modal-overlay').remove()" 
                class="btn-secondary">Cancelar</button>
        <button onclick="this.closest('.modal-overlay').remove(); 
                        (${onConfirm})()" 
                class="btn-primary">Confirmar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
}
```

### 3. Obtener Datos de API

```javascript
// Obtener todas las estaciones
const stations = await fetchStations();
// Retorna: Array de estaciones activas

// Obtener datos de una estación
const data = await fetchStationData(stationId, hours = 24);
// Retorna: Array de registros de datos

// Obtener estadísticas del sistema
const stats = await fetchSystemStats();
// Retorna: { total_stations, active_stations, ... }

// Obtener estadísticas de una estación
const stats = await fetchStationStats(stationId, hours = 24);
// Retorna: { temperature: {avg, min, max}, ... }

// Código ejemplo
async function fetchStations() {
  try {
    const response = await fetch(`${API_BASE_URL}/stations?active=true`);
    stations = await response.json();
    return stations;
  } catch (error) {
    console.error("Error fetching stations:", error);
    showNotification("Error cargando estaciones", "error");
    return [];
  }
}
```

### 4. Exportar Datos

```javascript
// Descargar como JSON
downloadJSON(data, "weather_data.json");

// Descargar como CSV
downloadCSV(data, "weather_data.csv");

// Código interno
function downloadJSON(data, filename) {
  const element = document.createElement("a");
  element.setAttribute("href", 
    "data:text/plain;charset=utf-8," + 
    encodeURIComponent(JSON.stringify(data, null, 2)));
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function downloadCSV(data, filename) {
  const keys = Object.keys(data[0] || {});
  const csv = [
    keys.join(","),
    ...data.map(row => 
      keys.map(k => JSON.stringify(row[k] || "")).join(",")
    )
  ].join("\n");
  const element = document.createElement("a");
  element.setAttribute("href", 
    "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
```

### 5. Cambiar de Página

```javascript
// Cambiar a una vista diferente
switchPage("dashboard");   // Dashboard
switchPage("map");         // Mapa
switchPage("stations");    // Tabla de estaciones
switchPage("add");         // Crear estación
switchPage("export");      // Exportar datos
switchPage("analytics");   // Análisis
switchPage("settings");    // Ajustes

// Código interno
async function switchPage(page) {
  currentPage = page;
  await renderPage();
}
```

---

## 🗺️ Funciones del Mapa

```javascript
// Inicializar mapa
MapModule.initMap("map-container", stations);

// Agregar marcador de estación
MapModule.addStationMarker(station, callbackFunction);

// Actualizar marcador
MapModule.updateStationMarker(station);

// Eliminar marcador
MapModule.removeStationMarker(stationId);

// Ajustar vista para mostrar todos los marcadores
MapModule.fitMapBounds();

// Eliminar todos los marcadores
MapModule.clearAllMarkers();

// Resaltar y centrar en un marcador
MapModule.highlightMarker(stationId);

// Obtener la instancia del mapa Leaflet
const map = MapModule.getMap();

// Agregar visualización de temperatura
MapModule.addWeatherLayer(stationData);

// Eliminar capa de temperatura
MapModule.removeWeatherLayer();

// Obtener un marcador específico
const marker = MapModule.getStationMarker(stationId);

// Obtener todos los marcadores
const allMarkers = MapModule.getAllMarkers();

// Ejemplo de uso completo
MapModule.initMap("map-container");
stations.forEach(station => {
  MapModule.addStationMarker(station, (s) => {
    console.log("Estación clickeada:", s.name);
    viewStationDetails(s.id);
  });
});
MapModule.fitMapBounds();
```

---

## 📊 Gráficas con Chart.js

```javascript
// Crear gráfico de barras
const ctx = document.getElementById("tempChart");
new Chart(ctx, {
  type: "bar",
  data: {
    labels: ["Temperatura", "Humedad", "Velocidad Viento"],
    datasets: [{
      label: "Promedio",
      data: [23, 65, 12],
      backgroundColor: "rgba(59, 130, 246, 0.5)",
      borderColor: "rgba(59, 130, 246, 1)",
      borderWidth: 2
    }, {
      label: "Mínimo",
      data: [15, 40, 5],
      backgroundColor: "rgba(34, 197, 94, 0.5)",
      borderColor: "rgba(34, 197, 94, 1)",
      borderWidth: 2
    }, {
      label: "Máximo",
      data: [30, 85, 25],
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

// Crear gráfico de línea
new Chart(ctx, {
  type: "line",
  data: {
    labels: ["00:00", "06:00", "12:00", "18:00", "24:00"],
    datasets: [{
      label: "Temperatura",
      data: [15, 18, 25, 20, 16],
      borderColor: "rgb(255, 99, 132)",
      backgroundColor: "rgba(255, 99, 132, 0.1)",
      tension: 0.4
    }]
  },
  options: { responsive: true }
});
```

---

## 🎯 Selectores de DOM

```javascript
// ID
document.getElementById("map-container")

// Clase
document.querySelector(".stats-card")
document.querySelectorAll(".btn-primary")

// Data attribute
document.querySelector('[data-station-id="123"]')

// Por etiqueta
document.querySelectorAll("input[type='checkbox']")

// Complejos
document.querySelector(".modal-overlay .modal-content")
```

---

## 🔄 Flujo de Datos

```
┌─────────────────┐
│   Usuario       │
│  (Navegador)    │
└────────┬────────┘
         │ Click/Input
         ▼
┌─────────────────┐
│  Event Handler  │
│ (JS Function)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   API Call      │
│ (fetch())       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend       │
│  (FastAPI)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Database      │
│ (PostgreSQL)    │
└────────┬────────┘
         │ Respuesta JSON
         ▼
┌─────────────────┐
│   Frontend      │
│   (main.js)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Renderizar    │
│   (HTML/CSS)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Usuario Ve    │
│   Cambios       │
└─────────────────┘
```

---

## 🛠️ Extender Funcionalidad

### Agregar nueva vista

```javascript
// 1. Crear función render
function renderMiVista() {
  return `
    <div class="max-w-7xl mx-auto p-8">
      <h1 class="text-3xl font-bold">Mi Nueva Vista</h1>
      <p>Contenido aquí...</p>
    </div>
  `;
}

// 2. Agregar case en switchPage
case "mivista":
  app.innerHTML += `<div class="max-w-7xl mx-auto p-8">${renderMiVista()}</div>`;
  break;

// 3. Agregar botón en navbar
<button onclick="switchPage('mivista')" 
        class="px-4 py-2 rounded-lg ...">
  Mi Vista
</button>
```

### Agregar nueva llamada API

```javascript
// 1. Crear función fetch
async function fetchMisDatos() {
  try {
    const response = await fetch(`${API_BASE_URL}/mi-endpoint`);
    return await response.json();
  } catch (error) {
    console.error("Error:", error);
    showNotification("Error cargando datos", "error");
    return null;
  }
}

// 2. Usar en renderPage
const misDatos = await fetchMisDatos();
if (!misDatos) return;

// 3. Usar en la vista
<div>${misDatos.map(item => `<p>${item.name}</p>`).join("")}</div>
```

### Agregar nueva notificación

```javascript
// Simplemente llamar desde cualquier parte:
showNotification("Tu mensaje aquí", "tipo");

// Tipos disponibles:
// "success" (verde)
// "error" (rojo)
// "warning" (amarillo)
// "info" (azul)
```

---

## 🐛 Debug y Testing

```javascript
// Ver estado de variables globales
console.log(stations);
console.log(systemStats);
console.log(currentPage);
console.log(selectedStations);

// Testear función fetch
await fetchStations().then(s => console.log(s));

// Testear notificación
showNotification("Test", "success");

// Testear modal
showModal("Test", "Contenido test", `function() { 
  console.log("Confirmado"); 
}`);

// Ver que se renderiza
console.log(document.getElementById("app").innerHTML);

// Testear export
const testData = [{name: "Test", location: "Test"}];
downloadJSON(testData, "test.json");
downloadCSV(testData, "test.csv");
```

---

## 📚 Documentación de Constantes

```javascript
// API Base URL
const API_BASE_URL = "http://localhost:8000/api";

// Estados de página
const PAGES = ["dashboard", "map", "stations", "analytics", 
               "add", "export", "settings"];

// Colores
const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#eab308",
  neutral: "#6b7280"
};

// Períodos de exportación
const EXPORT_PERIODS = {
  "1": "1 hora",
  "6": "6 horas",
  "24": "24 horas",
  "72": "3 días",
  "168": "1 semana",
  "720": "1 mes"
};
```

---

## ✅ Checklist para Contribuidores

- [ ] Usa clases CSS existentes
- [ ] Agrega notificaciones en operaciones
- [ ] Crea modales para confirmaciones
- [ ] Maneja errores con try-catch
- [ ] Documenta funciones nuevas
- [ ] Testa en móvil
- [ ] Sigue convención de nombres camelCase
- [ ] Usa transiciones suaves
- [ ] Proporciona feedback visual
- [ ] Mantén consistencia de diseño

---

**Versión:** 2.0.0  
**Última actualización:** 16 de diciembre de 2025
