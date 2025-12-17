# Weather Station Management System

Sistema de gestión de estaciones meteorológicas en tiempo real similar a Weather Underground. Diseñado para Raspberry Pi 16GB con eficiencia máxima.

## 🚀 Características

- **Gestión de Estaciones**: Crear, editar, eliminar y monitorear estaciones meteorológicas
- **Recepción de Datos**: API optimizada para recibir datos en tiempo real desde ESP32
- **Dashboard Interactivo**: Interfaz ligera con Tailwind CSS
- **Selección Múltiple**: Selecciona varias estaciones para visualizar datos combinados
- **Exportación de Datos**: Descarga datos en JSON con filtros de tiempo
- **Base de Datos Eficiente**: PostgreSQL con índices optimizados para Raspberry Pi
- **BLE & ESP-NOW Compatible**: Integración directa con tus ESP32

## 📋 Requisitos

- Python 3.9+
- PostgreSQL 12+
- Node.js (opcional, solo para desarrollo frontend)
- 2GB RAM mínimo en Raspberry Pi

## 🔧 Instalación

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Database Setup

```bash
# Crear base de datos
createdb weather_db

# Configurar .env
cp .env.example .env
# Editar .env con credenciales correctas
```

### 3. Inicializar Base de Datos

```bash
python -c "from app.core.database import init_db; init_db()"
```

### 4. Ejecutar Backend

```bash
python main.py
# O con Gunicorn para producción:
gunicorn -w 2 -b 0.0.0.0:8000 main:app
```

## 💻 Frontend

El frontend está en `/frontend` y es completamente estático (HTML + JavaScript vanilla).

Simplemente sirve los archivos con un servidor HTTP:

```bash
cd frontend
python -m http.server 8080
# Accede a http://localhost:8080
```

O en Nginx (ver sección deployment).

## 📡 API Endpoints

### Estaciones
- `POST /api/stations` - Crear estación
- `GET /api/stations` - Listar estaciones
- `GET /api/stations/{station_id}` - Obtener detalles
- `PUT /api/stations/{station_id}` - Actualizar
- `DELETE /api/stations/{station_id}` - Eliminar

### Datos
- `POST /api/stations/{station_id}/data` - Enviar datos
- `GET /api/stations/{station_id}/data?hours=24` - Obtener historial
- `POST /api/stations/bulk/data` - Enviar múltiples datos
- `GET /api/stations/bulk/export?station_ids=...&hours=24` - Exportar

## 🔗 Integración con ESP32

### Ejemplo para tu rx.ino:

```cpp
#include <HTTPClient.h>

void sendToWebApp() {
    HTTPClient http;
    String url = "http://raspberry_ip:8000/api/stations/ESP32_001/data";
    
    String payload = "";
    payload += "{\"temperature\": " + String(datosRecibidos.temperatura) + ",";
    payload += "\"humidity\": " + String(datosRecibidos.humedad) + ",";
    payload += "\"wind_speed_ms\": " + String(datosRecibidos.windSpeedMs) + ",";
    payload += "\"wind_gust_ms\": " + String(datosRecibidos.windGustMs) + ",";
    payload += "\"wind_direction_degrees\": " + String(datosRecibidos.windDirectionDegrees) + ",";
    payload += "\"total_rainfall\": " + String(datosRecibidos.totalRainfall) + "}";
    
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.POST(payload);
    http.end();
}
```

## 🐳 Docker (Recomendado para Raspberry Pi)

```dockerfile
# Dockerfile para backend
FROM python:3.11-slim

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/app ./app
COPY backend/main.py .

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:8000", "main:app"]
```

## 🚀 Deployment en Raspberry Pi

### Con Nginx + Gunicorn

```bash
# Instalar dependencias
sudo apt-get update
sudo apt-get install -y nginx postgresql python3-pip

# Setup systemd service para backend
sudo nano /etc/systemd/system/weather-api.service
```

```ini
[Unit]
Description=Weather Station API
After=network.target

[Service]
Type=notify
User=pi
WorkingDirectory=/home/pi/weather_app/backend
ExecStart=/home/pi/weather_app/backend/venv/bin/gunicorn -w 2 -b localhost:8000 main:app
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable weather-api
sudo systemctl start weather-api
```

### Configurar Nginx

```nginx
# /etc/nginx/sites-available/weather

upstream weather_api {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name weather.local;

    location /api/ {
        proxy_pass http://weather_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        alias /home/pi/weather_app/frontend/;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/weather /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 📊 Optimizaciones para Raspberry Pi

1. **PostgreSQL**: Pool de conexiones limitado (2-4 workers)
2. **Memoria**: SQLAlchemy con `echo=False` y garbage collection
3. **Índices**: Optimizados en `station_id + timestamp` y `active + updated_at`
4. **Frontend**: HTML/JS vanilla sin frameworks pesados
5. **Data Retention**: Limpieza automática de datos antiguos (configurable)

## 🧹 Mantenimiento

### Limpiar datos antiguos

```sql
-- Borrar datos con más de 30 días
DELETE FROM weather_data 
WHERE timestamp < NOW() - INTERVAL '30 days';

VACUUM ANALYZE weather_data;
```

## 📝 Variables de Entorno

```ini
DATABASE_URL=postgresql://user:password@localhost/weather_db
HOST=0.0.0.0
PORT=8000
RELOAD=False
CORS_ORIGINS=["http://localhost:3000","http://192.168.1.100:80"]
DATA_RETENTION_DAYS=30
```

## 🛠️ Troubleshooting

**Error de conexión a BD:**
```bash
psql -U user -h localhost -d weather_db
```

**Puerto en uso:**
```bash
lsof -i :8000
kill -9 <PID>
```

**Reiniciar servicios:**
```bash
sudo systemctl restart weather-api
sudo systemctl restart nginx
```

## 📄 Licencia

MIT

---

**Soporte**: Para errores o mejoras, revisa los logs:
```bash
sudo journalctl -u weather-api -f
sudo tail -f /var/log/nginx/error.log
```
