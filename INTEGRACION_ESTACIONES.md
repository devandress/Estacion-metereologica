# 📡 Integración de Estaciones - Cómo Conectar y Enviar Datos

## 📋 Resumen Rápido

Las estaciones envían datos a través de **HTTP POST** a estos endpoints:

```
Endpoint Principal: POST http://localhost:8000/api/stations/{station_id}/data
Endpoint Múltiple:  POST http://localhost:8000/api/stations/bulk/data
```

---

## 🏗️ Arquitectura General

```
┌──────────────────┐
│   ESP32/Sensor   │
│   (Tu dispositivo)
└────────┬─────────┘
         │
         │ Envía datos JSON
         │ vía HTTP POST
         ▼
┌──────────────────────────────────────┐
│   Backend FastAPI (Puerto 8000)      │
│   • Recibe datos                     │
│   • Valida con Pydantic              │
│   • Almacena en PostgreSQL           │
│   • Actualiza timestamp              │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   PostgreSQL Database                │
│   • Tabla: weather_stations          │
│   • Tabla: weather_data              │
│   • Índices optimizados              │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   Frontend (Puerto 8080)             │
│   • Lee datos de la API              │
│   • Muestra en Dashboard             │
│   • Renderiza Mapa                   │
│   • Muestra Gráficas                 │
└──────────────────────────────────────┘
```

---

## 1️⃣ CREAR UNA ESTACIÓN

### Desde el Frontend
1. Abre http://localhost:8080
2. Click en "Nueva Estación"
3. Completa el formulario:
   - **ID Estación:** Identificador único (ej: ESP32_001)
   - **Nombre:** Nombre descriptivo (ej: Estación Madrid)
   - **Ubicación:** Lugar físico (ej: Centro Histórico)
   - **Latitud:** 40.4168
   - **Longitud:** -3.7038
   - **Descripción:** Notas opcionales

4. Click "Crear"

### Desde la API (cURL)

```bash
curl -X POST http://localhost:8000/api/stations/ \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ESP32_001",
    "name": "Estación Madrid",
    "location": "Centro Histórico",
    "latitude": 40.4168,
    "longitude": -3.7038,
    "description": "Estación meteorológica principal"
  }'
```

### Respuesta:
```json
{
  "id": "ESP32_001",
  "name": "Estación Madrid",
  "location": "Centro Histórico",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "description": "Estación meteorológica principal",
  "active": true,
  "created_at": "2025-12-17T10:30:00",
  "last_data_time": null
}
```

---

## 2️⃣ ENVIAR DATOS DESDE ESP32

### Opción A: Código Arduino/ESP32

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Configuración
const char* ssid = "TU_RED_WIFI";
const char* password = "TU_CONTRASEÑA";
const char* serverUrl = "http://192.168.1.100:8000/api/stations/ESP32_001/data";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("✅ WiFi conectado");
}

void loop() {
  // Leer sensores
  float temperature = readTemperature();    // Tu sensor
  float humidity = readHumidity();          // Tu sensor
  float windSpeed = readWindSpeed();        // Tu sensor
  
  // Crear JSON
  StaticJsonDocument<256> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["wind_speed_ms"] = windSpeed;
  doc["wind_gust_ms"] = windSpeed * 1.2;
  doc["wind_direction_degrees"] = 180;
  doc["total_rainfall"] = 0;
  
  // Enviar
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode == 201) {
    Serial.println("✅ Datos enviados");
  } else {
    Serial.print("❌ Error: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
  
  delay(300000); // Enviar cada 5 minutos
}
```

### Opción B: Script Python (Testing/Alternativa)

```python
#!/usr/bin/env python3
import requests
import json
import time

API_URL = "http://localhost:8000/api/stations/ESP32_001/data"

def send_data(temperature, humidity, wind_speed):
    payload = {
        "temperature": temperature,
        "humidity": humidity,
        "wind_speed_ms": wind_speed,
        "wind_gust_ms": wind_speed * 1.2,
        "wind_direction_degrees": 180,
        "total_rainfall": 0
    }
    
    response = requests.post(
        API_URL,
        json=payload,
        headers={"Content-Type": "application/json"}
    )
    
    if response.status_code == 201:
        print("✅ Datos enviados:", response.json()["id"])
    else:
        print("❌ Error:", response.status_code, response.text)

# Usar
send_data(temperature=22.5, humidity=65, wind_speed=3.2)
```

---

## 3️⃣ ESTRUCTURA DE DATOS ENVIADOS

### Formato JSON Mínimo (Obligatorio)
```json
{
  "temperature": 22.5,
  "humidity": 65.0
}
```

### Formato JSON Completo (Recomendado)
```json
{
  "temperature": 22.5,
  "humidity": 65.0,
  "dew_point": 14.2,
  "wind_speed_ms": 3.2,
  "wind_speed_mph": 7.1,
  "wind_gust_ms": 5.5,
  "wind_gust_mph": 12.3,
  "wind_direction_degrees": 180,
  "wind_direction_name": "S",
  "total_rainfall": 0.5,
  "total_tips": 5,
  "rain_rate_mm_per_hour": 0.1,
  "rain_rate_in_per_hour": 0.004
}
```

### Campos Disponibles

| Campo | Tipo | Unidad | Obligatorio | Descripción |
|-------|------|--------|------------|-------------|
| `temperature` | float | °C | ✅ | Temperatura ambiente |
| `humidity` | float | % | ✅ | Humedad relativa |
| `dew_point` | float | °C | ❌ | Punto de rocío |
| `wind_speed_ms` | float | m/s | ❌ | Velocidad viento |
| `wind_speed_mph` | float | mph | ❌ | Velocidad viento |
| `wind_gust_ms` | float | m/s | ❌ | Ráfaga máxima |
| `wind_gust_mph` | float | mph | ❌ | Ráfaga máxima |
| `wind_direction_degrees` | int | 0-360 | ❌ | Dirección viento |
| `wind_direction_name` | string | N/S/E/O | ❌ | Dirección en letras |
| `total_rainfall` | float | mm | ❌ | Lluvia acumulada |
| `total_tips` | int | - | ❌ | Conteo de tips |
| `rain_rate_mm_per_hour` | float | mm/h | ❌ | Tasa de lluvia |
| `rain_rate_in_per_hour` | float | in/h | ❌ | Tasa de lluvia |

---

## 4️⃣ ENDPOINT INDIVIDUAL DE DATOS

### URL
```
POST /api/stations/{station_id}/data
```

### Ejemplo
```bash
curl -X POST http://localhost:8000/api/stations/ESP32_001/data \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 22.5,
    "humidity": 65,
    "wind_speed_ms": 3.2,
    "wind_gust_ms": 5.5,
    "wind_direction_degrees": 180,
    "total_rainfall": 0
  }'
```

### Respuesta Exitosa (201 Created)
```json
{
  "id": "abc123def456",
  "station_id": "ESP32_001",
  "temperature": 22.5,
  "humidity": 65.0,
  "wind_speed_ms": 3.2,
  "wind_gust_ms": 5.5,
  "wind_direction_degrees": 180,
  "total_rainfall": 0,
  "created_at": "2025-12-17T10:35:00",
  "processed": false
}
```

### Errores Comunes
```
404 - Station not found        → La estación no existe
400 - Validation error         → Datos incorrectos
500 - Server error             → Error en el servidor
```

---

## 5️⃣ ENDPOINT MÚLTIPLE (Bulk)

Para enviar múltiples lecturas de varias estaciones a la vez:

### URL
```
POST /api/stations/bulk/data
```

### Formato
```bash
curl -X POST http://localhost:8000/api/stations/bulk/data \
  -H "Content-Type: application/json" \
  -d '[
    {
      "station_id": "ESP32_001",
      "temperature": 22.5,
      "humidity": 65
    },
    {
      "station_id": "ESP32_002",
      "temperature": 18.3,
      "humidity": 72
    }
  ]'
```

---

## 6️⃣ FLUJO RECOMENDADO DE INTEGRACIÓN

### Paso 1: Verificar conexión a WiFi
```python
if wifi_connected():
    print("✅ WiFi conectado")
else:
    print("❌ Sin WiFi, reintentar")
```

### Paso 2: Verificar que estación existe
```bash
curl http://localhost:8000/api/stations/ESP32_001
```

Si no existe, crearla primero.

### Paso 3: Leer sensores
```cpp
float temp = DHT.readTemperature();
float humidity = DHT.readHumidity();
```

### Paso 4: Validar datos
```cpp
if (temp < -50 || temp > 60) {
    Serial.println("❌ Temperatura fuera de rango");
    return;
}
```

### Paso 5: Enviar a API
```cpp
http.POST(json_data);
```

### Paso 6: Reintentos en caso de fallo
```cpp
int retries = 3;
while (retries > 0 && !success) {
    success = http.POST(json_data);
    if (!success) {
        delay(5000); // Esperar 5 segundos
        retries--;
    }
}
```

### Paso 7: Esperar intervalo
```cpp
delay(300000); // 5 minutos
```

---

## 7️⃣ VERIFICAR QUE LOS DATOS LLEGAN

### Desde el Frontend
1. Abre http://localhost:8080
2. Ir a "Dashboard" o "Mapa"
3. Deberías ver tu estación con datos

### Desde la API
```bash
# Ver datos de una estación (últimas 24h)
curl "http://localhost:8000/api/stations/ESP32_001/data?hours=24"

# Ver últimos 10 registros
curl "http://localhost:8000/api/stations/ESP32_001/data?limit=10"

# Ver todas las estaciones con datos recientes
curl "http://localhost:8000/api/stations/"
```

### Desde la Base de Datos
```bash
psql -U postgres weather_db

# Ver estaciones
SELECT id, name, last_data_time FROM weather_stations;

# Ver últimos datos
SELECT * FROM weather_data 
WHERE station_id = 'ESP32_001' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 8️⃣ BASE DE DATOS - Dónde se guardan

### Tabla: `weather_stations`
```
id                  → UUID único (ej: ESP32_001)
name                → Nombre (ej: Estación Madrid)
location            → Ubicación
latitude, longitude → Coordenadas
active              → Estado (true/false)
created_at          → Fecha creación
last_data_time      → Última lectura
```

### Tabla: `weather_data`
```
id              → UUID único del registro
station_id      → FK a weather_stations
temperature     → Temperatura en °C
humidity        → Humedad en %
wind_speed_ms   → Viento en m/s
... más campos  → Otros parámetros
created_at      → Hora de lectura
processed       → Si fue procesado
```

### Índices Optimizados
```sql
CREATE INDEX idx_weather_data_station_id ON weather_data(station_id);
CREATE INDEX idx_weather_data_created_at ON weather_data(created_at DESC);
CREATE INDEX idx_weather_stations_active ON weather_stations(active);
```

---

## 9️⃣ EJEMPLO COMPLETO: Sensor DHT22 con ESP32

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// WiFi
const char* ssid = "MiRed";
const char* password = "MiContraseña";

// Sensor DHT22
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// API
const char* apiUrl = "http://192.168.1.100:8000/api/stations/ESP32_001/data";
const unsigned long sendInterval = 300000; // 5 minutos
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  // Conectar WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi conectado");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ Error WiFi");
  }
}

void loop() {
  // Verificar WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ Reconectando WiFi...");
    WiFi.reconnect();
    return;
  }
  
  // Cada 5 minutos
  if (millis() - lastSendTime >= sendInterval) {
    lastSendTime = millis();
    
    // Leer sensores
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    
    // Validar
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("❌ Error leyendo DHT22");
      return;
    }
    
    Serial.print("📊 T:");
    Serial.print(temperature);
    Serial.print("°C H:");
    Serial.print(humidity);
    Serial.println("%");
    
    // Crear JSON
    StaticJsonDocument<200> doc;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["wind_speed_ms"] = 0;
    doc["total_rainfall"] = 0;
    
    // Enviar
    HTTPClient http;
    http.begin(apiUrl);
    http.addHeader("Content-Type", "application/json");
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpCode = http.POST(jsonString);
    
    if (httpCode == 201) {
      Serial.println("✅ Datos enviados a la API");
    } else {
      Serial.print("❌ Error HTTP: ");
      Serial.println(httpCode);
    }
    
    http.end();
  }
  
  delay(1000);
}
```

---

## 🔟 RESUMEN

### Flujo Completo:
```
1. Crear estación (POST /api/stations/)
   ↓
2. Conectar ESP32 a WiFi
   ↓
3. Leer sensores (DHT22, etc)
   ↓
4. Validar datos
   ↓
5. Enviar POST a /api/stations/{id}/data
   ↓
6. API guarda en PostgreSQL
   ↓
7. Frontend muestra en Dashboard/Mapa/Gráficas
   ↓
8. Usuario exporta o analiza datos
```

### URLs Importantes:
```
Frontend:        http://localhost:8080
Backend:         http://localhost:8000
API Docs:        http://localhost:8000/docs
Database:        psql -U postgres weather_db
```

### Velocidad Recomendada:
```
Envío cada 5 minutos (300 segundos)
Máximo 288 lecturas por estación por día
Máximo 7,200 registros en 25 días
```

---

## 🆘 Troubleshooting

### "No se conecta a WiFi"
- Verificar SSID y contraseña
- Revisar que el ESP32 esté en el mismo rango de la red
- Usar `WiFi.status()` para debug

### "Error 404 en POST"
- La estación no existe → Crear primero
- URL incorrecta → Verificar station_id

### "Error 400 (Bad Request)"
- Datos no válidos → Revisar JSON
- Campos obligatorios faltando → Añadir temperatura y humedad

### "Datos no aparecen en Dashboard"
- Esperar a que la página se recargue
- Verificar en API: `curl http://localhost:8000/api/stations/`
- Ver logs del backend: `tail -f /tmp/backend.log`

### "Conexión rechazada"
- Backend no está corriendo → `ps aux | grep python`
- Firewall bloqueando → Permitir puerto 8000

---

**¡Listo! Ahora tus dispositivos pueden enviar datos a la aplicación.** 🚀

