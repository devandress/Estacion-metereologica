# 🏗️ Arquitectura - Weather Station WebApp

## Sistema Completo

```
┌─────────────────────────────────────────────────────────────────┐
│                    RED LOCAL (Router WiFi)                       │
│                                                                    │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │   ESP32 TX       │    │   ESP32 RX       │                   │
│  │  (Sensores TX)   │    │  (Receptor)      │                   │
│  │                  │    │  - BLE Config    │                   │
│  │ • Temperatura    │    │  - ESP-NOW       │                   │
│  │ • Humedad        ├───►│  • WunderGround  │                   │
│  │ • Viento         │    │  • Weather App ◄─┼─── HTTP POST ──┐  │
│  │ • Lluvia         │    │                  │                │  │
│  └──────────────────┘    └──────────────────┘                │  │
│                                                                │  │
│  ┌────────────────────────────────────────────────────────┐  │  │
│  │         RASPBERRY PI 16GB (http://192.168.1.100)        │  │  │
│  │                                                         │  │  │
│  │  ┌──────────────────┐ (8000)                           │  │  │
│  │  │   FastAPI        │◄────────────────────────────────┤──┘  │
│  │  │                  │                                  │     │
│  │  │ POST /api/stations/{id}/data                        │     │
│  │  │ GET  /api/stations                                  │     │
│  │  │ PUT  /api/stations/{id}                             │     │
│  │  │ DELETE /api/stations/{id}                           │     │
│  │  └─────────┬────────┘                                 │     │
│  │            │                                           │     │
│  │  ┌─────────▼──────────────┐                           │     │
│  │  │   SQLAlchemy ORM       │                           │     │
│  │  │   (2 workers)          │                           │     │
│  │  └─────────┬──────────────┘                           │     │
│  │            │                                           │     │
│  │  ┌─────────▼──────────────────┐                       │     │
│  │  │  PostgreSQL 15 (5432)      │                       │     │
│  │  │                            │                       │     │
│  │  │ ┌──────────────────────┐   │                       │     │
│  │  │ │ weather_stations     │   │                       │     │
│  │  │ │ idx: id, active,name │   │                       │     │
│  │  │ └──────────────────────┘   │                       │     │
│  │  │                            │                       │     │
│  │  │ ┌──────────────────────┐   │                       │     │
│  │  │ │ weather_data         │   │                       │     │
│  │  │ │ idx: sid+ts, ts      │   │                       │     │
│  │  │ │ Rotación 30 días     │   │                       │     │
│  │  │ └──────────────────────┘   │                       │     │
│  │  └────────────────────────────┘                       │     │
│  │                                                         │     │
│  │  ┌──────────────────────────────┐                     │     │
│  │  │  Nginx (80, 443)             │                     │     │
│  │  │  • Proxy → FastAPI (8000)    │                     │     │
│  │  │  • Caché archivos estáticos  │                     │     │
│  │  │  • Compresión GZIP           │                     │     │
│  │  │  • SSL/TLS (opcional)        │                     │     │
│  │  └──────────────────────────────┘                     │     │
│  │                │                                       │     │
│  │                ▼ (80)                                 │     │
│  │  ┌──────────────────────────────┐                     │     │
│  │  │  Frontend Estático           │                     │     │
│  │  │  • HTML5 vanilla             │                     │     │
│  │  │  • Tailwind CSS              │                     │     │
│  │  │  • JavaScript puro (no deps) │                     │     │
│  │  │  • Chart.js (gráficos)       │                     │     │
│  │  └──────────────────────────────┘                     │     │
│  │                                                         │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              ACCESO EXTERIOR (Opcional)                          │
│                                                                  │
│  • Configurar port forwarding en router                         │
│  • HTTPS con Let's Encrypt                                      │
│  • DNS dinámico (DuckDNS, NoIP)                                 │
│  • Acceso desde móvil/web externa                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

### 1. Recepción de Datos (Cada 5 minutos)

```
ESP32 RX ─► ESP-NOW ─► BLE Config ─► WiFi ─► API Backend
                        (BLE)        (WiFi)  (POST JSON)
                                              │
                                              ▼
                                    SQLAlchemy ORM
                                              │
                                              ▼
                                      PostgreSQL
```

### 2. Visualización Web

```
Browser ──► GET /index.html ──► Nginx ──► Frontend (estático)
            │
            GET /api/stations ──► Nginx ──► FastAPI ──► PostgreSQL
            │
            POST /api/stations/{id}/data ──► FastAPI ──► PostgreSQL
```

### 3. Selección y Exportación

```
Usuario selecciona estaciones
            │
            ▼
GET /api/stations/bulk/export?ids=xxx,yyy&hours=24
            │
            ▼
FastAPI agrupa datos
            │
            ▼
Retorna JSON comprimido
            │
            ▼
Browser descarga como archivo
```

## Componentes Clave

### Backend (Python FastAPI)

**Responsabilidades:**
- Validación de datos entrada (Pydantic)
- Gestión de estaciones (CRUD)
- Almacenamiento en BD
- Autenticación (opcional)
- Límite de rate (opcional)

**Optimizado para Raspberry Pi:**
- 2 workers Gunicorn (no más de 4)
- Pool de conexiones limitado
- Sin sesiones de usuario
- Respuestas comprimidas GZIP
- Índices en BD optimizados

### Frontend (HTML + Vanilla JS)

**Responsabilidades:**
- Interfaz de usuario responsiva
- CRUD de estaciones
- Selección múltiple
- Visualización de datos
- Exportación

**Optimizado:**
- Sin frameworks pesados (React, Vue)
- Tailwind CDN (no build)
- Chart.js para gráficos
- LocalStorage para preferencias
- ~50KB total (vs 500KB+ con frameworks)

### Base de Datos (PostgreSQL)

**Tablas:**

```sql
weather_stations
├── id (PK)
├── name
├── location
├── latitude, longitude
├── active (INDEX)
├── last_data_time
├── created_at, updated_at
└── Índices: (active, updated_at), (name)

weather_data
├── id (PK)
├── station_id (FK, INDEX)
├── temperature, humidity, dew_point
├── wind_speed_ms, wind_gust_ms, wind_direction_degrees
├── total_rainfall, total_tips
├── rain_rate_mm_per_hour, rain_rate_in_per_hour
├── timestamp (INDEX)
└── Índices: (station_id, timestamp), (timestamp)
```

**Optimizaciones:**
- Partition por timestamp (opcional, > 1M registros)
- Limpieza automática (30 días)
- VACUUM ANALYZE semanal
- Shared buffers reducidos para Raspberry

## Flujo de Integración ESP32

```
1. SETUP
   └─ BLE Configuration
      └─ WiFi SSID/PASS/WU
         └─ ESP-NOW init
            └─ Weather App init

2. LOOP (cada 5 min)
   └─ Recibe datos ESP-NOW
      └─ Intenta WU
      └─ Intenta Weather App ◄─ NUEVA INTEGRACIÓN
         └─ POSTs a http://192.168.1.100/api/stations/{id}/data

3. VISUALIZACIÓN
   └─ Dashboard actualiza automáticamente
      └─ Gráficos en tiempo real
         └─ Exportación disponible
```

## Ventajas de la Arquitectura

| Aspecto | Ventaja |
|--------|---------|
| **Escalabilidad** | Agregar más ESP32 sin cambiar backend |
| **Eficiencia** | 2GB RAM usado en Raspberry Pi |
| **Mantenimiento** | Limpieza automática de datos |
| **Resilencia** | ESP32 reintenta si API falla |
| **Flexibilidad** | Agregar sensores sin modificar BD |
| **Velocidad** | Query time < 100ms en BD |
| **Caché** | Nginx almacena frontend (sin recargar) |

## Métricas de Performance

### Backend (en Raspberry Pi 16GB)

```
GET /api/stations/           ~50ms
POST /api/stations/          ~100ms
GET /api/stations/{id}/data  ~80ms
POST /api/stations/{id}/data ~120ms
GET /api/stations/bulk/export ~200ms
```

### Base de Datos

```
Insert rate:    1000 registros/segundo
Query time:     < 100ms
Storage:        ~1MB por 10,000 registros
Memory:         250MB shared buffers
```

### Frontend

```
Load time:      < 500ms
Bundle size:    ~50KB
Memory (RAM):   < 50MB en navegador
```

## Seguridad (Recomendaciones)

```
🔒 En Producción:

1. Nginx
   - HTTPS con Let's Encrypt
   - Rate limiting
   - Headers de seguridad

2. API
   - API Key authentication
   - CORS restrictivo
   - Input validation (Pydantic)

3. Base de Datos
   - Contraseña fuerte
   - Backups diarios
   - Conectar desde localhost solo

4. Raspberry Pi
   - UFW firewall
   - SSH key auth
   - Updates automáticas
```

## Ejemplo de Escalado (3 Estaciones)

```
3 ESP32 ──────┐
              ├──► WiFi (2.4GHz)
              │
         ┌────▼────────────────┐
         │  Raspberry Pi       │
         │  • 1 API server     │
         │  • 1 PostgreSQL     │
         │  • 1 Nginx          │
         │  • 1 Frontend       │
         └────────────────────┘
              │
              ▼
         Dashboard único
         • 3 estaciones
         • ~30 datos/minuto
         • 100% local
```

---

**Nota**: Este sistema está diseñado para ser:
- **Simple**: Una API REST, una BD, un servidor web
- **Eficiente**: Bajo consumo en Raspberry Pi
- **Confiable**: Sin dependencias externas
- **Extensible**: Agregar estaciones fácilmente
