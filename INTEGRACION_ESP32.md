# 🌤️ Guía de Integración ESP32 → Weather App

## Paso 1: Modificar tu `rx.ino`

### 1.1 Añadir al inicio del archivo (después de los includes):

```cpp
#include <HTTPClient.h>

// Copiar la clase WeatherAppClient desde RX_INTEGRATION.cpp
class WeatherAppClient {
    // ... (ver RX_INTEGRATION.cpp)
};

// Variable global
WeatherAppClient* appClient = nullptr;
```

### 1.2 En tu función `setup()`, después de `desconectarWiFi()`:

```cpp
void setup(){
    Serial.begin(115200);
    Serial.println("🚀 RECEPTOR ESP-NOW INICIADO");

    loadConfig();
    setupBLE();
    initESPNow();
    
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    
    desconectarWiFi();
    delay(2000);

    // 👇 AÑADIR ESTA LÍNEA:
    setupWeatherApp();  // Nueva integración

    ultimoPaqueteESPNow = millis();
}
```

### 1.3 En tu función `loop()`, después de procesar `gestionarEnvioWU()`:

```cpp
void loop(){
    if(wifiEncendidoParaEnvio) mantenerConexionWiFi();

    // Reiniciar si no recibe ESP-NOW en 60s
    if(millis() - ultimoPaqueteESPNow > 60000){
        Serial.println("⚠️ 60s sin datos → Reiniciando ESP-NOW");
        reiniciarESPNow();
        ultimoPaqueteESPNow = millis();
    }

    // Subida cada minuto múltiplo de 5
    static int ultimoMinutoEnviado = -1;

    time_t nowTime = time(nullptr);
    struct tm* tmNow = localtime(&nowTime);
    int minutoActual = tmNow ? tmNow->tm_min : -1;

    if(minutoActual >= 0 && minutoActual % 5 == 0 && minutoActual != ultimoMinutoEnviado){
        ultimoMinutoEnviado = minutoActual;

        if(nuevosDatos) {
            gestionarEnvioWU();
            
            // 👇 AÑADIR ESTA LÍNEA:
            enviarAWeatherApp();  // Nueva integración
        }
        else Serial.println("⚠️ No hay datos para enviar");
    }

    delay(1000);
}
```

### 1.4 Cambiar la IP y Station ID

En la función `setupWeatherApp()` (copiar desde RX_INTEGRATION.cpp):

```cpp
void setupWeatherApp() {
    // 👇 Cambiar esta IP por la de tu Raspberry Pi
    appClient = new WeatherAppClient("http://192.168.1.100", "ESP32_ESTACION_001");
    
    // 👇 Cambiar este ID para cada estación (ej: ESP32_SALON, ESP32_JARDIN)
    Serial.println("✅ Weather App Client inicializado");
}
```

## Paso 2: Configurar Raspberry Pi

### 2.1 Instalar y ejecutar la webapp:

```bash
# Clonar o descargar el código
cd /home/pi/weather_app

# Setup rápido
chmod +x quickstart.sh
./quickstart.sh
```

### 2.2 Para producción (systemd + nginx):

```bash
chmod +x setup_raspberry.sh
sudo ./setup_raspberry.sh

# Editar .env
sudo nano backend/.env
# DATABASE_URL=postgresql://weather_user:password@localhost/weather_db

# Iniciar servicios
sudo systemctl start weather-api
sudo systemctl start nginx

# Ver estado
sudo systemctl status weather-api
```

## Paso 3: Probar la Integración

### 3.1 Verificar que todo está funcionando:

```bash
# Terminal 1: API
cd weather_app/backend
python main.py

# Terminal 2: Frontend
cd weather_app/frontend
python -m http.server 8080
```

### 3.2 Acceder a la webapp:

- **Dashboard**: http://localhost:8080
- **API Docs**: http://localhost:8000/docs

### 3.3 Crear estación de prueba:

```bash
# Script automático
python3 weather_app/test_data_sender.py

# O manualmente:
curl -X POST http://localhost:8000/api/stations/ \
  -H "Content-Type: application/json" \
  -d '{
    "id": "ESP32_ESTACION_001",
    "name": "Estación 1",
    "location": "Sala",
    "latitude": 40.4168,
    "longitude": -3.7038
  }'
```

### 3.4 Cargar datos de prueba:

```bash
python3 weather_app/test_data_sender.py stream 60
```

## Paso 4: Configurar en Red Local

### En tu router:

1. Asignar IP estática a Raspberry Pi (ej: 192.168.1.100)
2. Configurar port forwarding (opcional, para acceso remoto)

### En tu ESP32:

Cambiar en `setupWeatherApp()`:

```cpp
appClient = new WeatherAppClient("http://192.168.1.100:8000", "ESP32_ESTACION_001");
```

## 📊 Cómo Verificar que Funciona

### 1. Ver logs del ESP32:
```
Serial Monitor debe mostrar:
✅ Datos enviados a webapp
```

### 2. Acceder a http://192.168.1.100:

Verás:
- Dashboard con la estación
- Datos actualizados en tiempo real
- Opción para descargar datos

### 3. Verificar base de datos:

```bash
psql -U weather_user -d weather_db
SELECT * FROM weather_data ORDER BY timestamp DESC LIMIT 5;
```

## 🔧 Troubleshooting

### Error: "Connection refused"
```
Solución: Verificar que Raspberry Pi está en la misma red
        Cambiar 192.168.1.100 por la IP correcta
```

### Error: "Station not found"
```
Solución: Crear la estación primero en la webapp
        O cambiar "ESP32_ESTACION_001" por ID existente
```

### Datos no llegan
```
Solución: 
1. Verificar que WiFi está conectado en ESP32
2. Ver si CORS está habilitado en la API
3. Revisar logs: curl http://localhost:8000/health
```

### La webapp no carga
```
Solución:
1. Verificar: python -m http.server 8080 en frontend/
2. O servir con nginx (ver setup_raspberry.sh)
```

## 📱 Estructura de Datos Enviados

Tu ESP32 enviará este JSON automáticamente:

```json
{
  "station_id": "ESP32_ESTACION_001",
  "temperature": 22.5,
  "humidity": 65.3,
  "dew_point": 14.2,
  "wind_speed_ms": 3.4,
  "wind_speed_mph": 7.6,
  "wind_gust_ms": 5.2,
  "wind_gust_mph": 11.6,
  "wind_direction_degrees": 135,
  "wind_direction_name": "SE",
  "total_rainfall": 5.2,
  "total_tips": 42,
  "rain_rate_mm_per_hour": 0.0,
  "rain_rate_in_per_hour": 0.0
}
```

## 🚀 Siguiente Paso: Múltiples Estaciones

Para agregar más estaciones:

1. En cada ESP32, cambiar:
   ```cpp
   "ESP32_ESTACION_001" → "ESP32_ESTACION_002", "ESP32_JARDIN", etc.
   ```

2. Crear las estaciones en la webapp

3. La webapp mostrará un dashboard con todas

## 📚 APIs Útiles

### Listar estaciones:
```bash
curl http://localhost:8000/api/stations
```

### Obtener datos de una estación (últimas 24h):
```bash
curl "http://localhost:8000/api/stations/ESP32_ESTACION_001/data?hours=24"
```

### Exportar datos de varias estaciones:
```bash
curl "http://localhost:8000/api/stations/bulk/export?station_ids=ESP32_001,ESP32_002&hours=168"
```

---

**¿Problemas?** Revisa los logs:
- ESP32: Serial Monitor
- Raspberry Pi: `sudo journalctl -u weather-api -f`
- Nginx: `sudo tail -f /var/log/nginx/error.log`
