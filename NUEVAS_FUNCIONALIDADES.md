# 🌤️ Weather Station App - Nuevas Características

## 📋 Resumen

Se han agregado **6 componentes principales** a la aplicación Weather Station:

1. **Ingesta de datos externos** - Conectar múltiples fuentes de datos
2. **Base de datos central** - Almacenar y organizar todos los datos
3. **API de acceso a datos** - Consultar datos de forma estructurada
4. **Sistema de enlaces públicos** - Compartir datos sin exponer la API completa
5. **Mapa interactivo** - Visualizar estaciones en tiempo real
6. **Gestión mejorada de estaciones** - CRUD completo con estadísticas y salud

---

## 🔌 1. Ingesta de Datos Externos

### Descripción
Sistema para recibir datos de múltiples fuentes meteorológicas externas (OpenWeatherMap, AEMET, etc.) y almacenarlos de forma centralizada.

### Fuentes Soportadas
- **OpenWeatherMap** - API de OpenWeather
- **AEMET** - Agencia Estatal de Meteorología (España)
- **WeatherAPI** - Servicio de weather.com
- **IPMA** - Instituto Português do Mar e Atmosfera
- **SMHI** - Sveriges Meteorologiska och Hydrologiska Institut
- **Custom** - Integración personalizada

### Endpoints

#### Crear fuente de datos
```bash
POST /api/external/sources
Content-Type: application/json

{
  "name": "OpenWeatherMap Production",
  "source_type": "openweathermap",
  "api_key": "tu_api_key_aqui",
  "api_url": "https://api.openweathermap.org/data/2.5/weather",
  "field_mapping": {
    "temperature": "main.temp",
    "humidity": "main.humidity",
    "wind_speed_ms": "wind.speed"
  },
  "sync_interval_minutes": 30,
  "active": true
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "OpenWeatherMap Production",
  "source_type": "openweathermap",
  "api_url": "https://api.openweathermap.org/data/2.5/weather",
  "active": true,
  "last_sync": null,
  "sync_interval_minutes": 30,
  "created_at": "2024-12-16T10:00:00",
  "updated_at": "2024-12-16T10:00:00"
}
```

#### Listar fuentes
```bash
GET /api/external/sources?active=true&limit=100
```

#### Obtener detalles de fuente
```bash
GET /api/external/sources/{source_id}
```

#### Actualizar fuente
```bash
PUT /api/external/sources/{source_id}
Content-Type: application/json

{
  "sync_interval_minutes": 15,
  "active": true
}
```

#### Eliminar fuente
```bash
DELETE /api/external/sources/{source_id}
```

---

## 📊 2. Ingesta de Datos Externos (Registros)

### Ingestar datos
```bash
POST /api/external/data
Content-Type: application/json

{
  "source_id": "uuid_de_fuente",
  "station_id": "uuid_de_estacion",
  "raw_data": {
    "main": {
      "temp": 22.5,
      "humidity": 65
    },
    "wind": {
      "speed": 3.2
    }
  },
  "location_name": "Madrid Centro",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "source_timestamp": "2024-12-16T10:15:00"
}
```

### Listar registros
```bash
GET /api/external/data?source_id=uuid&station_id=uuid&processed=false&limit=100
```

### Obtener registro
```bash
GET /api/external/data/{record_id}
```

### Eliminar registro
```bash
DELETE /api/external/data/{record_id}
```

**Características:**
- ✅ Transformación automática de datos usando field mapping
- ✅ Procesamiento asincrónico en background
- ✅ Mapeo automático a estaciones existentes
- ✅ Almacenamiento de datos brutos para auditoría
- ✅ Gestión de errores y reintento

---

## 🔐 3. Sistema de Enlaces Públicos

### ¿Por qué?
Permite compartir datos de estaciones específicas sin exponer la API completa ni requerir autenticación.

### Crear enlace público
```bash
POST /api/public/share-links
Content-Type: application/json

{
  "station_id": "uuid_de_estacion",
  "description": "Datos públicos de la estación de Madrid",
  "can_view_data": true,
  "can_view_current": true,
  "can_view_history": true,
  "can_download": true,
  "expires_in_days": 30,
  "max_accesses": null
}
```

**Response:**
```json
{
  "id": "uuid",
  "token": "AbCdEfG123456789...",
  "station_id": "uuid_estacion",
  "description": "Datos públicos de la estación de Madrid",
  "active": true,
  "created_at": "2024-12-16T10:00:00",
  "expires_at": "2025-01-15T10:00:00",
  "access_count": 0,
  "can_view_data": true,
  "can_view_current": true,
  "can_view_history": true,
  "can_download": true
}
```

### Listar enlaces
```bash
GET /api/public/share-links?station_id=uuid&active=true
```

### Actualizar enlace
```bash
PUT /api/public/share-links/{link_id}
Content-Type: application/json

{
  "active": false,
  "max_accesses": 100
}
```

### Eliminar enlace
```bash
DELETE /api/public/share-links/{link_id}
```

---

## 📡 4. Acceso Público a Datos

### Obtener información de estación (público)
```bash
GET /api/public/station/{token}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Estación Madrid",
  "location": "Alcalá de Henares",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "description": "Estación meteorológica principal",
  "permissions": {
    "can_view_current": true,
    "can_view_history": true,
    "can_download": true
  }
}
```

### Obtener datos actuales (público)
```bash
GET /api/public/station/{token}/current
```

### Obtener historial (público)
```bash
GET /api/public/station/{token}/history?hours=24&limit=1000
```

### Exportar datos (público)
```bash
GET /api/public/station/{token}/export?format=json&hours=24
GET /api/public/station/{token}/export?format=csv&hours=24
```

**Características:**
- ✅ Tokens seguros y únicos
- ✅ Control granular de permisos
- ✅ Expiración configurable
- ✅ Límite de accesos
- ✅ Tracking de accesos
- ✅ Exportación en JSON y CSV

---

## 🗺️ 5. Mapa Interactivo

### Características
- ✅ Visualización en tiempo real de todas las estaciones
- ✅ Clustering automático con Leaflet.js
- ✅ Marcadores con códigos de color por estado
- ✅ Información popup al hacer clic
- ✅ Zoom adaptativo
- ✅ Soporte para múltiples capas

### Uso en Frontend

```javascript
import * as MapModule from './map.js';

// Inicializar mapa
MapModule.initMap('map-container');

// Agregar marcadores
stations.forEach(station => {
  MapModule.addStationMarker(station, (station) => {
    console.log('Estación clickeada:', station);
  });
});

// Ajustar vista a todos los marcadores
MapModule.fitMapBounds();

// Destacar estación
MapModule.highlightMarker('station-id');

// Actualizar marcador
MapModule.updateStationMarker(updatedStation);

// Limpiar todos los marcadores
MapModule.clearAllMarkers();
```

### Acceder desde la UI
1. Navega a la pestaña **"📍 Mapa"** en la barra de navegación
2. Visualiza todas las estaciones en el mapa
3. Haz zoom para ver detalles
4. Haz clic en un marcador para ver información
5. Haz clic en "Ver Detalles" para más información

---

## 📊 6. Gestión Mejorada de Estaciones

### CRUD Básico

#### Crear estación
```bash
POST /api/stations/
Content-Type: application/json

{
  "id": "estacion_001",  # Opcional, se genera UUID si no se proporciona
  "name": "Estación Madrid Centro",
  "location": "Alcalá de Henares",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "description": "Estación meteorológica principal de Madrid",
  "active": true
}
```

#### Listar estaciones
```bash
GET /api/stations/?active=true&skip=0&limit=100
```

#### Obtener estación
```bash
GET /api/stations/{station_id}
```

#### Actualizar estación
```bash
PUT /api/stations/{station_id}
Content-Type: application/json

{
  "name": "Nuevo nombre",
  "location": "Nueva ubicación",
  "description": "Nueva descripción",
  "active": true
}
```

#### Eliminar estación
```bash
DELETE /api/stations/{station_id}
```

### Estadísticas

#### Resumen general
```bash
GET /api/stations/stats/overview
```

**Response:**
```json
{
  "total_stations": 10,
  "active_stations": 8,
  "inactive_stations": 2,
  "total_records": 50000,
  "recent_stations": 7,
  "avg_temperature_24h": 18.5,
  "timestamp": "2024-12-16T10:15:00"
}
```

#### Estadísticas de estación
```bash
GET /api/stations/{station_id}/stats?hours=24
```

**Response:**
```json
{
  "station_id": "uuid",
  "station_name": "Estación Madrid",
  "period_hours": 24,
  "record_count": 288,
  "temperature": {
    "avg": 18.5,
    "min": 15.2,
    "max": 22.1,
    "std_dev": 1.8
  },
  "humidity": {
    "avg": 65.3,
    "min": 45.0,
    "max": 85.0
  },
  "wind": {
    "avg_speed": 3.2,
    "max_speed": 8.5
  },
  "total_rainfall": 2.3
}
```

### Health Check (Monitoreo)

#### Salud de estación
```bash
GET /api/stations/{station_id}/health
```

**Response:**
```json
{
  "station_id": "uuid",
  "station_name": "Estación Madrid",
  "status": "healthy",  # healthy, warning, stale, no_data, inactive
  "active": true,
  "last_data_time": "2024-12-16T10:15:00",
  "time_since_last_data_seconds": 120,
  "records_last_hour": 12,
  "records_last_24h": 288,
  "timestamp": "2024-12-16T10:16:00"
}
```

#### Salud de todas las estaciones
```bash
GET /api/stations/batch/health
```

**Response:**
```json
{
  "summary": {
    "healthy": 8,
    "warning": 1,
    "stale": 1,
    "no_data": 0,
    "inactive": 0
  },
  "timestamp": "2024-12-16T10:16:00",
  "stations": [
    {
      "station_id": "uuid",
      "station_name": "Estación Madrid",
      "status": "healthy",
      "last_data_time": "2024-12-16T10:15:00",
      "time_since_last_data_seconds": 120
    }
    // ...más estaciones
  ]
}
```

### Estados de Salud

| Estado | Significado | Acción |
|--------|-------------|--------|
| **healthy** | Datos frescos (< 1 hora) | ✅ Normal |
| **warning** | Datos algo antiguos (1-24 horas) | ⚠️ Revisar |
| **stale** | Datos muy antiguos (> 24 horas) | 🔴 Investigar |
| **no_data** | Nunca ha enviado datos | ❌ Verificar conexión |
| **inactive** | Estación desactivada | ⏸️ Reactivar si es necesario |

---

## 🚀 Ejemplo de Flujo Completo

### 1. Crear fuente de datos externa
```bash
curl -X POST http://localhost:8000/api/external/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AEMET Spain",
    "source_type": "aemet",
    "api_key": "tu_clave",
    "field_mapping": {
      "temperature": "temperatura",
      "humidity": "humedad"
    }
  }'
```

### 2. Crear estación
```bash
curl -X POST http://localhost:8000/api/stations/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Madrid Centro",
    "location": "Madrid, España",
    "latitude": 40.4168,
    "longitude": -3.7038
  }'
```

### 3. Ingestar datos
```bash
curl -X POST http://localhost:8000/api/external/data \
  -H "Content-Type: application/json" \
  -d '{
    "source_id": "id_fuente",
    "station_id": "id_estacion",
    "raw_data": {...}
  }'
```

### 4. Crear enlace público
```bash
curl -X POST http://localhost:8000/api/public/share-links \
  -H "Content-Type: application/json" \
  -d '{
    "station_id": "id_estacion",
    "description": "Datos de Madrid",
    "expires_in_days": 30
  }'
```

### 5. Compartir con otros (token desde respuesta anterior)
```
https://tuapp.com/?share=TOKEN_AQUI
```

### 6. Ver en mapa
Navega a `http://localhost:8080` → pestaña "Mapa"

---

## 📦 Modelos de Base de Datos

### ExternalDataSourceModel
```python
- id: String (UUID)
- name: String
- source_type: Enum(OPENWEATHERMAP, AEMET, etc.)
- api_key: String (encrypted)
- api_url: String
- field_mapping: JSON
- active: Boolean
- last_sync: DateTime
- sync_interval_minutes: Integer
```

### ExternalDataRecord
```python
- id: Integer
- source_id: String (FK)
- station_id: String (FK)
- raw_data: JSON
- normalized_data: JSON
- location_name: String
- latitude: Float
- longitude: Float
- source_timestamp: DateTime
- received_at: DateTime
- processed: Boolean
- error_message: String
```

### PublicShareLink
```python
- id: String (UUID)
- station_id: String (FK)
- token: String (unique)
- description: String
- can_view_data: Boolean
- can_view_current: Boolean
- can_view_history: Boolean
- can_download: Boolean
- active: Boolean
- created_at: DateTime
- expires_at: DateTime
- last_accessed: DateTime
- access_count: Integer
- max_accesses: Integer (null = unlimited)
```

---

## 🔒 Seguridad

### Recomendaciones
1. **API Keys**: Guarda las keys de APIs externas en variables de entorno
2. **Tokens**: Los tokens de compartir son únicos y criptográficamente seguros
3. **Permisos**: Define qué pueden hacer con cada enlace público
4. **HTTPS**: Usa HTTPS en producción
5. **Rate Limiting**: Implementa límite de requests si expones públicamente

---

## 📝 Próximas Mejoras Sugeridas

- [ ] Autenticación de usuarios
- [ ] Roles y permisos (admin, viewer, editor)
- [ ] Webhooks para notificaciones en tiempo real
- [ ] Integración con servicios de alerta (email, SMS)
- [ ] Dashboard de analíticas avanzadas
- [ ] Exportación a formatos adicionales (XML, CSV con gráficos)
- [ ] Cache distribuido con Redis
- [ ] Sincronización multi-región
- [ ] Versionado de datos
- [ ] Auditoría completa de cambios

---

## 📞 Soporte

Para más detalles, consulta:
- `/docs` - Documentación Swagger interactiva
- `/redoc` - Documentación ReDoc
- README.md - Guía general
- ARQUITECTURA.md - Diseño del sistema

