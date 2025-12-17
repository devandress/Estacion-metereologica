// ============================================================
// 🌤️ Weather Station - Integración ESP32
// ============================================================
// 
// Archivo: WeatherStation_ESP32.ino
// Descripción: Código Arduino para leer sensores y enviar
//              datos a la API Weather Station
// 
// Requerimientos:
// - ESP32 (DevKit v1 o similar)
// - DHT22 (sensor temperatura/humedad)
// - Opcional: Anemómetro, Pluviómetro
// 
// Librerías necesarias:
// - DHT sensor library (by Adafruit)
// - HTTPClient
// - ArduinoJson
// 
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <time.h>

// ===== CONFIGURACIÓN =====

// WiFi
const char* SSID = "TU_RED_WIFI";                    // Tu red WiFi
const char* PASSWORD = "TU_CONTRASEÑA";              // Tu contraseña

// API
const char* API_HOST = "192.168.1.100";              // IP o dominio del servidor
const int API_PORT = 8000;                           // Puerto (normalmente 8000)
const char* STATION_ID = "ESP32_001";                // ID único de tu estación

// Sensores
#define DHT_PIN 4                                     // GPIO donde conectas el DHT22
#define DHT_TYPE DHT22                               // Tipo de sensor (DHT22 o DHT11)

// Intervalos
#define SEND_INTERVAL 300000                         // Enviar cada 5 minutos (ms)
#define SENSOR_READ_INTERVAL 2000                    // Leer sensor cada 2 segundos (ms)

// ===== VARIABLES GLOBALES =====

DHT dht(DHT_PIN, DHT_TYPE);
unsigned long lastSendTime = 0;
unsigned long lastSensorReadTime = 0;

// Valores medidos
float lastTemperature = 0;
float lastHumidity = 0;
int lastWindSpeed = 0;
int lastRainfall = 0;

// Estado
bool wifiConnected = false;
int sendAttempts = 0;
const int MAX_RETRIES = 3;

// ===== FUNCIONES AUXILIARES =====

void printLine(String msg = "") {
  if (msg == "") {
    Serial.println("════════════════════════════════════");
  } else {
    Serial.println(msg);
  }
}

void printSection(String title) {
  printLine();
  Serial.print("🔹 ");
  Serial.println(title);
  printLine();
}

void printOK(String msg) {
  Serial.print("✅ ");
  Serial.println(msg);
}

void printError(String msg) {
  Serial.print("❌ ");
  Serial.println(msg);
}

void printWarning(String msg) {
  Serial.print("⚠️  ");
  Serial.println(msg);
}

void printInfo(String msg) {
  Serial.print("ℹ️  ");
  Serial.println(msg);
}

// ===== WIFI =====

void setupWiFi() {
  printSection("WiFi Setup");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  
  printInfo("Conectando a WiFi...");
  printInfo(String("SSID: ") + SSID);
  
  int attempts = 0;
  int maxAttempts = 20;
  
  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    printOK("WiFi conectado!");
    printInfo(String("IP: ") + WiFi.localIP().toString());
    printInfo(String("SSID: ") + WiFi.SSID());
    printInfo(String("Señal: ") + WiFi.RSSI() + " dBm");
  } else {
    wifiConnected = false;
    printError("No se pudo conectar a WiFi");
    printWarning("Reintentando en 10 segundos...");
  }
}

bool checkWiFi() {
  if (WiFi.status() != WL_CONNECTED) {
    printWarning("WiFi desconectado. Reconectando...");
    WiFi.reconnect();
    delay(2000);
    return WiFi.status() == WL_CONNECTED;
  }
  return true;
}

// ===== SENSORES =====

void setupSensors() {
  printSection("Sensor Setup");
  
  dht.begin();
  printInfo(String("DHT22 en GPIO ") + DHT_PIN);
  
  delay(2000); // Esperar a que DHT se inicialice
  
  // Leer primera vez
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  if (isnan(temp) || isnan(humidity)) {
    printError("No se detecta DHT22");
    printWarning("Verifica las conexiones");
  } else {
    printOK("DHT22 detectado");
    printInfo(String("Temperatura: ") + temp + "°C");
    printInfo(String("Humedad: ") + humidity + "%");
  }
}

void readSensors() {
  if (millis() - lastSensorReadTime < SENSOR_READ_INTERVAL) {
    return;
  }
  
  lastSensorReadTime = millis();
  
  // Leer temperatura y humedad
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  if (!isnan(temp) && !isnan(humidity)) {
    lastTemperature = temp;
    lastHumidity = humidity;
    
    Serial.print("📊 T:");
    Serial.print(temp);
    Serial.print("°C H:");
    Serial.print(humidity);
    Serial.println("%");
  } else {
    printWarning("Error leyendo DHT22");
  }
  
  // Aquí puedes agregar lectura de otros sensores:
  // lastWindSpeed = readWindSpeed();      // Anemómetro
  // lastRainfall = readRainfall();        // Pluviómetro
}

// ===== ENVÍO DE DATOS =====

bool sendWeatherData() {
  printSection("Enviando Datos");
  
  if (!checkWiFi()) {
    printError("Sin conexión WiFi");
    return false;
  }
  
  printInfo(String("Estación: ") + STATION_ID);
  printInfo(String("Temperatura: ") + lastTemperature + "°C");
  printInfo(String("Humedad: ") + lastHumidity + "%");
  
  // Crear JSON
  StaticJsonDocument<256> doc;
  doc["temperature"] = lastTemperature;
  doc["humidity"] = lastHumidity;
  doc["wind_speed_ms"] = lastWindSpeed;
  doc["wind_gust_ms"] = lastWindSpeed * 1.2;
  doc["wind_direction_degrees"] = 180;
  doc["total_rainfall"] = lastRainfall;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  printInfo(String("JSON: ") + jsonString);
  
  // Preparar URL
  String url = String("http://") + API_HOST + ":" + API_PORT 
             + "/api/stations/" + STATION_ID + "/data";
  
  printInfo(String("URL: ") + url);
  
  // Enviar
  HTTPClient http;
  http.setTimeout(5000); // 5 segundos timeout
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-WeatherStation/1.0");
  
  int httpResponseCode = http.POST(jsonString);
  
  // Procesar respuesta
  if (httpResponseCode > 0) {
    printInfo(String("HTTP: ") + httpResponseCode);
    
    if (httpResponseCode == 201) {
      // Éxito
      String response = http.getString();
      printOK("Datos enviados correctamente");
      
      // Parsear respuesta
      StaticJsonDocument<128> responseDoc;
      deserializeJson(responseDoc, response);
      String recordId = responseDoc["id"];
      String createdAt = responseDoc["created_at"];
      
      printInfo(String("ID Registro: ") + recordId);
      printInfo(String("Timestamp: ") + createdAt);
      
      sendAttempts = 0;
      http.end();
      return true;
      
    } else if (httpResponseCode == 404) {
      printError("Estación no encontrada (404)");
      printWarning("Crea la estación primero");
      http.end();
      return false;
      
    } else if (httpResponseCode == 400) {
      String response = http.getString();
      printError(String("Datos inválidos (400): ") + response);
      http.end();
      return false;
      
    } else {
      String response = http.getString();
      printError(String("Error ") + httpResponseCode + ": " + response);
      http.end();
      return false;
    }
  } else {
    String error = http.errorToString(httpResponseCode);
    printError(String("Error: ") + error);
    http.end();
    return false;
  }
}

bool sendWithRetry() {
  for (int i = 0; i < MAX_RETRIES; i++) {
    if (sendWeatherData()) {
      return true;
    }
    if (i < MAX_RETRIES - 1) {
      printWarning(String("Reintentando (") + (i + 1) + "/" + (MAX_RETRIES - 1) + ")");
      delay(5000); // Esperar 5 segundos antes de reintentar
    }
  }
  return false;
}

// ===== SETUP =====

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  printLine();
  printLine("  🌤️ WEATHER STATION - ESP32");
  printLine();
  
  setupWiFi();
  setupSensors();
  
  printSection("Sistema Listo");
  printInfo(String("ID: ") + STATION_ID);
  printInfo(String("Intervalo: ") + (SEND_INTERVAL / 1000) + " segundos");
  printInfo(String("API: ") + API_HOST + ":" + API_PORT);
  printLine();
}

// ===== LOOP =====

void loop() {
  // Leer sensores continuamente
  readSensors();
  
  // Cada SEND_INTERVAL, enviar datos
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();
    
    Serial.println();
    
    if (checkWiFi()) {
      sendWithRetry();
    } else {
      printError("Sin WiFi, esperando reconexión...");
    }
    
    Serial.println();
  }
  
  delay(100);
}

// ===== CONEXIONES SENSOR =====
/*
ESP32 PIN Layout:
  
  DHT22 (Sensor Temperatura/Humedad):
    PIN 1 (VCC)     -> 3.3V ESP32
    PIN 2 (DATA)    -> GPIO 4 (DHT_PIN)
    PIN 3 (GND)     -> GND ESP32
    PIN 4 (NC)      -> No conectar
    (Opcional: Resistencia 4.7k entre DATA y VCC)
  
  Anemómetro (opcional):
    Cable A         -> GPIO 5
    Cable B         -> GND
    (Cuenta pulsos por minuto)
  
  Pluviómetro (opcional):
    Cable A         -> GPIO 12
    Cable B         -> GND
    (Cuenta volteos = 0.2793 mm por volteo)
  
  LED de Estado (opcional):
    Positivo        -> GPIO 25 (a través de resistencia 220Ω)
    Negativo        -> GND

Diagrama de conexión:
  
  3.3V ----[4.7k]----+---- GPIO 4 (DHT DATA)
                     |
                    DHT22
                     |
  GND ---------------+
*/

// ===== NOTAS =====
/*
1. Cambia SSID y PASSWORD con tus credenciales WiFi

2. Cambia API_HOST a la IP o dominio de tu servidor
   - Si es localhost: "127.0.0.1" (no funcionará en red local)
   - Si es en la misma red: "192.168.1.X"
   - Si es en la nube: "ejemplo.com"

3. Cambia STATION_ID a un identificador único
   - Ej: "ESP32_001", "BALCON_CASA", "INVERNADERO_01"

4. Los datos se envían cada 5 minutos (SEND_INTERVAL)
   - Puedes cambiar a 600000 (10 min), 900000 (15 min), etc.

5. En caso de error WiFi, reintenta en 10 segundos
   
6. En caso de error HTTP, reintenta hasta MAX_RETRIES veces

7. Abre el Monitor Serial (9600 baud) para ver debug

8. Verifica en http://localhost:8080 que aparezcan los datos
*/
