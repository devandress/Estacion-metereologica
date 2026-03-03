# WeatherNet — Dashboard de Estaciones Meteorológicas

Dashboard web para monitorear estaciones meteorológicas ESP32 en tiempo real.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Flask + SQLAlchemy + SQLite + Gunicorn |
| Frontend | Vanilla JS + Tailwind CDN + Leaflet.js + Chart.js |
| Reverse proxy | Nginx |
| SSL | Let's Encrypt (Certbot) |
| DNS dinámico | DuckDNS |
| Deploy | Docker Compose |

## Estructura

```
weather_app/
├── backend/
│   ├── main.py                        # App Flask, blueprints, init_db
│   ├── requirements.txt
│   └── app/
│       ├── api/
│       │   ├── stations_routes.py     # CRUD estaciones + estadísticas
│       │   └── data_routes.py         # Recepción datos ESP32
│       ├── models/
│       │   └── station.py             # WeatherStation + WeatherData
│       └── core/
│           ├── database.py            # SQLAlchemy + SQLite
│           └── config.py
├── frontend/
│   ├── index.html
│   └── js/
│       ├── main.js                    # App principal, router, estado
│       └── map.js                     # Mapa Leaflet interactivo
├── nginx/
│   ├── nginx.conf
│   └── templates/
│       └── default.conf.template      # Config con envsubst (${NGINX_HOST})
├── docker-compose.yml                 # Producción (4 servicios)
├── docker-compose.dev.yml             # Desarrollo local
├── Dockerfile.backend
├── .env.example                       # Template de variables de entorno
├── update-duckdns.sh                  # Script DuckDNS para el contenedor
├── simulate_station.py                # Simulador de estación ESP32
├── dev_server.py                      # Servidor de desarrollo local
├── WeatherStation_ESP32.ino           # Firmware ESP32
├── WeatherStation_CONFIG.h            # Configuración ESP32
└── ESP32_Integration.h                # Integración ESP32
```

## API

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/stations/` | Listar estaciones con último dato |
| POST | `/api/stations/` | Crear estación |
| GET | `/api/stations/<id>` | Detalle de estación |
| PUT | `/api/stations/<id>` | Actualizar estación |
| DELETE | `/api/stations/<id>` | Eliminar estación |
| GET | `/api/stations/stats/overview` | Estadísticas globales |
| GET | `/api/stations/<id>/data` | Histórico de datos |
| GET | `/api/stations/<id>/stats` | Estadísticas de estación |
| GET | `/api/stations/bulk/export` | Exportar datos múltiples estaciones |
| POST | `/api/data/submit` | **ESP32** envía lectura |
| GET | `/health` | Health check |

## Desarrollo local

```bash
# Terminal 1 — Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python main.py

# Terminal 2 — Frontend (proxy al backend)
python dev_server.py
# Abre http://localhost:5500

# Opcional — Simulador de estación
python simulate_station.py --interval 10
```

## Deploy (VPS con Docker)

### 1. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

```env
DUCKDNS_TOKEN=tu-token
DUCKDNS_DOMAIN=tu-subdominio
NGINX_HOST=tu-subdominio.duckdns.org
```

### 2. Obtener certificado SSL (primera vez)

```bash
docker run --rm -p 80:80 \
  -v $(pwd)/nginx/certbot_certs:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  -d tu-subdominio.duckdns.org \
  --email tu@email.com --agree-tos --non-interactive
```

### 3. Levantar

```bash
docker compose up -d
docker compose ps
```

## ESP32 — Envío de datos

El firmware hace un POST cada N segundos:

```
POST /api/data/submit
Content-Type: application/json

{
  "station_id": "mi-estacion-01",
  "temperature": 24.5,
  "humidity": 65.0,
  "wind_speed_ms": 3.2,
  "wind_gust_ms": 5.1,
  "wind_direction_degrees": 180,
  "total_rainfall": 0.0,
  "rain_rate_mm_per_hour": 0.0
}
```

Ver `WeatherStation_CONFIG.h` para configurar el servidor y credenciales WiFi.
