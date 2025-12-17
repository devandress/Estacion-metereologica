// ===== INTEGRACIÓN CON WEATHER WEBAPP =====
// Añade esto a tu rx.ino para enviar datos a la webapp

class WeatherAppClient {
private:
    String serverUrl;
    String stationId;
    
public:
    WeatherAppClient(String url, String id) 
        : serverUrl(url), stationId(id) {}
    
    bool sendData(
        float temperatura,
        float humedad,
        float rocio,
        float vientoMS,
        float rachaMS,
        float direccion,
        float lluvia,
        int tips,
        const char* direccionNombre
    ) {
        if(!WiFi.isConnected()) return false;
        
        HTTPClient http;
        String url = serverUrl + "/api/stations/" + stationId + "/data";
        
        // Crear JSON manualmente (sin ArduinoJson para optimizar memoria)
        String payload = "{";
        payload += "\"station_id\":\"" + stationId + "\",";
        payload += "\"temperature\":" + String(temperatura, 2) + ",";
        payload += "\"humidity\":" + String(humedad, 1) + ",";
        payload += "\"dew_point\":" + String(rocio, 2) + ",";
        payload += "\"wind_speed_ms\":" + String(vientoMS, 2) + ",";
        payload += "\"wind_speed_mph\":" + String(vientoMS * 2.237, 2) + ",";
        payload += "\"wind_gust_ms\":" + String(rachaMS, 2) + ",";
        payload += "\"wind_gust_mph\":" + String(rachaMS * 2.237, 2) + ",";
        payload += "\"wind_direction_degrees\":" + String((int)direccion) + ",";
        payload += "\"wind_direction_name\":\"" + String(direccionNombre) + "\",";
        payload += "\"total_rainfall\":" + String(lluvia, 2) + ",";
        payload += "\"total_tips\":" + String(tips) + ",";
        payload += "\"rain_rate_mm_per_hour\":0.0,";
        payload += "\"rain_rate_in_per_hour\":0.0";
        payload += "}";
        
        http.begin(url);
        http.addHeader("Content-Type", "application/json");
        
        int httpCode = http.POST(payload);
        http.end();
        
        if(httpCode == 201) {
            Serial.println("✅ Datos enviados a webapp");
            return true;
        } else {
            Serial.printf("❌ Webapp error: %d\n", httpCode);
            return false;
        }
    }
};

// Variable global
WeatherAppClient* appClient = nullptr;

// Añadir en setup():
void setupWeatherApp() {
    // Reemplazar con IP de tu Raspberry Pi
    appClient = new WeatherAppClient("http://192.168.1.100", "ESP32_ESTACION_001");
    Serial.println("✅ Weather App Client inicializado");
}

// Llamar después de gestionarEnvioWU() en loop():
void enviarAWeatherApp() {
    if(!appClient || !wifiConectado) return;
    
    appClient->sendData(
        datosRecibidos.temperatura,
        datosRecibidos.humedad,
        datosRecibidos.puntoRocio,
        datosRecibidos.windSpeedMs,
        datosRecibidos.windGustMs,
        datosRecibidos.windDirectionDegrees,
        datosRecibidos.totalRainfall,
        datosRecibidos.totalTips,
        datosRecibidos.direccionViento
    );
}
