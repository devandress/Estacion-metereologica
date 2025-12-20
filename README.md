# 🌦️ Weather Station Management System - Documentación Completa

**Versión:** 1.0 - Production Ready  
**Fecha:** 19 de Diciembre de 2025  
**Estado:** ✅ COMPLETADO

---

## 📋 Tabla de Contenidos

1. [Inicio Rápido](#inicio-rápido)
2. [Descripción del Proyecto](#descripción-del-proyecto)
3. [Requisitos](#requisitos)
4. [Instalación](#instalación)
5. [Configuración](#configuración)
6. [Arquitectura](#arquitectura)
7. [API Endpoints](#api-endpoints)
8. [Frontend](#frontend)
9. [Raspberry Pi + Cloudflare](#raspberry-pi--cloudflare-tunnel)
10. [ESP32 Configuration](#esp32-configuration)
11. [Comandos Útiles](#comandos-útiles)
12. [Troubleshooting](#troubleshooting)

---

## Inicio Rápido

### 3 Comandos esenciales:

```bash
# 1. En Raspberry Pi (15 min)
cd /home/pi/weather_station
chmod +x setup_raspberry_optimized.sh
./setup_raspberry_optimized.sh

# 2. Configurar Cloudflare (5 min)
cloudflared tunnel login
cloudflared tunnel create raspberry-weather
cloudflared tunnel route dns raspberry-weather tu-dominio.com
sudo systemctl start weather-tunnel

# 3. Probar en laptop (5 min)
python3 fake_weather_terminal.py https://tu-dominio.com
```

**Resultado:** Sistema completamente en vivo en ~40 minutos

---

## Descripción del Proyecto

Sistema de gestión de estaciones meteorológicas en tiempo real similar a Weather Underground. Diseñado para:
- **Raspberry Pi 16GB** (eficiencia máxima)
- **Acceso remoto sin abrir puertos** (Cloudflare Tunnel)
- **Pruebas sin hardware** (simulador interactivo)

### Status Actual

| Componente | Estado | Detalles |
|-----------|--------|----------|
| Heroku | ✅ ACTIVO | https://weather-andy-7738-467e8e143413.herokuapp.com |
| Frontend | ✅ ACTIVO | Tailwind CSS + Chart.js + Leaflet |
| Backend | ✅ ACTIVO | FastAPI + PostgreSQL |
| Raspberry Pi Setup | ✅ LISTO | Script automático (300+ líneas) |
| Cloudflare Tunnel | ✅ LISTO | Documentación + scripts |
| Simulador | ✅ LISTO | fake_weather_terminal.py (400+ líneas) |
| Verificador | ✅ LISTO | verify_system.sh (200+ líneas) |

---

## Requisitos

### Para Heroku (Nube):
- Python 3.9+
- Git
- Cuenta Heroku

### Para Raspberry Pi (Local):
- Raspberry Pi 4 o 5 con 16GB RAM
- Raspberry Pi OS
- Acceso SSH
- WiFi conectada
- 2GB espacio libre en disco

### Para ESP32 (Sensores):
- Arduino IDE
- ESP32 board support
- Sensores: DHT22, BMP280, Anemómetro, Veleta, Pluviómetro

### Dependencias Python:
```
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
gunicorn==21.2.0
python-dotenv==1.0.0
```

---

## Instalación

### 1. Backend Local

```bash
# Clonar repositorio
git clone https://github.com/devandress/Estacion-metereologica.git
cd weather_station/backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cat > .env << 'EOF'
DATABASE_URL=postgresql://user:password@localhost:5432/weather_db
CORS_ORIGINS=["http://localhost:8080","http://localhost:3000"]
PORT=8000
EOF
```

### 2. Heroku Deployment

```bash
# Instalar Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Crear app
heroku create weather-andy-XXXX

# Agregar PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Configurar variables
heroku config:set CORS_ORIGINS='["https://weather-andy-XXXX.herokuapp.com"]'

# Deploy
git push heroku main
```

### 3. Raspberry Pi Automático

```bash
# En Raspberry Pi:
cd /home/pi
git clone https://github.com/devandress/Estacion-metereologica.git
cd weather_station

chmod +x setup_raspberry_optimized.sh
./setup_raspberry_optimized.sh
```

El script instala y configura:
- ✅ Python 3.11 + venv
- ✅ PostgreSQL local
- ✅ Nginx reverse proxy
- ✅ Gunicorn + Uvicorn
- ✅ Cloudflare Tunnel (detecta ARM64/ARM32/x86)
- ✅ 3 servicios systemd (auto-start)

---

## Configuración

### Variables de Entorno (.env)

```env
# Base de datos
DATABASE_URL=postgresql://weather_user:password@localhost:5432/weather_db

# CORS (origen de solicitudes permitidas)
CORS_ORIGINS=["http://localhost:8080","https://tu-dominio.com"]

# Puerto
PORT=8000

# Debug
DEBUG=False
```

### Cloudflare Tunnel

```bash
# 1. Login
cloudflared tunnel login

# 2. Crear túnel
cloudflared tunnel create raspberry-weather

# 3. Configurar DNS
cloudflared tunnel route dns raspberry-weather tu-dominio.com

# 4. Crear archivo config (~/.cloudflared/config.yml)
tunnel: raspberry-weather
credentials-file: /home/pi/.cloudflared/TUUID.json

ingress:
  - hostname: tu-dominio.com
    service: http://localhost:8080
  - service: http_status:404

# 5. Iniciar servicio
sudo systemctl start weather-tunnel
sudo systemctl enable weather-tunnel
```

---

## Arquitectura

### Flujo de Datos

```
ESP32 (Sensores)
    ↓ WiFi
Cloudflare Tunnel (sin puertos abiertos)
    ↓ HTTPS
Raspberry Pi en tu casa
    ├─ Backend FastAPI (:8000)
    ├─ Frontend Nginx (:8080)
    ├─ PostgreSQL (almacenamiento)
    └─ Cloudflare Tunnel Service
    ↓
https://tu-dominio.com (dashboard pública)
    ↓
Usuarios desde cualquier lugar
```

### Stack Tecnológico

**Frontend:**
- HTML5, CSS3 (Tailwind v4)
- JavaScript (Vanilla)
- Chart.js (gráficos)
- Leaflet (mapas interactivos)
- Luxon (manejo de fechas)
- Font Awesome (iconos)

**Backend:**
- FastAPI (framework web moderno)
- Gunicorn (WSGI server)
- Uvicorn (ASGI worker)
- SQLAlchemy (ORM)
- Pydantic (validación)

**Infraestructura:**
- PostgreSQL (base de datos)
- Nginx (reverse proxy)
- Cloudflare Tunnel (VPN sin puertos)
- Systemd (servicios Linux)
- Heroku (cloud deployment)
- Raspberry Pi 4/5 (local)

**Hardware:**
- ESP32 (microcontrolador WiFi)
- DHT22 (temperatura + humedad)
- BMP280 (presión)
- Anemómetro (velocidad viento)
- Veleta (dirección viento)
- Pluviómetro (lluvia)

---

## API Endpoints

### Health Check
```
GET /api/health
Respuesta: {"message": "Weather Station API", "version": "1.0.0"}
```

### Estaciones
```
GET /api/stations
→ Lista todas las estaciones

POST /api/stations
→ Crear nueva estación
Body: {
  "name": "Mi Estación",
  "latitude": 40.4168,
  "longitude": -3.7038,
  "altitude": 646
}

GET /api/stations/{id}
→ Obtener estación específica

PUT /api/stations/{id}
→ Actualizar estación

DELETE /api/stations/{id}
→ Eliminar estación
```

### Datos Meteorológicos
```
GET /api/stations/{id}/data
→ Obtener datos históricos
Query params:
  ?start=2025-12-01&end=2025-12-31
  ?limit=100

POST /api/stations/{id}/data
→ Enviar nuevo dato
Body: {
  "temperature": 21.5,
  "humidity": 65.2,
  "pressure": 1013.25,
  "wind_speed": 5.3,
  "wind_direction": 180,
  "wind_gust": 8.2,
  "rain": 0.5
}

GET /api/stations/{id}/data/export
→ Exportar datos (CSV/JSON)
Query params:
  ?format=csv
  ?format=json
```

### Documentación Interactiva
```
GET /docs          → Swagger UI
GET /redoc         → ReDoc
GET /openapi.json  → Especificación OpenAPI
```

---

## Frontend

### Vistas Disponibles

1. **Dashboard Principal**
   - Últimos datos de todas las estaciones
   - Gráficos en tiempo real
   - Indicadores rápidos

2. **Mapa Interactivo**
   - Visualización de estaciones en mapa
   - Clustering automático
   - Múltiples capas de mapas

3. **Análisis de Datos**
   - Gráficos históricos
   - Estadísticas por período
   - Comparativa entre estaciones

4. **Gestión de Estaciones**
   - Crear nueva estación
   - Editar propiedades
   - Eliminar estaciones

5. **Exportación de Datos**
   - Descargar como CSV
   - Descargar como JSON
   - Filtrado por rango de fechas

6. **Búsqueda y Filtrado**
   - Buscar por nombre
   - Filtrar por tipo de dato
   - Ordenar por columna

7. **Alertas y Notificaciones**
   - Configurar umbrales
   - Notificaciones en tiempo real
   - Historial de eventos

### Features

- ✅ Responsive (mobile + desktop)
- ✅ Soporte offline parcial
- ✅ Actualización en tiempo real
- ✅ Interfaz intuitiva
- ✅ Gráficos interactivos
- ✅ Mapas con Leaflet
- ✅ Exportación de datos

---

## Raspberry Pi + Cloudflare Tunnel

### Instalación Automática

El script `setup_raspberry_optimized.sh` automatiza:

1. **Sistema Operativo**
   - Actualiza paquetes
   - Instala build-essential, git, curl

2. **Python**
   - Instala Python 3.11
   - Crea entorno virtual
   - Instala todas las dependencias

3. **PostgreSQL**
   - Instala PostgreSQL 15
   - Crea usuario `weather_user`
   - Crea base de datos `weather_db`
   - Configura permisos

4. **Nginx**
   - Instala y configura Nginx
   - Crea configuración optimizada para Pi
   - Habilita compresión gzip

5. **Cloudflare Tunnel**
   - Detecta arquitectura (ARM64/ARM32/x86)
   - Descarga cloudflared
   - Prepara configuración

6. **Servicios Systemd**
   - Backend (FastAPI)
   - Frontend (Nginx)
   - Tunnel (Cloudflare)

### Verificación del Sistema

```bash
# Ejecutar verificador automático
./verify_system.sh

# Salida esperada:
# ✅ Software instalado
# ✅ Servicios corriendo
# ✅ Puertos abiertos
# ✅ Base de datos conectada
# ✅ API respondiendo
# ✅ Tunnel activo
# 🎉 ¡TODO ESTÁ CORRECTO!
```

### Monitoreo

```bash
# Ver logs en tiempo real
sudo journalctl -fu weather-backend -n 50
sudo journalctl -fu weather-frontend -n 50
sudo journalctl -fu weather-tunnel -n 50

# Ver estado de servicios
sudo systemctl status weather-{backend,frontend,tunnel}

# Recursos del sistema
top -b -n 1 | head -20
df -h
vcgencmd measure_temp

# Ver acciones del tunnel
cloudflared tunnel ingress-rules
```

### Mantenimiento

```bash
# Reiniciar servicios
sudo systemctl restart weather-backend
sudo systemctl restart weather-frontend
sudo systemctl restart weather-tunnel

# Ver logs históricos
sudo journalctl -u weather-backend --no-pager | tail -100

# Backup de base de datos
pg_dump -U weather_user weather_db > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U weather_user weather_db < backup_20251219.sql

# Limpiar datos antiguos (>30 días)
psql -U weather_user -d weather_db -c \
  "DELETE FROM weather_data WHERE timestamp < NOW() - INTERVAL '30 days';"
```

---

## ESP32 Configuration

### Archivo de Configuración

Editar `ESP32_Integration.h`:

```cpp
// WiFi
#define WIFI_SSID "TU_RED_WIFI"
#define WIFI_PASSWORD "TU_CONTRASEÑA"

// API
#define API_HOST "tu-dominio.com"           // Tu dominio Cloudflare
#define API_PORT 443                        // HTTPS
#define API_PATH "/api/stations"
#define USE_HTTPS true

// Estación
#define STATION_ID "ESP32_001"
#define STATION_NAME "Weather Station ESP32"
#define STATION_LATITUDE 40.4168
#define STATION_LONGITUDE -3.7038
#define STATION_ALTITUDE 646

// Sensores
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define BMP_ADDR 0x76
#define WIND_SPEED_PIN 23
#define WIND_DIR_PIN 34
#define RAIN_PIN 35

// Timing
#define SEND_INTERVAL 60000                 // Enviar cada 60 segundos
#define SENSOR_READ_INTERVAL 5000           // Leer sensores cada 5 seg
#define TIMEOUT_MS 10000
#define MAX_RETRIES 3
```

### Cargar en ESP32

1. Abrir Arduino IDE
2. Herramientas → Placa → Seleccionar ESP32
3. Herramientas → Puerto → Seleccionar puerto COM
4. Cargar sketch

### Código de Ejemplo

```cpp
#include "ESP32_Integration.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

void setup() {
    Serial.begin(115200);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    // Esperar conexión WiFi
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ WiFi conectado!");
    } else {
        Serial.println("\n❌ Error de conexión WiFi");
    }
}

void loop() {
    // Leer sensores
    float temp = readTemperature();
    float humidity = readHumidity();
    float pressure = readPressure();
    
    // Enviar a API
    sendWeatherData(temp, humidity, pressure);
    
    delay(SEND_INTERVAL);
}

void sendWeatherData(float temp, float humidity, float pressure) {
    if (WiFi.status() != WL_CONNECTED) return;
    
    HTTPClient http;
    String protocol = USE_HTTPS ? "https" : "http";
    String url = protocol + "://" + API_HOST + ":" + API_PORT + 
                 "/api/stations/" + STATION_ID + "/data";
    
    http.begin(url.c_str());
    http.addHeader("Content-Type", "application/json");
    
    StaticJsonDocument<512> doc;
    doc["temperature"] = temp;
    doc["humidity"] = humidity;
    doc["pressure"] = pressure;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
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

## Comandos Útiles

### Git

```bash
# Clonar repositorio
git clone https://github.com/devandress/Estacion-metereologica.git

# Ver estado
git status

# Agregar cambios
git add .

# Commit
git commit -m "Descripción de cambios"

# Push
git push origin main

# Pull
git pull origin main
```

### Docker (Opcional)

```bash
# Build
docker-compose build

# Ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Detener
docker-compose down
```

### PostgreSQL

```bash
# Conectar a base de datos
psql -U weather_user -d weather_db

# Dentro de psql:
\dt                              # Listar tablas
SELECT * FROM weather_stations;  # Ver estaciones
SELECT COUNT(*) FROM weather_data; # Contar registros
\q                               # Salir
```

### Nginx

```bash
# Ver estado
sudo systemctl status nginx

# Iniciar/Detener
sudo systemctl start nginx
sudo systemctl stop nginx

# Reload configuración
sudo systemctl reload nginx

# Ver configuración
sudo nano /etc/nginx/sites-available/weather

# Test configuración
sudo nginx -t
```

### Gunicorn

```bash
# Ejecutar manualmente
gunicorn main:app --worker-class uvicorn.workers.UvicornWorker \
  --workers 2 --bind 0.0.0.0:8000

# Ver proceso
ps aux | grep gunicorn

# Kill proceso
kill -9 <PID>
```

### Heroku

```bash
# Ver logs
heroku logs --tail

# Ver config
heroku config

# Agregar variable
heroku config:set VARIABLE=value

# Ejecutar comando en dyno
heroku run bash

# Ver estado
heroku apps
```

---

## Troubleshooting

### "No puedo conectarme a la API"

```bash
# Verificar que servicios están corriendo
sudo systemctl status weather-backend
sudo systemctl status weather-frontend

# Ver logs
sudo journalctl -fu weather-backend -n 50

# Probar endpoint local
curl http://localhost:8000/api/health

# Verificar firewall
sudo ufw status
```

### "Cloudflare Tunnel no funciona"

```bash
# Ver estado del tunnel
sudo systemctl status weather-tunnel

# Ver logs
sudo journalctl -fu weather-tunnel -n 50

# Verificar credenciales
cat ~/.cloudflared/config.yml

# Reconectar
cloudflared tunnel login
cloudflared tunnel create raspberry-weather
```

### "Base de datos no responde"

```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Conectar manualmente
psql -U weather_user -d weather_db

# Ver variables de conexión en .env
cat /home/pi/weather_station/.env

# Reiniciar PostgreSQL
sudo systemctl restart postgresql
```

### "Raspberry Pi muy lenta"

```bash
# Verificar CPU
top -b -n 1 | head -20

# Verificar RAM
free -h

# Verificar disco
df -h

# Reducir workers de Gunicorn (editar servicio)
sudo systemctl edit weather-backend
# Cambiar: -w 2 → -w 1
```

### "ESP32 no envía datos"

```bash
# Verificar WiFi en ESP32
// Ver serial monitor

// Verificar configuración ESP32_Integration.h:
// - WIFI_SSID correcto
// - WiFi PASSWORD correcto
// - API_HOST correcto
// - API_PORT 443 (si HTTPS)

// Test conexión desde laptop
python3 fake_weather_terminal.py https://tu-dominio.com

// Ver logs de backend
sudo journalctl -fu weather-backend
```

### "Error de certificado SSL"

```bash
# Si usas HTTPS, necesitas certificado correcto
# Cloudflare Tunnel maneja esto automáticamente

# Para debug, usar HTTP local primero
#define USE_HTTPS false
#define API_HOST "192.168.1.x"
#define API_PORT 8000

# Luego cambiar a HTTPS
#define USE_HTTPS true
#define API_HOST "tu-dominio.com"
#define API_PORT 443
```

---

## Backup y Restauración

### Backup

```bash
# Base de datos
pg_dump -U weather_user weather_db > backup_bd.sql

# Código
git clone https://github.com/devandress/Estacion-metereologica.git backup_codigo

# Configuración
cp /home/pi/weather_station/.env backup_env

# Cron automático (cada día a las 3 AM)
0 3 * * * pg_dump -U weather_user weather_db > /home/pi/backups/backup_$(date +\%Y\%m\%d).sql
```

### Restauración

```bash
# Base de datos
psql -U weather_user weather_db < backup_bd.sql

# Código
cd /home/pi
git clone backup_codigo/

# Configuración
cp backup_env /home/pi/weather_station/.env
```

---

## Scripts Disponibles

### setup_raspberry_optimized.sh
Instalación completa en Raspberry Pi (automática)

```bash
chmod +x setup_raspberry_optimized.sh
./setup_raspberry_optimized.sh
```

### fake_weather_terminal.py
Simulador interactivo de estación meteorológica

```bash
# Uso local
python3 fake_weather_terminal.py http://localhost:8080

# Uso remoto
python3 fake_weather_terminal.py https://tu-dominio.com

# Menú:
# 1 - Enviar un dato
# 2 - Enviar cada 60 segundos
# 3 - Enviar cada 5 segundos (debug)
# 4 - Cambiar URL
# 5 - Salir
```

### verify_system.sh
Verificación completa del sistema

```bash
chmod +x verify_system.sh
./verify_system.sh
```

---

## URLs Importantes

### Heroku
- Frontend: https://weather-andy-7738-467e8e143413.herokuapp.com
- API: https://weather-andy-7738-467e8e143413.herokuapp.com/api
- Docs: https://weather-andy-7738-467e8e143413.herokuapp.com/docs

### Raspberry Pi Local
- Frontend: http://192.168.1.x:8080
- API: http://192.168.1.x:8000
- Docs: http://192.168.1.x:8000/docs

### Raspberry Pi Remoto (Cloudflare)
- Frontend: https://tu-dominio.com
- API: https://tu-dominio.com/api
- Docs: https://tu-dominio.com/docs

---

## Ventajas del Sistema

✅ **Control Total**
- Tu hardware, tus datos
- Código abierto y personalizable
- Sin dependencias de terceros

✅ **Bajo Costo**
- Cloudflare Tunnel: Gratuito
- Raspberry Pi: ~$2/mes de electricidad
- Dominio: Gratuito en Cloudflare
- Total: ~$2/mes

✅ **Seguridad**
- Datos en tu casa
- HTTPS automático
- Sin abrir puertos en router
- DDoS protection (Cloudflare)
- WAF integrado

✅ **Escalabilidad**
- Múltiples sensores ESP32
- Almacenamiento ilimitado
- Fácil de expandir

✅ **Flexibilidad**
- API personalizable
- Dashboard editable
- Alertas configurables
- Exportación de datos

---

## Soporte y Documentación

- **GitHub:** https://github.com/devandress/Estacion-metereologica
- **Issues:** Reportar problemas en GitHub
- **Wiki:** Documentación adicional en GitHub

---

## Licencia

Este proyecto está bajo licencia MIT. Ver archivo `LICENSE` para más detalles.

---

**Proyecto completado: 19 Diciembre 2025**  
**Versión:** 1.0 - Production Ready  
**Estado:** ✅ LISTO PARA USAR
