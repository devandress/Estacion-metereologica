# 🌐 ESP32 + Cloudflare + Duck DNS - Guía Completa

**Cómo conectar tu ESP32 a la webapp usando Cloudflare Tunnel y Duck DNS subdomain**

---

## 🎯 ¿Qué vamos a hacer?

```
ESP32 (en cualquier red)
   ↓
Duck DNS (subdominio dinámico)
   ↓
Cloudflare Tunnel (sin puertos expuestos)
   ↓
Tu webapp en raspberry/internet
   ↓
Dashboard viendo datos en vivo ✅
```

---

## 📋 PASO 1: Configurar Duck DNS (5 minutos)

### 1.1 Crear cuenta en Duck DNS

1. Ir a: https://www.duckdns.org/
2. Hacer login (recomendado usar Google)
3. En la página principal, ingresa tu subdominio favorito

```
Ejemplo:
tu-escuela-weather.duckdns.org
estacion-temperatura.duckdns.org
raspberry-weather-app.duckdns.org
```

4. Click en "Add Domain"
5. **Importante:** Copiar tu TOKEN (verás en la página)
   ```
   Token: a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
   ```

### 1.2 Obtener IP actual

Duck DNS necesita tu IP. Puedes:

**Opción A: Automática (Recomendado)**
```bash
# Desde Raspberry Pi
curl -u "tu-subdominio:tu-token" https://www.duckdns.org/update?domains=tu-subdominio&token=tu-token&ip=

# Ejemplo
curl -u "estacion-temperatura:a1b2c3d4" https://www.duckdns.org/update?domains=estacion-temperatura&token=a1b2c3d4&ip=
```

**Opción B: Crear script automático**
```bash
# /home/andy/update_duckdns.sh
#!/bin/bash
curl -u "tu-subdominio:tu-token" https://www.duckdns.org/update?domains=tu-subdominio&token=tu-token&ip=
```

Ejecutar cada 5 minutos:
```bash
crontab -e
*/5 * * * * /home/andy/update_duckdns.sh
```

---

## 📋 PASO 2: Configurar Cloudflare Tunnel (10 minutos)

### 2.1 Crear cuenta Cloudflare

1. Ir a: https://dash.cloudflare.com/sign-up
2. Registrarse (gratis)
3. Agregar tu dominio Duck DNS:
   - Click "Add a site"
   - Ingresar: `estacion-temperatura.duckdns.org`
   - Copiar nameservers

### 2.2 Actualizar nameservers en Duck DNS

1. Volver a Duck DNS
2. En tu dominio, busca "Nameservers"
3. Agregar los nameservers de Cloudflare

### 2.3 Instalar Cloudflare Tunnel

En Raspberry Pi:
```bash
bash setup_cloudflare.sh

# O manualmente
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb
```

### 2.4 Autenticarse
```bash
cloudflared login
```

Te abrirá navegador. Inicia sesión y autoriza.

### 2.5 Crear túnel
```bash
cloudflared tunnel create weather-app
```

### 2.6 Configurar rutas
```bash
cloudflared tunnel route dns weather-app estacion-temperatura.duckdns.org
cloudflared tunnel route dns weather-app api.estacion-temperatura.duckdns.org
```

### 2.7 Crear config.yml

```bash
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: weather-app
credentials-file: ~/.cloudflared/weather-app.json

ingress:
  - hostname: api.estacion-temperatura.duckdns.org
    service: http://localhost:8000
  - hostname: estacion-temperatura.duckdns.org
    service: http://localhost:8081
  - service: http_status:404
EOF
```

Reemplaza `estacion-temperatura` con tu subdominio.

### 2.8 Iniciar túnel
```bash
cloudflared tunnel run weather-app
```

---

## 📋 PASO 3: Configurar URL en Weather App

```bash
bash setup_api_url.sh

# O editar manualmente
nano .env
```

Cambiar:
```
API_URL=https://api.estacion-temperatura.duckdns.org
```

---

## 📋 PASO 4: Código ESP32

### 4.1 Usar código actualizado

```cpp
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
        
        StaticJsonDocument<512> doc;
        doc["temperature"] = temperatura;
        doc["humidity"] = humedad;
        doc["dew_point"] = rocio;
        doc["wind_speed_ms"] = vientoMS;
        doc["wind_gust_ms"] = rachaMS;
        doc["wind_direction_degrees"] = direccion;
        doc["total_rainfall"] = lluvia;
        doc["total_tips"] = tips;
        
        String payload;
        serializeJson(doc, payload);
        
        https.begin(client, url);
        https.addHeader("Content-Type", "application/json");
        
        int httpCode = https.POST(payload);
        
        if (httpCode == 201 || httpCode == 200) {
            Serial.println("✅ Datos enviados a webapp");
            Serial.println(url);
            return true;
        } else {
            Serial.printf("❌ Error: %d\n", httpCode);
            return false;
        }
        
        https.end();
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
```

### 4.2 En tu rx.ino o main sketch

```cpp
// Configuración
const char* ssid = "SchoolWiFi";
const char* password = "tu-password";
const char* duckDnsUrl = "https://estacion-temperatura.duckdns.org";
const char* stationId = "ESP32_ESCUELA_001";

// Cliente
WeatherAppClient appClient(duckDnsUrl, stationId);

void setup() {
    Serial.begin(115200);
    
    // Conectar WiFi
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    
    Serial.println("\n✅ WiFi conectado!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
}

void loop() {
    // Obtener datos de tus sensores
    float temp = obtenerTemperatura();
    float humedad = obtenerHumedad();
    float viento = obtenerViento();
    float lluvia = obtenerLluvia();
    
    // Enviar a webapp
    appClient.sendData(
        temp,           // temperatura
        humedad,        // humedad
        temp - 5,       // rocio (aproximado)
        viento,         // viento m/s
        viento * 1.5,   // racha m/s
        180,            // dirección (grados)
        lluvia,         // lluvia mm
        0               // tips
    );
    
    delay(30000); // Enviar cada 30 segundos
}
```

---

## 🔧 PASO 5: Instalación de Servicios (Startup Automático)

### 5.1 Crear servicio para Cloudflare

```bash
sudo bash install_services.sh
```

### 5.2 Iniciar servicios

```bash
sudo systemctl start weather-app
sudo systemctl start cloudflare-tunnel
```

### 5.3 Verificar

```bash
sudo systemctl status cloudflare-tunnel
```

Debe mostrar: `Active (running)`

---

## ✅ PASO 6: Validación

### 6.1 Probar desde ESP32

```cpp
// En serial monitor del ESP32, verás:
✅ Datos enviados a webapp
https://api.estacion-temperatura.duckdns.org/api/stations/ESP32_ESCUELA_001/data
```

### 6.2 Probar desde navegador

```
https://estacion-temperatura.duckdns.org
```

Verás el dashboard con datos en vivo.

### 6.3 Probar API directamente

```bash
# Desde cualquier lugar
curl https://api.estacion-temperatura.duckdns.org/api/stations

# Enviar datos de prueba
curl -X POST https://api.estacion-temperatura.duckdns.org/api/stations/ESP32_TEST/data \
  -H "Content-Type: application/json" \
  -d '{"temperature": 25.5, "humidity": 60}'
```

---

## 🐛 Troubleshooting

### "No puedo conectar desde ESP32"

1. Verificar WiFi en ESP32:
   ```cpp
   Serial.println(WiFi.status());
   // 3 = conectado OK
   ```

2. Verificar URL es correcta:
   ```cpp
   String url = "https://api.estacion-temperatura.duckdns.org";
   Serial.println(url);
   ```

3. Verificar Cloudflare túnel está corriendo:
   ```bash
   sudo systemctl status cloudflare-tunnel
   ```

### "Duck DNS dice que la IP es incorrecta"

```bash
# Forzar actualización
curl -u "tu-subdominio:tu-token" https://www.duckdns.org/update?domains=tu-subdominio&token=tu-token&ip=8.8.8.8
```

### "Cloudflare dice 'tunnel not found'"

```bash
# Verificar túneles
cloudflared tunnel list

# Si no existe, crear
cloudflared tunnel create weather-app
```

### "Error 401/403 en ESP32"

- Verificar URL es HTTPS (no HTTP)
- Verificar subdominio es correcto
- Verificar Cloudflare está activo

### "No veo datos en dashboard"

1. Verificar backend está corriendo:
   ```bash
   sudo systemctl status weather-app
   ```

2. Ver logs:
   ```bash
   sudo journalctl -u weather-app -f
   ```

3. Verificar .env tiene URL correcta:
   ```bash
   cat .env | grep API_URL
   ```

---

## 📊 Arquitectura Final

```
┌──────────────────────┐
│   ESP32 Sensor       │
│  (en red escuela)    │
└──────────┬───────────┘
           │ WiFi (SchoolWiFi)
           ↓
┌──────────────────────────────────┐
│   Duck DNS Subdominio            │
│  estacion-temperatura.duckdns.org │
└──────────┬───────────────────────┘
           │ Resolución DNS
           ↓
┌──────────────────────────────────┐
│   Cloudflare Tunnel              │
│  (Encriptado, sin puertos)       │
└──────────┬───────────────────────┘
           │ HTTPS/SSL gratis
           ↓
┌──────────────────────────────────┐
│   Raspberry Pi (en red escuela)  │
│  Backend (8000)                  │
│  Frontend (8081)                 │
└──────────────────────────────────┘
           │
           ↓
┌──────────────────────────────────┐
│   Dashboard en Vivo              │
│  https://estacion-temperatura...  │
│  Ver datos en tiempo real ✅     │
└──────────────────────────────────┘
```

---

## 🎯 Comandos Rápidos

```bash
# Ver estado de todo
sudo systemctl status weather-app
sudo systemctl status cloudflare-tunnel

# Ver logs
sudo journalctl -u weather-app -f
sudo journalctl -u cloudflare-tunnel -f

# Reiniciar
sudo systemctl restart cloudflare-tunnel

# Testear conexión
curl https://estacion-temperatura.duckdns.org

# Actualizar Duck DNS manualmente
curl -u "tu-subdominio:tu-token" https://www.duckdns.org/update?domains=tu-subdominio&token=tu-token&ip=
```

---

## 📝 Resumen

| Paso | Componente | Tiempo | Resultado |
|------|-----------|--------|-----------|
| 1 | Duck DNS | 5 min | Subdominio dinámico |
| 2 | Cloudflare | 10 min | Túnel seguro |
| 3 | Weather App Config | 2 min | URL configurada |
| 4 | ESP32 Código | 5 min | Listo para enviar |
| 5 | Servicios systemd | 5 min | Inicio automático |
| 6 | Validación | 3 min | Todo funcionando |
| **TOTAL** | | **30 min** | **ESP32 + Duck DNS + Cloudflare ✅** |

---

## 🚀 Ventajas de esta Setup

✅ **IP dinámica:** Duck DNS actualiza automáticamente  
✅ **Acceso global:** Cloudflare expone sin puertos  
✅ **Seguro:** HTTPS/SSL gratis de Cloudflare  
✅ **Confiable:** Funciona en cualquier red (escuela, casa, móvil)  
✅ **Gratis:** Duck DNS + Cloudflare son gratuitos  
✅ **Fácil:** Setup en 30 minutos  

---

Versión: 1.0  
Actualizado: Febrero 2026
