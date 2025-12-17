"""
Integración ESP32 para Weather Station WebApp
==============================================

Este módulo proporciona una clase para enviar datos desde ESP32
a la webapp de estaciones meteorológicas.

Uso en Arduino/ESP32:
    Similar al código Python, pero en C++
"""

#include <HTTPClient.h>
#include <WiFi.h>
#include <ArduinoJson.h>

class WeatherAppClient {
private:
    String serverUrl;
    String stationId;
    WiFiClient client;
    
public:
    WeatherAppClient(String url, String id) 
        : serverUrl(url), stationId(id) {}
    
    /**
     * Enviar datos de clima a la webapp
     * 
     * @param temperatura Temperatura en Celsius
     * @param humedad Humedad relativa en %
     * @param rocio Punto de rocío en Celsius
     * @param vientoMS Velocidad del viento en m/s
     * @param rachaMS Racha máxima en m/s
     * @param direccion Dirección en grados (0-360)
     * @param lluvia Lluvia total acumulada en mm
     * @param tips Número de tips del pluviómetro
     */
    bool sendData(
        float temperatura,
        float humedad,
        float rocio,
        float vientoMS,
        float rachaMS,
        float direccion,
        float lluvia,
        int tips
    ) {
        HTTPClient https;
        String url = serverUrl + "/api/stations/" + stationId + "/data";
        
        // Crear JSON
        StaticJsonDocument<512> doc;
        doc["station_id"] = stationId;
        doc["temperature"] = temperatura;
        doc["humidity"] = humedad;
        doc["dew_point"] = rocio;
        doc["wind_speed_ms"] = vientoMS;
        doc["wind_speed_mph"] = vientoMS * 2.237;
        doc["wind_gust_ms"] = rachaMS;
        doc["wind_gust_mph"] = rachaMS * 2.237;
        doc["wind_direction_degrees"] = direccion;
        doc["wind_direction_name"] = getWindDirection(direccion);
        doc["total_rainfall"] = lluvia;
        doc["total_tips"] = tips;
        doc["rain_rate_mm_per_hour"] = 0.0;
        doc["rain_rate_in_per_hour"] = 0.0;
        
        String payload;
        serializeJson(doc, payload);
        
        https.begin(client, url);
        https.addHeader("Content-Type", "application/json");
        
        int httpCode = https.POST(payload);
        https.end();
        
        if (httpCode == 201) {
            Serial.println("✅ Datos enviados a webapp");
            return true;
        } else {
            Serial.printf("❌ Error: %d - %s\n", httpCode, https.getString().c_str());
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
};

// ==============================================
// EJEMPLO DE USO EN rx.ino
// ==============================================

/*
En tu setup():
    WeatherAppClient appClient("http://192.168.1.100", "ESP32_ESTACION_01");

En tu loop (después de gestionarEnvioWU()):
    // Enviar también a nuestra webapp
    appClient.sendData(
        datosRecibidos.temperatura,
        datosRecibidos.humedad,
        datosRecibidos.puntoRocio,
        datosRecibidos.windSpeedMs,
        datosRecibidos.windGustMs,
        datosRecibidos.windDirectionDegrees,
        datosRecibidos.totalRainfall,
        datosRecibidos.totalTips
    );
*/
