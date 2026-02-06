# 📖 ARQUITECTURA VISUAL - ESP32 + Cloudflare + Duck DNS

## 🏗️ Diagrama General

```
┌─────────────────────────────────────────────────────────────────┐
│                     ESCUELA (Red WiFi)                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │         ESP32 (con sensores meteorológicos)              │  │
│  │         ┌─────────────────────────────┐                  │  │
│  │         │ Temperatura                 │                  │  │
│  │         │ Humedad                     │                  │  │
│  │         │ Presión (BME280)            │                  │  │
│  │         │ Viento (Anemómetro)         │                  │  │
│  │         │ Lluvia (Pluviómetro)        │                  │  │
│  │         └─────────────────────────────┘                  │  │
│  │              │                                            │  │
│  │              │ WiFi: "SchoolWiFi"                        │  │
│  │              │ Port: 8000 (HTTPS POST)                   │  │
│  │              ▼                                            │  │
│  │         Intenta conectar a:                              │  │
│  │         https://api.estacion-temperatura.duckdns.org    │  │
│  │                                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ Internet HTTPS (Puerto 443)
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
    ┌────────────┐  ┌───────────┐  ┌──────────────┐
    │  Duck DNS  │  │Cloudflare │  │  ISP (Tu    │
    │   Dinámico │  │   Tunnel  │  │  escuela)   │
    │            │  │           │  │             │
    │Resuelve:   │  │Redirige:  │  │ IP Pública: │
    │estacion... │  │api.estaci │  │ 201.45.89.. │
    │duckdns.org │  │on...      │  │             │
    │ a TU IP    │  │Escucha:   │  │ (Actualizada│
    │            │  │puerto 443 │  │  c/5 min)   │
    └────────────┘  └───────────┘  └──────────────┘
         │                │
         └────────────────┼─────────────────────────────┐
                          │                             │
         ┌────────────────┴───────────────────┐        │
         │                                    │        │
         ▼                                    │        │
    ┌──────────────────┐                      │        │
    │Resolución DNS    │                      │        │
    │                  │  ◄────────────────────┘        │
    │estacion...       │  Retorna IP:                   │
    │duckdns.org →     │  127.0.0.1 (localhost)        │
    │201.45.89.123     │                               │
    │                  │                               │
    └──────────────────┘                               │
                │                                      │
                │ HTTPS Request                        │
                │ GET/POST /api/stations/...           │
                ▼                                      │
    ┌──────────────────────────────────────┐          │
    │     Cloudflare Tunnel                │          │
    │     (en tu Raspberry Pi)             │          │
    │                                      │          │
    │  Escucha: localhost:8000             │          │
    │  Redirige: tunnel.cloudflare.net     │          │
    │                                      │          │
    └──────────────────────────────────────┘          │
                │                                      │
                │ Conexión local (sin puertos)        │
                ▼                                      │
    ┌──────────────────────────────────────┐          │
    │   FastAPI Backend                    │          │
    │   Puerto 8000 (localhost)            │          │
    │                                      │          │
    │  POST /api/stations/{id}/data        │          │
    │                                      │          │
    └──────────────────────────────────────┘          │
                │                                      │
                │ Almacena datos                      │
                ▼                                      │
    ┌──────────────────────────────────────┐          │
    │   Base de datos                      │          │
    │   (SQLite/PostgreSQL)                │          │
    │                                      │          │
    │   Tabla: meteorological_data         │          │
    │   - id                               │          │
    │   - station_id                       │          │
    │   - temperature                      │          │
    │   - humidity                         │          │
    │   - timestamp                        │          │
    │                                      │          │
    └──────────────────────────────────────┘          │
                │                                      │
                │ API GET /api/stations/              │
                ▼                                      │
    ┌──────────────────────────────────────┐          │
    │   Frontend Dashboard                 │ ◄────────┘
    │   Puerto 8081 (localhost)            │
    │                                      │
    │  Páginas:                            │
    │  - Dashboard (últimos datos)         │
    │  - Mapa (ubicación estaciones)       │
    │  - Gráficos (historial datos)        │
    │  - Estaciones (CRUD)                 │
    │                                      │
    └──────────────────────────────────────┘
                │
                │ Conexión usuario
                ▼
    ┌──────────────────────────────────────┐
    │     Usuario (Navegador)              │
    │                                      │
    │  http://localhost:8081               │ (Escuela)
    │  https://[IP_ESCUELA]:8081           │ (Otra red)
    │  https://api.estacion-...duckdns.org │ (Desde internet)
    │                                      │
    │  Ve datos en tiempo real ✅          │
    │  Gráficos actualizándose             │
    │  Mapa interactivo                    │
    │                                      │
    └──────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos (Paso a Paso)

### T=0 segundos: ESP32 recolecta datos

```
┌────────────┐
│ Sensores   │  DHT22: 22.5°C, 65%
│            │  BME280: 1013.25 Pa
│ Leyendo... │  Anemómetro: 3.5 m/s
└────────────┘
```

### T=1-5 segundos: ESP32 crea JSON

```cpp
{
  "temperature": 22.5,
  "humidity": 65.0,
  "pressure": 1013.25,
  "wind_speed": 3.5,
  "wind_gust": 5.2,
  "wind_direction": 180.0,
  "rainfall": 0.5,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### T=5-10 segundos: Conecta a WiFi y resuelve DNS

```
ESP32: ¿Dónde está api.estacion-temperatura.duckdns.org?

DNS (Duck DNS):
  Busca "estacion-temperatura.duckdns.org"
  Encontró IP: 201.45.89.123
  Añade "api." → api.estacion-temperatura.duckdns.org
  Retorna: 127.0.0.1 (a través de Cloudflare)

ESP32: Conectando a 127.0.0.1:443...
```

### T=10-15 segundos: Cloudflare redirige

```
ESP32 → Cloudflare (HTTPS seguro)
         │
         ├─ Cloudflare verifica conexión
         ├─ Cloudflare redirige a:
         │  Raspberry Pi (localhost:8000)
         │
         └─ Raspberry Pi recibe solicitud:
            POST /api/stations/ESP32_001/data
            Content: JSON con datos

FastAPI Backend: ✅ Recibido
```

### T=15-20 segundos: Almacenar en BD

```
Backend FastAPI:
  1. Parsear JSON
  2. Validar datos
  3. Guardar en BD
  4. Retornar: HTTP 201 Created

BD: INSERT INTO meteorological_data (...)
    VALUES ('ESP32_001', 22.5, 65.0, ...)
```

### T=20-30 segundos: Mostrar en dashboard

```
Frontend (http://localhost:8081):
  1. Hace GET /api/stations/ESP32_001/
  2. Recibe datos actuales
  3. Actualiza gráficos
  4. Muestra en mapa

Usuario ve:
  🌡️  Temperatura: 22.5°C
  💧 Humedad: 65.0%
  💨 Viento: 3.5 m/s
  ✅ Actualizado hace 5 segundos
```

### T=30 segundos: Repetir

```
ESP32 vuelve a comenzar
(El ciclo se repite cada 30 segundos)
```

---

## 🛡️ Seguridad: Capas de Protección

```
┌─────────────────────────────────────────────────────┐
│ Capa 1: WiFi de Escuela                             │
│ - Solo acepta dispositivos autorizados              │
│ - Contraseña WPA2                                   │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Capa 2: Duck DNS                                    │
│ - Dominio dinámico actualizado cada 5 minutos      │
│ - IP privada de escuela (no expuesta)               │
│ - Token necesario para actualizar                   │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Capa 3: HTTPS/SSL                                   │
│ - Certificado Let's Encrypt (Cloudflare)           │
│ - Encriptación TLS 1.3                              │
│ - Puerto 443 (estándar HTTPS)                       │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Capa 4: Cloudflare Tunnel                           │
│ - Redirige HTTPS a localhost (no expone puerto)    │
│ - Conexión encriptada de extremo a extremo         │
│ - Firewall de Cloudflare incluido                   │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Capa 5: Backend Local                               │
│ - FastAPI con validación de entrada                 │
│ - CORS (Cross-Origin Resource Sharing) limitado    │
│ - Base de datos local (acceso limitado)            │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ Resultado: Comunicación Segura E2E                  │
│                                                      │
│ ESP32 → [HTTPS] → Cloudflare → [Local] → FastAPI  │
│ └─────────────────────────────────────┘            │
│   Datos encriptados todo el camino                  │
└─────────────────────────────────────────────────────┘
```

---

## 🔀 Alternativas (Si no puedes usar Cloudflare)

### Opción A: Solo Duck DNS (Sin túnel)

```
Puerto 8000 ABIERTO en Firewall
          │
          ▼
ESP32 → Duck DNS → Escuela IP:8000 → Backend
```

**Ventaja:** Más simple  
**Desventaja:** Expone puerto al internet (menos seguro)

### Opción B: ngrok (Temporal)

```
ngrok tunnel http://localhost:8000
          │
          ▼
ESP32 → ngrok.io → Backend
```

**Ventaja:** Muy simple (un comando)  
**Desventaja:** URL cambia cada 24h (free tier)

### Opción C: VPN (Más complejo)

```
ESP32 ← VPN → Escuela → Backend
```

**Ventaja:** Muy seguro  
**Desventaja:** Requiere configuración VPN

---

## 📊 Comparativa de Soluciones

| Aspecto | Duck DNS | Duck DNS + Tunnel | Duck DNS + ngrok |
|---------|----------|-------------------|------------------|
| Seguridad | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Facilidad | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Costo | Gratis | Gratis | Gratis |
| URL Estable | ✅ | ✅ | ❌ (24h) |
| Puertos Expuestos | ✅ 8000 | ❌ Ninguno | ❌ Ninguno |
| Firewall IT | ⚠️ Bloquea | ✅ Pasa | ✅ Pasa |
| Recomendado para Escuela | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |

---

## 🚀 Proceso de Escalabilidad

```
Fase 1: Prototipo (1 ESP32)
┌─────────────────┐
│ ESP32 #1        │
│ Temperatura     │
└─────────────────┘
         │
         ▼
    Backend + BD
    (Funciona en RPi 3B)

     ↓ 2-3 semanas

Fase 2: Expansión (3-5 ESP32)
┌──────────┐  ┌──────────┐  ┌──────────┐
│ESP32 #1  │  │ESP32 #2  │  │ESP32 #3  │
│Aula 1    │  │Aula 2    │  │Aula 3    │
└──────────┘  └──────────┘  └──────────┘
         │            │            │
         └────────────┼────────────┘
                      ▼
                 Backend + BD
                 (Consideradas RPi 4)

     ↓ 1 mes

Fase 3: Producción (10+ ESP32 + sensores complejos)
┌──────────┐  ┌──────────┐  ┌──────────┐
│Estación 1│  │Estación 2│  │Estación N│
│Azotea    │  │Patio     │  │Jardín    │
│(Completa)│  │(Completa)│  │(Completa)│
└──────────┘  └──────────┘  └──────────┘
         │            │            │
         └────────────┼────────────┘
                      ▼
              Backend + BD
              (Servidor en nube)
              + Alertas
              + Histórico
              + Export

     ↓ Mantenimiento

Fase 4: Integración (Datos públicos)
              │
              ├─ Weather Underground API
              ├─ AEMET (Agencia Meteorología)
              ├─ Compartir datos públicos
              └─ Dashboard web público
```

---

## 💾 Uso de Recursos

```
ESP32 (Memoria):
┌─────────────────────────────────────┐
│ WiFi + SSL + JSON: ~150 KB          │
│ Resto de programa: ~200 KB          │
│ Total disponible: 320 KB            │
│ Estado: ✅ Con margen               │
└─────────────────────────────────────┘

Raspberry Pi (RPi 3B):
┌─────────────────────────────────────┐
│ Backend Python: ~100 MB             │
│ Base de datos (SQLite): ~10 MB      │
│ Frontend: ~5 MB                     │
│ Cloudflare tunnel: ~30 MB           │
│ Total: ~150 MB de 1000 MB (RPi)    │
│ Estado: ✅ Con margen               │
└─────────────────────────────────────┘

Tráfico de datos:
┌─────────────────────────────────────┐
│ 1 POST por ESP32 cada 30 segundos   │
│ Tamaño JSON: ~300 bytes             │
│ 2 POST/min × 1 ESP32 = ~36 KB/hora │
│ 5 ESP32 = ~180 KB/hora              │
│ ~4 MB/día (muy bajo)                │
│ Estado: ✅ Wi-Fi doméstica suficiente│
└─────────────────────────────────────┘
```

---

## 🎓 Diagrama para Explicar en Clase

```
TRANSMISIÓN DE DATOS METEOROLÓGICOS CON IoT + CLOUD

     [Aula]                    [Internet]              [Dashboard]
     ┌──────┐                  ┌─────────┐            ┌─────────┐
     │ ESP32│◄──WiFi 2.4GHz───►│Cloudfl. │◄─HTTPS───►│ Browser │
     │(Sens)│                  │Tunnel   │           │ (Datos) │
     └──────┘                  └─────────┘            └─────────┘
        │                           │
    Sensor 1 ────────────────────┐  │
    Sensor 2 ────────────────────┼──►Duck DNS
    Sensor 3 ────────────────────┘
   (DHT22, etc)
```

**Explicación para alumnos:**
1. Sensores miden temperatura, humedad, etc.
2. ESP32 hace cálculos y crea archivo JSON
3. ESP32 se conecta a WiFi de escuela
4. Envía datos ENCRIPTADOS a Cloudflare
5. Cloudflare redirige a Backend (sin exponerse)
6. Backend guarda en base de datos
7. Dashboard muestra datos en tiempo real
8. Alumnos ven gráficos y actualización automática

---

**Última actualización:** 2024  
**Complejidad:** Intermedia  
**Tiempo para entender:** 30 minutos
