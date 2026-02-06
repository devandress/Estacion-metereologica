/*
 * ESP32 Weather Station - Cloudflare + Duck DNS Integration
 * 
 * Envía datos de sensores meteorológicos a través de Cloudflare Tunnel
 * usando un subdominio de Duck DNS
 * 
 * Compatible con:
 * - Weather App webapp (FastAPI backend)
 * - Cloudflare Tunnel
 * - Duck DNS subdominio
 * 
 * Configurar las constantes WIFI_SSID, WIFI_PASS, DUCKDNS_URL, STATION_ID
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ========== CONFIGURACIÓN ==========

// WiFi de la escuela
const char* WIFI_SSID = "SchoolWiFi";
const char* WIFI_PASS = "tu-password-wifi";

// Duck DNS + Cloudflare
const char* DUCKDNS_DOMAIN = "weathermx.duckdns.org";
const char* API_URL = "https://api.weathermx.duckdns.org";
const char* DUCKDNS_TOKEN = "a64240d0-87b0-4173-a0ca-26b2117c7061";
const char* STATION_ID = "ESP32_ESCUELA_001";

// Intervalo de envío (milisegundos)
const unsigned long SEND_INTERVAL = 30000; // 30 segundos

// ========== VARIABLES GLOBALES ==========

unsigned long lastSendTime = 0;
WiFiClientSecure client;

// ========== CLASE PARA ENVIAR DATOS ==========

class WeatherAppClient {
private:
    String serverUrl;
    String stationId;
    
public:
    WeatherAppClient(String url, String id) 
        : serverUrl(url), stationId(id) {
        // Desabilitar validación de certificados (importante para HTTPS)
        client.setInsecure();
    }
    
    /**
     * Enviar datos de clima a la webapp
     * Parámetros opcionales - solo envía los que tengas
     */
    bool sendData(
        float temperature = -999,
        float humidity = -999,
        float pressure = -999,
        float wind_speed = -999,
        float wind_gust = -999,
        float wind_direction = -999,
        float rainfall = -999,
        float uv_index = -999,
        float solar_radiation = -999
    ) {
        HTTPClient https;
        String url = serverUrl + "/api/stations/" + stationId + "/data";
        
        // Crear JSON dinámico
        StaticJsonDocument<512> doc;
        
        // Solo agregar campos con valores válidos
        if (temperature > -999) doc["temperature"] = round(temperature * 100.0) / 100.0;
        if (humidity > -999) doc["humidity"] = round(humidity * 100.0) / 100.0;
        if (pressure > -999) doc["pressure"] = round(pressure * 100.0) / 100.0;
        if (wind_speed > -999) doc["wind_speed"] = round(wind_speed * 100.0) / 100.0;
        if (wind_gust > -999) doc["wind_gust"] = round(wind_gust * 100.0) / 100.0;
        if (wind_direction > -999) doc["wind_direction"] = round(wind_direction * 100.0) / 100.0;
        if (rainfall > -999) doc["rainfall"] = round(rainfall * 100.0) / 100.0;
        if (uv_index > -999) doc["uv_index"] = round(uv_index * 100.0) / 100.0;
        if (solar_radiation > -999) doc["solar_radiation"] = round(solar_radiation * 100.0) / 100.0;
        
        // Timestamp
        doc["timestamp"] = getTimestamp();
        
        String payload;
        serializeJson(doc, payload);
        
        Serial.println("\n🔵 Enviando datos...");
        Serial.print("URL: ");
        Serial.println(url);
        Serial.print("Payload: ");
        Serial.println(payload);
        
        // Enviar
        https.begin(client, url);
        https.addHeader("Content-Type", "application/json");
        
        int httpCode = https.POST(payload);
        String response = https.getString();
        
        https.end();
        
        // Procesar respuesta
        Serial.print("HTTP Code: ");
        Serial.println(httpCode);
        Serial.print("Response: ");
        Serial.println(response);
        
        if (httpCode == 201 || httpCode == 200) {
            Serial.println("✅ ÉXITO - Datos enviados a webapp");
            printWeatherSummary(temperature, humidity, wind_speed);
            return true;
        } else {
            Serial.print("❌ ERROR - Código: ");
            Serial.println(httpCode);
            return false;
        }
    }
    
    // Enviar con todos los datos (para máxima compatibilidad)
    bool sendFullData(
        float temperatura,
        float humedad,
        float rocio,
        float presion,
        float vientoMS,
        float rachaMS,
        float direccion,
        float lluvia,
        int tips = 0
    ) {
        HTTPClient https;
        String url = serverUrl + "/api/stations/" + stationId + "/data";
        
        StaticJsonDocument<512> doc;
        doc["temperature"] = temperatura;
        doc["humidity"] = humedad;
        doc["dew_point"] = rocio;
        doc["pressure"] = presion;
        doc["wind_speed_ms"] = vientoMS;
        doc["wind_speed_mph"] = vientoMS * 2.237;
        doc["wind_gust_ms"] = rachaMS;
        doc["wind_gust_mph"] = rachaMS * 2.237;
        doc["wind_direction_degrees"] = direccion;
        doc["wind_direction_name"] = getWindDirection(direccion);
        doc["total_rainfall"] = lluvia;
        doc["total_tips"] = tips;
        doc["timestamp"] = getTimestamp();
        
        String payload;
        serializeJson(doc, payload);
        
        Serial.println("\n🔵 Enviando datos completos...");
        Serial.print("URL: ");
        Serial.println(url);
        
        https.begin(client, url);
        https.addHeader("Content-Type", "application/json");
        
        int httpCode = https.POST(payload);
        https.end();
        
        if (httpCode == 201 || httpCode == 200) {
            Serial.println("✅ ÉXITO - Datos completos enviados");
            return true;
        } else {
            Serial.print("❌ ERROR: ");
            Serial.println(httpCode);
            return false;
        }
    }
    
private:
    String getWindDirection(float degrees) {
        if (degrees >= 337.5 || degrees < 22.5) return "N";
        if (degrees >= 22.5 && degrees < 67.5) return "NE";
        if (degrees >= 67.5 && degrees < 112.5) return "E";
        if (degrees >= 112.5 && degrees < 157.5) return "SE";
        if (degrees >= 157.5 && degrees < 202.5) return "S";
        if (degrees >= 202.5 && degrees < 247.5) return "SW";
        if (degrees >= 247.5 && degrees < 292.5) return "W";
        return "NW";
    }
    
    String getTimestamp() {
        time_t now = time(nullptr);
        struct tm* timeinfo = localtime(&now);
        char buffer[30];
        strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", timeinfo);
        return String(buffer);
    }
    
    void printWeatherSummary(float temp, float humidity, float wind) {
        Serial.println("\n📊 Resumen de datos enviados:");
        if (temp > -999) {
            Serial.print("   🌡️  Temperatura: ");
            Serial.print(temp);
            Serial.println("°C");
        }
        if (humidity > -999) {
            Serial.print("   💧 Humedad: ");
            Serial.print(humidity);
            Serial.println("%");
        }
        if (wind > -999) {
            Serial.print("   💨 Viento: ");
            Serial.print(wind);
            Serial.println(" m/s");
        }
    }
};

// ========== FUNCIONES DE UTILIDAD ==========

void setupWiFi() {
    Serial.println("\n📡 Conectando a WiFi...");
    Serial.print("SSID: ");
    Serial.println(WIFI_SSID);
    
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ WiFi conectado!");
        Serial.print("IP local: ");
        Serial.println(WiFi.localIP());
        Serial.print("RSSI: ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
    } else {
        Serial.println("\n❌ Error conectando a WiFi");
    }
}

void printSystemInfo() {
    Serial.println("\n╔════════════════════════════════════════╗");
    Serial.println("║   ESP32 Weather Station Configuration  ║");
    Serial.println("╚════════════════════════════════════════╝");
    Serial.print("WiFi SSID: ");
    Serial.println(WIFI_SSID);
    Serial.print("Duck DNS Domain: ");
    Serial.println(DUCKDNS_DOMAIN);
    Serial.print("API URL: ");
    Serial.println(API_URL);
    Serial.print("Station ID: ");
    Serial.println(STATION_ID);
    Serial.print("Send Interval: ");
    Serial.print(SEND_INTERVAL / 1000);
    Serial.println(" segundos");
    Serial.println("╔════════════════════════════════════════╗\n");
}

// ========== CLIENTE GLOBAL ==========

WeatherAppClient appClient(API_URL, STATION_ID);

// ========== SETUP Y LOOP ==========

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    printSystemInfo();
    setupWiFi();
    
    // Configurar zona horaria para timestamps
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

void loop() {
    // Verificar conexión WiFi
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("⚠️  WiFi desconectado, reconectando...");
        setupWiFi();
        delay(5000);
        return;
    }
    
    // Enviar datos cada SEND_INTERVAL
    if (millis() - lastSendTime >= SEND_INTERVAL) {
        lastSendTime = millis();
        
        Serial.println("\n═════════════════════════════════════════");
        Serial.println("📤 Hora de enviar datos");
        Serial.println("═════════════════════════════════════════");
        
        // ========== OBTENER DATOS DE TUS SENSORES ==========
        // Reemplaza estas funciones con tus sensores reales
        
        float temperatura = readTemperature();      // DHT22, BME280, etc
        float humedad = readHumidity();             // DHT22, BME280, etc
        float presion = readPressure();             // BME280, BMP280, etc
        float viento = readWindSpeed();             // Anemómetro
        float racha = readWindGust();               // Anemómetro con racha
        float direccion = readWindDirection();      // Veleta
        float lluvia = readRainfall();              // Pluviómetro
        
        // ========== ENVIAR DATOS SIMPLIFICADOS ==========
        // (Si no tienes todos los sensores)
        
        appClient.sendData(
            temperatura,
            humedad,
            presion,
            viento,
            racha,
            direccion,
            lluvia
        );
        
        // ========== O ENVIAR DATOS COMPLETOS ==========
        // (Si tienes más información)
        
        /*
        appClient.sendFullData(
            temperatura,
            humedad,
            temperatura - 5.0,  // rocio (aproximado)
            presion,
            viento,
            racha,
            direccion,
            lluvia,
            0  // tips (pluviómetro)
        );
        */
    }
}

// ========== FUNCIONES DE LECTURA DE SENSORES ==========
// Reemplaza estas con tus sensores reales

float readTemperature() {
    // TODO: Conectar DHT22 o BME280
    return 22.5 + random(-5, 5);
}

float readHumidity() {
    // TODO: Conectar DHT22 o BME280
    return 60.0 + random(-10, 10);
}

float readPressure() {
    // TODO: Conectar BMP280 o BME280
    return 1013.25;
}

float readWindSpeed() {
    // TODO: Conectar anemómetro
    return 3.5 + random(0, 10) / 10.0;
}

float readWindGust() {
    // TODO: Conectar anemómetro con racha
    return 5.2 + random(0, 10) / 10.0;
}

float readWindDirection() {
    // TODO: Conectar veleta digital
    return random(0, 360);
}

float readRainfall() {
    // TODO: Conectar pluviómetro
    return 0.5 + random(0, 10) / 10.0;
}

// ========== FIN DEL CÓDIGO ==========
