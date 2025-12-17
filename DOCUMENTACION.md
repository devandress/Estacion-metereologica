# 📚 Índice Completo - Weather Station WebApp

## 📖 Documentación Principal

### 🎯 [ENTREGA.md](./ENTREGA.md)
**Lectura recomendada:** Primero  
**Duración:** 5 minutos  
**Contenido:**
- Resumen de lo que se entregó
- Características implementadas
- Capacidades del sistema
- Métricas de performance
- Q&A frecuentes

### 🚀 [QUICKSTART.md](./QUICKSTART.md)
**Lectura recomendada:** Segunda  
**Duración:** 5 minutos  
**Contenido:**
- 3 opciones para empezar (Dev, Docker, Raspberry Pi)
- Cómo probar sin ESP32
- Endpoints API para testing
- Troubleshooting básico

### 📖 [README.md](./README.md)
**Lectura recomendada:** Para instalación completa  
**Duración:** 15 minutos  
**Contenido:**
- Requisitos detallados
- Instalación paso a paso
- Configuración base de datos
- Deployment en Raspberry Pi
- Optimizaciones incluidas

### 🏗️ [ARQUITECTURA.md](./ARQUITECTURA.md)
**Lectura recomendada:** Para entender el sistema  
**Duración:** 10 minutos  
**Contenido:**
- Diagrama completo del sistema
- Flujo de datos
- Componentes clave
- Performance esperado
- Escalabilidad

### 📱 [INTEGRACION_ESP32.md](./INTEGRACION_ESP32.md)
**Lectura recomendada:** Para tu ESP32  
**Duración:** 20 minutos  
**Contenido:**
- Cómo modificar rx.ino
- Código C++ necesario
- Configuración paso a paso
- Testing de la integración
- Troubleshooting ESP32

### ✅ [STATUS.txt](./STATUS.txt)
**Lectura recomendada:** Para verificar completitud  
**Contenido:**
- Checklist de componentes
- Estado del proyecto
- Próximos pasos

---

## 💻 Archivos de Código

### Backend

#### main.py
```
Localización: backend/main.py
Líneas: ~100
Propósito: Entry point de la API FastAPI
Incluye: Setup de rutas, CORS, eventos startup
```

#### app/api/stations.py
```
Localización: backend/app/api/stations.py
Líneas: ~300
Propósito: 7 endpoints REST para estaciones y datos
Endpoints:
  POST   /api/stations/
  GET    /api/stations/
  GET    /api/stations/{station_id}
  PUT    /api/stations/{station_id}
  DELETE /api/stations/{station_id}
  POST   /api/stations/{id}/data
  GET    /api/stations/{id}/data
```

#### app/models/station.py
```
Localización: backend/app/models/station.py
Líneas: ~60
Propósito: Modelos SQLAlchemy para tablas
Tablas: weather_stations, weather_data
Índices: station_id+timestamp, active+updated_at
```

#### app/core/config.py & database.py
```
Localización: backend/app/core/
Líneas: ~80
Propósito: Configuración y conexión a BD
Optimizaciones: Pool conexiones, índices
```

### Frontend

#### frontend/index.html
```
Localización: frontend/index.html
Líneas: ~30
Propósito: HTML base de la aplicación
Incluye: CDN Tailwind, Chart.js
```

#### frontend/js/main.js
```
Localización: frontend/js/main.js
Líneas: ~800
Propósito: Lógica completa de la aplicación
Funciones:
  - fetchStations()
  - createStation()
  - renderDashboard()
  - exportData()
  - etc.
```

### Deployment

#### docker-compose.yml
```
Stack completo:
  - PostgreSQL 15
  - FastAPI Backend
  - Nginx Proxy
  - Frontend Estático
```

#### nginx.conf
```
Configuración:
  - Proxy a API
  - Caché de archivos
  - Compresión GZIP
  - Headers de seguridad
```

#### setup_raspberry.sh
```
Automatiza:
  - Instalación dependencias
  - Setup PostgreSQL
  - Systemd service
  - Nginx configuration
```

#### quickstart.sh
```
Para desarrollo:
  - Crea venv
  - Instala dependencias
  - Inicia backend y frontend
```

---

## 🔧 Scripts Utilitarios

### test_data_sender.py
```
Uso: python3 test_data_sender.py [stream <segundos>]

Funciones:
  - Crear estación de prueba
  - Enviar datos manuales
  - Simular stream continuo
  - Testing sin ESP32
```

**Ejemplo:**
```bash
# Modo interactivo
python3 test_data_sender.py

# Modo simulación (300 segundos)
python3 test_data_sender.py stream 300
```

### maintenance.py
```
Uso: python3 maintenance.py <comando> [opciones]

Comandos:
  - cleanup --days 30     (Limpiar datos antiguos)
  - stats                 (Ver estadísticas)
  - list                  (Listar estaciones)
  - backup --output file  (Hacer backup)
```

**Ejemplo:**
```bash
python3 maintenance.py stats
python3 maintenance.py cleanup --days 30
python3 maintenance.py backup --output backup.sql
```

---

## 📱 Integración ESP32

### Archivos Proporcionados

#### RX_INTEGRATION.cpp
```
Ubicación: /home/andy/weather_app/RX_INTEGRATION.cpp
Propósito: Código C++ listo para copiar a rx.ino
Incluye:
  - Clase WeatherAppClient
  - Función setupWeatherApp()
  - Función enviarAWeatherApp()
  - Manejo de JSON
```

#### ESP32_Integration.h
```
Ubicación: /home/andy/weather_app/ESP32_Integration.h
Propósito: Cabecera C++ alternativa
Incluye: Ejemplos comentados
```

### Pasos de Integración

1. **Copiar código** (ver INTEGRACION_ESP32.md)
2. **Cambiar valores**:
   - IP: `"http://192.168.1.100"`
   - ID: `"ESP32_ESTACION_001"`
3. **Añadir función en loop()**
4. **Compilar y subir**

---

## 📊 Base de Datos

### Esquema

**Tabla: weather_stations**
```
id (varchar, PK)
name (varchar)
location (varchar)
latitude (float)
longitude (float)
active (boolean, INDEX)
last_data_time (datetime)
description (text)
created_at (datetime, INDEX)
updated_at (datetime)
```

**Tabla: weather_data**
```
id (integer, PK)
station_id (varchar, FK, INDEX)
temperature (float)
humidity (float)
dew_point (float)
wind_speed_ms (float)
wind_speed_mph (float)
wind_gust_ms (float)
wind_gust_mph (float)
wind_direction_degrees (float)
wind_direction_name (varchar)
total_rainfall (float)
total_tips (integer)
rain_rate_mm_per_hour (float)
rain_rate_in_per_hour (float)
timestamp (datetime, INDEX)
```

### Índices Creados
```
weather_stations:
  - idx_station_active_updated (active, updated_at)
  - idx_station_name (name)

weather_data:
  - idx_data_station_timestamp (station_id, timestamp)
  - idx_data_timestamp (timestamp)
```

---

## 🌐 API Reference

### Authentication
Ninguna (por ahora, agregar en producción)

### Response Format
```json
{
  "id": "...",
  "name": "...",
  "created_at": "2024-01-01T00:00:00",
  ...
}
```

### Error Handling
```json
{
  "detail": "Station not found"
}
```

### Endpoints

#### Estaciones

**POST /api/stations/**
- Create station
- Body: `{id, name, location, latitude, longitude, description?}`

**GET /api/stations/**
- List stations
- Query: `?active=true&skip=0&limit=100`

**GET /api/stations/{station_id}**
- Get details + latest data

**PUT /api/stations/{station_id}**
- Update station

**DELETE /api/stations/{station_id}**
- Delete station

#### Datos

**POST /api/stations/{station_id}/data**
- Send weather data

**GET /api/stations/{station_id}/data**
- Get history
- Query: `?hours=24&skip=0&limit=1000`

**POST /api/stations/bulk/data**
- Send multiple datasets

**GET /api/stations/bulk/export**
- Export multiple stations
- Query: `?station_ids=id1,id2&hours=24`

---

## 🔐 Variables de Entorno

### .env
```ini
# Database
DATABASE_URL=postgresql://user:password@localhost/weather_db

# Server
HOST=0.0.0.0
PORT=8000
RELOAD=False

# CORS
CORS_ORIGINS=["*"]

# Data retention
DATA_RETENTION_DAYS=30
```

---

## 📈 Rutas de Inicio Rápido

### Para usuarios prisa (5 min)
1. Lee `ENTREGA.md`
2. Ejecuta `./quickstart.sh`
3. Abre http://localhost:8080
4. Crea una estación

### Para desarrollo completo (30 min)
1. Lee `QUICKSTART.md`
2. Lee `README.md`
3. Sigue setup local
4. Experimenta con API

### Para Raspberry Pi (1 hora)
1. Lee `README.md` sección "Deployment"
2. Transfiere archivos
3. Ejecuta `setup_raspberry.sh`
4. Configura `.env`
5. Inicia servicios

### Para integración ESP32 (1 hora)
1. Lee `INTEGRACION_ESP32.md`
2. Copia código desde `RX_INTEGRATION.cpp`
3. Modifica tu `rx.ino`
4. Compila y sube
5. Verifica en dashboard

---

## 🆘 Troubleshooting by Topic

### "No veo la webapp"
- Ver: `QUICKSTART.md` → "Troubleshooting"
- Check: `curl http://localhost:8080`

### "API devuelve error"
- Ver: `README.md` → "Troubleshooting"
- Logs: `sudo journalctl -u weather-api -f`

### "ESP32 no envía datos"
- Ver: `INTEGRACION_ESP32.md` → "Troubleshooting"
- Serial Monitor del ESP32

### "Base de datos falla"
- Ver: `README.md` → "Database Setup"
- Check: `psql -U weather_user -d weather_db`

---

## 📞 Soporte

### Archivos Log
```bash
# API
sudo journalctl -u weather-api -f

# Nginx
sudo tail -f /var/log/nginx/error.log

# PostgreSQL
sudo systemctl status postgresql
```

### Verificaciones
```bash
# API health
curl http://localhost:8000/health

# DB connection
psql -U weather_user -d weather_db -c "SELECT COUNT(*) FROM weather_data;"

# Frontend
curl http://localhost:8080/index.html
```

---

## 📋 Checklist de Instalación

- [ ] Leer ENTREGA.md
- [ ] Leer QUICKSTART.md
- [ ] Ejecutar quickstart.sh
- [ ] Probar http://localhost:8080
- [ ] Crear estación de prueba
- [ ] Ejecutar test_data_sender.py
- [ ] Ver datos en dashboard
- [ ] (Opcional) Leer INTEGRACION_ESP32.md
- [ ] (Opcional) Modificar rx.ino
- [ ] (Opcional) Leer README.md para Raspberry Pi

---

## 🎓 Aprendizaje

### Conceptos Clave
1. **REST API**: endpoints, métodos HTTP
2. **FastAPI**: framework Python moderno
3. **SQLAlchemy**: ORM para BD
4. **PostgreSQL**: base de datos relacional
5. **Tailwind CSS**: framework CSS ligero
6. **Docker**: containerización
7. **Nginx**: reverse proxy

### Archivos para Aprender
- Backend: `backend/app/api/stations.py`
- Frontend: `frontend/js/main.js`
- BD: `backend/app/models/station.py`

---

## 📌 Referencias Rápidas

### URLs Importantes
```
Desarrollo:
  - Frontend: http://localhost:8080
  - API: http://localhost:8000
  - Docs: http://localhost:8000/docs

Producción:
  - Web: http://192.168.1.100
  - API: http://192.168.1.100/api
```

### Directorios Clave
```
/home/andy/weather_app/
├── backend/        API Python
├── frontend/       HTML + JS
├── Documentación/  .md files
└── Scripts/        .sh, .py
```

### Comandos Frecuentes
```bash
# Desarrollo
./quickstart.sh

# Testing
python3 test_data_sender.py stream 60

# Producción
docker-compose up -d
sudo systemctl start weather-api

# Mantenimiento
python3 maintenance.py stats
python3 maintenance.py cleanup --days 30
```

---

**Última actualización:** 16 de diciembre de 2024  
**Versión:** 1.0.0  
**Estado:** ✅ Production Ready
