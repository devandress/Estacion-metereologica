# 🏗️ Arquitectura - Weather Station App Mejorada

## Sistema General

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIOS/CLIENTES                         │
└──┬──────────────────┬──────────────────┬────────────────────┘
   │                  │                  │
   ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Web)                          │
│  • Dashboard                                                 │
│  • Mapa Interactivo (Leaflet.js)                            │
│  • Gestión de Estaciones                                    │
│  • Exportar Datos                                           │
└──┬────────────────────────────────────────────────────────┘
   │
   │ HTTP/REST
   │
   ▼
┌──────────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              API Routers                               │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────┐ │  │
│  │  │   Stations   │ │ External     │ │ Public Access  │ │  │
│  │  │   • CRUD     │ │ Data         │ │ • Share Links  │ │  │
│  │  │   • Stats    │ │ • Sources    │ │ • Export       │ │  │
│  │  │   • Health   │ │ • Records    │ │ • Permissions  │ │  │
│  │  └──────────────┘ └──────────────┘ └────────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
│                           ▲                                   │
└───────────────┬───────────────────────────────────────────────┘
                │
                │ ORM (SQLAlchemy)
                │
                ▼
┌───────────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE                              │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Tablas:                                                  │ │
│  │ • weather_stations                                       │ │
│  │ • weather_data                                           │ │
│  │ • external_data_sources                                  │ │
│  │ • external_data_records                                  │ │
│  │ • public_share_links                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘

        ▲                               ▲
        │ Datos Externos               │ Acceso Público
        │                              │
┌───────┴──────────────┐    ┌──────────┴──────────┐
│ Fuentes Externas     │    │ Usuarios Públicos   │
│ • OpenWeatherMap     │    │ (Token de Acceso)   │
│ • AEMET              │    │                     │
│ • WeatherAPI         │    │ Permisos:           │
│ • IPMA               │    │ • Ver datos actuales│
│ • SMHI               │    │ • Ver historial     │
│ • Custom             │    │ • Descargar         │
└──────────────────────┘    └─────────────────────┘
```

---

## Flujo de Datos Externos

```
┌─────────────────────┐
│  Fuente Externa     │
│  (OpenWeatherMap)   │
└──────────┬──────────┘
           │ API Request
           ▼
┌──────────────────────────────────────┐
│ POST /api/external/data              │
│ {                                    │
│   source_id: "...",                  │
│   raw_data: {...}                    │
│ }                                    │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│ ExternalDataRecord (Modelo)                      │
│ • Almacenar datos brutos                         │
│ • Validar con Pydantic                           │
│ • Transformar usando field_mapping               │
└──────────┬───────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│ Background Task (process_external_data)          │
│ • Extraer normalized_data                        │
│ • Mapear a WeatherStation si existe              │
│ • Crear WeatherData record                       │
│ • Marcar como procesado                          │
└──────────┬───────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│ WeatherData (Tabla)                              │
│ • Temperatura, humedad, viento, lluvia           │
│ • Timestamp                                      │
│ • Disponible en dashboard y API                  │
└──────────────────────────────────────────────────┘
```

---

## Flujo de Enlaces Compartibles

```
┌──────────────────┐
│ Crear Share Link │
│ POST /...link    │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ PublicShareLink (Modelo)                   │
│ • Generar token único (secrets.token_...)  │
│ • Asociar con estación                     │
│ • Definir permisos                         │
│ • Configurar expiración                    │
│ • Limitar accesos                          │
└────────┬───────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│ Enlace Público                                             │
│                                                            │
│ http://app.com/share?token=AbCdEfG123                      │
│                                                            │
│ Acceso:                                                    │
│ • Sin autenticación                                        │
│ • Permisos limitados (ver, descargar, etc)               │
│ • Expira automáticamente                                   │
│ • Tracking de accesos                                      │
└────────┬───────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────┐
│ Endpoints Públicos                         │
│ • /api/public/station/{token}              │
│ • /api/public/station/{token}/current      │
│ • /api/public/station/{token}/history      │
│ • /api/public/station/{token}/export       │
└────────────────────────────────────────────┘
```

---

## Estructura de Base de Datos

```sql
-- Estaciones (existente)
weather_stations
├── id (PK)
├── name
├── location
├── latitude
├── longitude
├── active
├── last_data_time
└── created_at

-- Datos de clima (existente)
weather_data
├── id (PK)
├── station_id (FK → weather_stations)
├── temperature
├── humidity
├── wind_speed_ms
├── wind_direction_degrees
├── total_rainfall
└── timestamp

-- Fuentes externas (NUEVA)
external_data_sources
├── id (PK)
├── name
├── source_type (ENUM)
├── api_key
├── api_url
├── field_mapping (JSON)
├── active
├── last_sync
└── sync_interval_minutes

-- Registros externos (NUEVA)
external_data_records
├── id (PK)
├── source_id (FK → external_data_sources)
├── station_id (FK → weather_stations, nullable)
├── raw_data (JSON)
├── normalized_data (JSON)
├── location_name
├── latitude
├── longitude
├── processed
├── error_message
└── received_at

-- Enlaces públicos (NUEVA)
public_share_links
├── id (PK)
├── station_id (FK → weather_stations)
├── token (UNIQUE)
├── description
├── can_view_data
├── can_view_current
├── can_view_history
├── can_download
├── active
├── expires_at
├── access_count
├── max_accesses
└── created_at
```

---

## Árbol de Archivos - Nuevas Funcionalidades

```
weather_app/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── stations.py              (MEJORADO: +stats, +health)
│   │   │   ├── external_data.py         (NUEVO: ingesta)
│   │   │   └── public_access.py         (NUEVO: acceso público)
│   │   ├── models/
│   │   │   ├── station.py               (existente)
│   │   │   └── external_data.py         (NUEVO: modelos)
│   │   └── schemas/
│   │       ├── station.py               (existente)
│   │       └── external_data.py         (NUEVO: schemas)
│   └── main.py                          (MODIFICADO: +routers)
│
├── frontend/
│   ├── index.html                       (MODIFICADO: +Leaflet)
│   ├── js/
│   │   ├── main.js                      (MODIFICADO: +map)
│   │   └── map.js                       (NUEVO: módulo mapa)
│
├── NUEVAS_FUNCIONALIDADES.md            (NUEVA: documentación)
├── IMPLEMENTACION_COMPLETADA.md         (NUEVA: resumen)
└── api_test.sh                          (NUEVO: script de pruebas)
```

---

## Stack Tecnológico

### Backend
- **FastAPI** - Framework REST
- **SQLAlchemy** - ORM
- **PostgreSQL** - Base de datos
- **Pydantic** - Validación de datos
- **Python 3.10+** - Lenguaje

### Frontend
- **HTML5/CSS3** - Markup & Styles
- **JavaScript (ES6+)** - Interactividad
- **Tailwind CSS** - Diseño
- **Leaflet.js** - Mapas interactivos
- **Chart.js** - Gráficos

### DevOps
- **Docker** - Containerización
- **Nginx** - Servidor web
- **Systemd** - Servicios

---

## Flujos de Permiso - Enlaces Públicos

```
┌─ can_view_data ─────────────────────┐
│                                     │
├─ can_view_current ──→ GET /current │
│                                     │
├─ can_view_history ──→ GET /history │
│                                     │
└─ can_download ──────→ GET /export  │

Ejemplo de matriz de permisos:

┌──────────────────────┬─────┬─────────┬─────────┬──────────┐
│ Tipo de Enlace       │ Ver │ Actual  │ Historial│Descargar│
├──────────────────────┼─────┼─────────┼─────────┼──────────┤
│ Público Lectura      │ ✓   │ ✓       │ ✓       │ ✗        │
│ Compartir Amigos     │ ✓   │ ✓       │ ✓       │ ✓        │
│ Report Solo Actual   │ ✓   │ ✓       │ ✗       │ ✗        │
│ Investigación        │ ✓   │ ✓       │ ✓       │ ✓        │
└──────────────────────┴─────┴─────────┴─────────┴──────────┘
```

---

## Monitoreo de Salud (Health Check)

```
                      ┌─ Healthy (< 1h)
                      │
last_data_time ──────┼─ Warning (1-24h)
                      │
                      └─ Stale (> 24h)

                      ┌─ healthy      ✅ Normal
                      │
status = ─────────────┼─ warning      ⚠️ Revisar
                      │
                      ├─ stale        🔴 Crítico
                      │
                      ├─ no_data      ❌ Nunca reportó
                      │
                      └─ inactive     ⏸️ Desactivada
```

---

## Escalabilidad - Recomendaciones

### Corto plazo (< 1000 estaciones)
- Base de datos local PostgreSQL
- Un servidor FastAPI
- Nginx como proxy
- Todo en Raspberry Pi 16GB ✓

### Mediano plazo (1000-10000 estaciones)
- PostgreSQL en servidor dedicado
- Múltiples instancias FastAPI (load balancer)
- Redis para caching
- Elasticsearch para búsquedas

### Largo plazo (10000+ estaciones)
- Base de datos distribuida (Timescale DB)
- Kafka para ingesta de datos
- Workers asincronos (Celery)
- CDN para frontend
- Microservicios por dominio

---

## Seguridad - Checklist

- ✅ Tokens únicos y seguros (secrets module)
- ✅ Validación de entrada (Pydantic)
- ✅ CORS configurado
- ⚠️ TODO: Autenticación de usuarios (JWT)
- ⚠️ TODO: Rate limiting
- ⚠️ TODO: HTTPS/TLS en producción
- ⚠️ TODO: Encripción de API keys
- ⚠️ TODO: Auditoría de cambios
- ⚠️ TODO: Backup automático

---

## Métricas - Ejemplo de Dashboard Futuro

```
┌────────────────────────────────────────┐
│         DASHBOARD OPERACIONAL           │
├────────────────────────────────────────┤
│ Estaciones Online:        8/10  ✓       │
│ Datos Frescos (24h):      92%   ✓       │
│ Promedio Temperatura:     18.5°C        │
│ Lluvia Total Hoy:         2.3mm         │
├────────────────────────────────────────┤
│ Últimas 24 horas:                       │
│ • Registros Procesados:   2,880         │
│ • Errores:                12            │
│ • Fuentes Síncronizadas:  6/6           │
├────────────────────────────────────────┤
│ Accesos Públicos:                       │
│ • Enlaces Activos:        15            │
│ • Accesos Hoy:            342           │
│ • Descargas:              28            │
└────────────────────────────────────────┘
```

---

**Última actualización:** 16 de diciembre de 2024
**Versión:** 1.0.0
**Status:** ✅ Producción

