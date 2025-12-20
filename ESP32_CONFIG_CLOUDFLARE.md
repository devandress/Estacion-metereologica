# ESP32 Configuration para Cloudflare Tunnel + Raspberry Pi

## 📝 Configuración necesaria

Actualiza estos valores en tu `ESP32_Integration.h`:

```cpp
#ifndef ESP32_INTEGRATION_H
#define ESP32_INTEGRATION_H

// ============================================
// 🌐 WIFI Configuration
// ============================================
#define WIFI_SSID "TU_RED_WIFI"
#define WIFI_PASSWORD "TU_CONTRASEÑA"

// ============================================
// 🌍 API Configuration - CLOUDFLARE TUNNEL
// ============================================

// OPCIÓN 1: Usar Cloudflare Tunnel (RECOMENDADO)
#define API_HOST "tu-dominio.com"        // Tu dominio Cloudflare
#define API_PORT 443                      // HTTPS
#define API_PATH "/api/stations"
#define USE_HTTPS true

// OPCIÓN 2: Red local (si ESP32 está en la misma red WiFi que Raspberry)
// #define API_HOST "192.168.1.x"        // IP de Raspberry Pi
// #define API_PORT 8000                  // Puerto del backend
// #define API_PATH "/api/stations"
// #define USE_HTTPS false

// ============================================
// 🆔 Station Configuration
// ============================================
#define STATION_ID "ESP32_001"
#define STATION_NAME "Weather Station ESP32"
#define STATION_LATITUDE 40.4168
#define STATION_LONGITUDE -3.7038
#define STATION_ALTITUDE 646

// ============================================
// ⏱️ Timing Configuration
// ============================================
#define SEND_INTERVAL 60000              // Enviar cada 60 segundos (ms)
#define SENSOR_READ_INTERVAL 5000        // Leer sensores cada 5 segundos
#define TIMEOUT_MS 10000                 // Timeout conexión HTTP
#define MAX_RETRIES 3                    // Reintentos si falla

// ============================================
// 📊 Sensor Configuration
// ============================================
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define BMP_ADDR 0x76
#define WIND_SPEED_PIN 23
#define WIND_DIR_PIN 34
#define RAIN_PIN 35

// ============================================
// 🔐 Certificados SSL (para HTTPS)
// ============================================
// Necesario si USE_HTTPS = true
const char* root_ca = R"(-----BEGIN CERTIFICATE-----
MIIFWjCCA0ICCQDvG6anK3TjYDANBgkqhkiG9w0BAQsFADBuMQswCQYDVQQGEwJF
UzELMAkGA1UECAgMAkNBMQswCQYDVQQHDAJNRDELMAkGA1UECgwCVUExCzAJBgNV
BAsMAkFXMQswCQYDVQQDDAJDQzEpMCcGCSqGSIb3DQEJARYaY29udGFjdG9AY2xv
dWRmbGFyZS5jb20wHhcNMjQwMTAxMDAwMDAwWhcNMjUwMTAxMDAwMDAwWjBuMQsw
CQYDVQQGEwJFUzELMAkGA1UECAgMAkNBMQswCQYDVQQHDAJNRDELMAkGA1UECgwC
VUExCzAJBgNVBAsMAkFXMQswCQYDVQQDDAJDQzEpMCcGCSqGSIb3DQEJARYaY29u
dGFjdG9AY2xvdWRmbGFyZS5jb20wggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIK
AoICAQDn7x...
-----END CERTIFICATE-----
)";

#endif // ESP32_INTEGRATION_H
```

---

## 🔑 Obtener valores necesarios

### 1️⃣ Tu dominio Cloudflare

```bash
# En la Raspberry Pi, después de crear el túnel:
cloudflared tunnel list

# Verás algo como:
# UUID: 12a3b4c5-6d78-9e0f-1234-56789abcdef0
# Name: raspberry-weather
# Credentials: /home/pi/.cloudflared/12a3b4c5-6d78-9e0f-1234-56789abcdef0.json
```

### 2️⃣ Configurar DNS en Cloudflare

1. Ir a: https://dash.cloudflare.com/
2. Seleccionar tu dominio
3. DNS → Records
4. Crear registro CNAME:
   - Name: `weather` (o el que quieras)
   - Target: `tu-dominio.com`
5. Resultado: `https://weather.tu-dominio.com`

### 3️⃣ Coordenadas GPS

```cpp
// Madrid
#define STATION_LATITUDE 40.4168
#define STATION_LONGITUDE -3.7038

// Barcelona
#define STATION_LATITUDE 41.3851
#define STATION_LONGITUDE 2.1734

// Valencia
#define STATION_LATITUDE 39.4699
#define STATION_LONGITUDE -0.3763
```

---

## 📡 Opción: Red Local (Misma WiFi)

Si el ESP32 y Raspberry Pi están en la **misma red WiFi**:

```cpp
// Encontrar IP de Raspberry Pi:
// En la Raspberry Pi, ejecutar:
hostname -I

// Resultado algo como: 192.168.1.145

// Entonces en ESP32:
#define API_HOST "192.168.1.145"        // IP de tu Raspberry Pi
#define API_PORT 8000                    // Puerto backend
#define USE_HTTPS false                  // No necesita SSL en local
```

---

## 🧪 Test desde Arduino IDE

```cpp
// Test rápido - copiar en setup() y cargar en ESP32

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    // Test 1: WiFi
    Serial.println("1. Conectando a WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ WiFi conectado!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\n❌ WiFi fallido!");
    }
    
    // Test 2: API
    Serial.println("\n2. Probando conexión a API...");
    HTTPClient http;
    String url = String("http") + (USE_HTTPS ? "s" : "") + "://" + 
                 API_HOST + ":" + API_PORT + "/api/health";
    http.begin(url.c_str());
    int httpCode = http.GET();
    if (httpCode == 200) {
        Serial.println("✅ API respondiendo!");
    } else {
        Serial.print("❌ Error: ");
        Serial.println(httpCode);
    }
    http.end();
}

void loop() {}
```

---

## 🔒 Certificados SSL

Si usas Cloudflare Tunnel con HTTPS, necesitas el certificado raíz.

### Obtener certificado:

```bash
# En tu laptop:
openssl s_client -connect tu-dominio.com:443 -showcerts

# Copiar el certificado raíz (primero certificado entre -----BEGIN y -----END)
# Pegarlo en ESP32_Integration.h en la variable root_ca
```

O descargarlo desde:
```
https://www.cloudflare.com/ssl/
```

---

## 📝 Plantilla para CargarDatos

```cpp
// En tu main.cpp o donde envíes datos

#include "ESP32_Integration.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

void sendWeatherData(float temp, float humidity, float pressure, 
                     float wind_speed, int wind_dir, float rain) {
    
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ WiFi no conectado");
        return;
    }
    
    HTTPClient http;
    
    // Construir URL
    String protocol = USE_HTTPS ? "https" : "http";
    String url = protocol + "://" + API_HOST + ":" + API_PORT + 
                 "/api/stations/" + STATION_ID + "/data";
    
    // Iniciar conexión
    http.begin(url.c_str(), root_ca);  // root_ca solo si HTTPS
    http.addHeader("Content-Type", "application/json");
    
    // Crear JSON
    StaticJsonDocument<512> doc;
    doc["temperature"] = temp;
    doc["humidity"] = humidity;
    doc["pressure"] = pressure;
    doc["wind_speed"] = wind_speed;
    doc["wind_direction"] = wind_dir;
    doc["rain"] = rain;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Enviar
    int httpCode = http.POST(jsonString);
    
    if (httpCode == 200) {
        Serial.print("✅ Datos enviados: ");
        Serial.println(jsonString);
    } else {
        Serial.print("❌ Error: ");
        Serial.println(httpCode);
    }
    
    http.end();
}
```

---

## 🚨 Troubleshooting ESP32

### "No puedo conectarme a Cloudflare"

1. Verificar WiFi está conectado: `Serial.println(WiFi.localIP());`
2. Verificar que dominio es correcto
3. Verificar que Cloudflare Tunnel está activo en Raspberry: `sudo systemctl status weather-tunnel`
4. Usar URL HTTP local en lugar de HTTPS para debug

### "Errores SSL/TLS"

1. Usar HTTP local primero (sin SSL)
2. Luego agregar certificado correcto
3. O usar Cloudflare Tunnel que maneja SSL automáticamente

### "Timeout en conexión"

1. Aumentar `TIMEOUT_MS` a 15000
2. Verificar que red es estable
3. Verificar que API backend está respondiendo

---

## 📋 Checklist antes de cargar

- [ ] WiFi SSID y contraseña correctos
- [ ] Dominio Cloudflare en `API_HOST`
- [ ] Coordenadas GPS actualizadas
- [ ] `STATION_ID` único
- [ ] HTTPS habilitado con certificado correcto
- [ ] Testado conexión HTTP local primero
- [ ] Backend en Raspberry Pi corriendo
- [ ] Cloudflare Tunnel activo

---

## 🎯 Flujo completo

```
1. Cargar ESP32 con configuración
   ↓
2. ESP32 se conecta a WiFi
   ↓
3. ESP32 envía datos a https://tu-dominio.com/api/stations/ESP32_001/data
   ↓
4. Cloudflare Tunnel recibe y envía a Raspberry Pi local
   ↓
5. Nginx en Raspberry Pi (:8080) recibe
   ↓
6. FastAPI Backend en Raspberry Pi (:8000) procesa
   ↓
7. PostgreSQL guarda datos en Raspberry Pi
   ↓
8. Dashboard en https://tu-dominio.com muestra datos en VIVO
```

---

**Documento de referencia ESP32**
**Última actualización**: 19 Dic 2025
