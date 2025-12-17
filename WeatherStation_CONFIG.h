// ============================================================
// 🌤️ CONFIGURACIÓN FÁCIL - WeatherStation_CONFIG.h
// ============================================================
//
// Archivo de configuración centralizado
// Solo edita los valores en la sección "CONFIGURACIÓN"
// El resto del código se actualiza automáticamente
//
// ============================================================

#ifndef WEATHER_STATION_CONFIG_H
#define WEATHER_STATION_CONFIG_H

// ===== ⚙️ CONFIGURACIÓN PRINCIPAL =====

// 🌐 SERVIDOR
// LOCAL (Raspberry en casa):
//   #define API_HOST "192.168.1.100"
//   #define API_PORT 8000
//   #define USE_HTTPS false

// PÚBLICO (Servidor online):
//   #define API_HOST "miestacion.com"
//   #define API_PORT 443
//   #define USE_HTTPS true

#define API_HOST "192.168.1.100"        // ← CAMBIAR AQUÍ
#define API_PORT 8000                    // ← CAMBIAR AQUÍ
#define USE_HTTPS false                  // ← CAMBIAR AQUÍ (true para HTTPS)

// 📡 WiFi
#define WIFI_SSID "MiRed"               // ← CAMBIAR AQUÍ (Tu red WiFi)
#define WIFI_PASS "MiContraseña"        // ← CAMBIAR AQUÍ (Tu contraseña)

// 🎯 ESTACIÓN
#define STATION_ID "ESP32_001"          // ← CAMBIAR AQUÍ (ID único)

// 🔌 HARDWARE
#define DHT_PIN 4                        // ← CAMBIAR AQUÍ si usas otro GPIO
#define DHT_TYPE DHT22                   // DHT22 o DHT11
#define LED_PIN 25                       // LED de estado (GPIO 25)

// ⏱️ INTERVALOS (en milisegundos)
#define SEND_INTERVAL 300000            // Enviar cada 5 minutos
#define SENSOR_READ_INTERVAL 2000       // Leer sensor cada 2 segundos
#define RETRY_DELAY 5000                // Esperar 5s entre reintentos
#define WIFI_TIMEOUT 10000              // Timeout WiFi 10s

// 🔄 REINTENTOS
#define MAX_RETRIES 3                    // Intentos para enviar
#define MAX_WIFI_ATTEMPTS 20             // Intentos para conectar WiFi

// 🔐 SEGURIDAD
#define ALLOW_INSECURE_SSL true          // true = aceptar certificados autofirmados

// ===== ✨ CARACTERÍSTICAS (opcional) =====

// Estos valores NO deben ser 0 si quieres usar estos sensores
#define ANEMOMETER_PIN 0                 // GPIO 5 para anemómetro (0 = desactivado)
#define RAIN_GAUGE_PIN 0                 // GPIO 12 para pluviómetro (0 = desactivado)

// ===== 📊 VALORES POR DEFECTO =====

// Si los sensores no responden, usar estos valores
#define DEFAULT_TEMPERATURE 20.0
#define DEFAULT_HUMIDITY 50.0
#define DEFAULT_WIND_SPEED 0.0

// ===== 🔧 GENERADAS AUTOMÁTICAMENTE =====
// No editar estas líneas (se actualizan automáticamente)

#if USE_HTTPS
  #define API_SCHEMA "https"
  #define API_URL (String(API_SCHEMA) + "://" + API_HOST + "/api/stations/" + STATION_ID + "/data")
#else
  #define API_SCHEMA "http"
  #define API_URL (String(API_SCHEMA) + "://" + API_HOST + ":" + API_PORT + "/api/stations/" + STATION_ID + "/data")
#endif

// ===== 📋 RESUMEN DE CONFIGURACIÓN =====
/*

CONFIGURACIÓN ACTUAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 SERVIDOR:
   Host:   192.168.1.100
   Puerto: 8000
   HTTPS:  No
   URL:    http://192.168.1.100:8000/api/stations/ESP32_001/data

📡 WiFi:
   Red:        MiRed
   Contraseña: [Oculta]

🎯 ESTACIÓN:
   ID:         ESP32_001
   Sensor:     DHT22 en GPIO 4
   LED:        GPIO 25

⏱️ INTERVALOS:
   Envío:      Cada 5 minutos (300 segundos)
   Lectura:    Cada 2 segundos
   Reintentos: 3 intentos con 5s de espera

🔌 SENSORES ADICIONALES:
   Anemómetro:  Desactivado
   Pluviómetro: Desactivado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EJEMPLOS DE CONFIGURACIÓN:

1️⃣ SERVIDOR LOCAL (Actual):
   #define API_HOST "192.168.1.100"
   #define API_PORT 8000
   #define USE_HTTPS false

2️⃣ SERVIDOR PÚBLICO (IP):
   #define API_HOST "123.45.67.89"
   #define API_PORT 80
   #define USE_HTTPS false

3️⃣ DOMINIO CON HTTPS (Recomendado):
   #define API_HOST "miestacion.com"
   #define API_PORT 443
   #define USE_HTTPS true

4️⃣ CON ANEMÓMETRO Y PLUVIÓMETRO:
   #define ANEMOMETER_PIN 5
   #define RAIN_GAUGE_PIN 12

*/

#endif // WEATHER_STATION_CONFIG_H
