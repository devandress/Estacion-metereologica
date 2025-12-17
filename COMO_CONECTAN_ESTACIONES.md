# 🌐 Cómo Conectan las Estaciones - Resumen Ejecutivo

## 📡 En 30 segundos

Las estaciones (ESP32, Raspberry, etc) **envían datos vía HTTP POST** a tu servidor:

```
POST http://localhost:8000/api/stations/ESP32_001/data
Content-Type: application/json

{
  "temperature": 22.5,
  "humidity": 65,
  "wind_speed_ms": 3.2,
  "total_rainfall": 0
}
```

**Respuesta:** La API guarda en PostgreSQL y devuelve confirmación (201 Created)

---

## 🏗️ Arquitectura Completa

```
Tu Dispositivo (ESP32)          Tu Servidor (Raspberry Pi)          Tu Navegador
  ├─ DHT22 sensor                ├─ Backend FastAPI                  ├─ Dashboard
  ├─ WiFi                         │  (Puerto 8000)                    │  (Puerto 8080)
  └─ HTTP Client                  │  ├─ POST /stations/data           │
                                  │  ├─ GET /stations/                │
       |                          │  └─ PUT/DELETE/etc                │
       |   HTTP POST              │                                    │
       |  (cada 5 min)            |                                    |
       |──────────────────────────>│                                    │
                                  │  PostgreSQL Database              │
                                  │  ├─ weather_stations              │
                                  │  └─ weather_data                  │
                                  │                                    │
                                  │                                    │
                                  |   JSON API                        │
                                  |<──────────────────────────────────│
                                  │                                    │
                                  │                                    │
                                  └────────────────────────────────────┘
```

---

## 🔢 Endpoints Disponibles

### 1. **Crear Estación** (una sola vez)
```
POST /api/stations/
{
  "id": "ESP32_001",
  "name": "Mi Estación",
  "location": "Mi Casa",
  "latitude": 40.4168,
  "longitude": -3.7038
}
```

### 2. **Enviar Datos** (cada 5 minutos)
```
POST /api/stations/ESP32_001/data
{
  "temperature": 22.5,
  "humidity": 65,
  "wind_speed_ms": 3.2,
  "total_rainfall": 0
}
```

### 3. **Leer Datos** (desde web)
```
GET /api/stations/ESP32_001/data?hours=24
```

### 4. **Listar Estaciones** (desde web)
```
GET /api/stations/
```

---

## 🚀 3 Formas de Conectar

### Opción A: ESP32 + Arduino (RECOMENDADO)

**Archivo:** `WeatherStation_ESP32.ino`

```cpp
// 1. Conectar DHT22 a GPIO 4
// 2. Configurar WiFi
const char* SSID = "MiRed";
const char* PASSWORD = "MiContraseña";
const char* API_HOST = "192.168.1.100";

// 3. Cargar código
// 4. Abre Serial Monitor (9600 baud)
// 5. Verá datos en Dashboard
```

**Ventajas:**
- ✅ Bajo costo (ESP32 ~$5)
- ✅ Bajo consumo (con sleep mode: meses)
- ✅ Múltiples sensores (temperatura, humedad, viento, lluvia)
- ✅ Completamente autónomo

---

### Opción B: Python en Raspberry Pi (ALTERNATIVA)

**Archivo:** `test_enviar_datos.py`

```bash
python3 test_enviar_datos.py
```

O desde código Python:

```python
import requests

# Crear estación
requests.post("http://localhost:8000/api/stations/", json={
    "id": "RASPBERRY_001",
    "name": "Mi Raspberry",
    "location": "Taller",
    "latitude": 40.0,
    "longitude": -3.0
})

# Enviar datos (con sensor DHT22)
requests.post("http://localhost:8000/api/stations/RASPBERRY_001/data", json={
    "temperature": 22.5,
    "humidity": 65
})
```

**Ventajas:**
- ✅ Fácil de programar
- ✅ Muchas librerías disponibles
- ✅ Puedes correr en el servidor mismo
- ⚠️ Mayor consumo de energía

---

### Opción C: cURL / Bash (TESTING)

```bash
# Crear estación
curl -X POST http://localhost:8000/api/stations/ \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TEST_001",
    "name": "Test",
    "location": "Lab",
    "latitude": 40,
    "longitude": -3
  }'

# Enviar datos
curl -X POST http://localhost:8000/api/stations/TEST_001/data \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 22.5,
    "humidity": 65
  }'

# Ver datos
curl http://localhost:8000/api/stations/TEST_001/data?hours=24
```

**Ventajas:**
- ✅ Rápido para testing
- ✅ No requiere código
- ❌ No es escalable

---

## 📊 Base de Datos

Los datos se guardan automáticamente en PostgreSQL:

### Tabla: `weather_stations`
```
id          VARCHAR(50)  - ID único (ESP32_001)
name        VARCHAR(255) - Nombre descriptivo
location    VARCHAR(255) - Ubicación
latitude    FLOAT        - Latitud
longitude   FLOAT        - Longitud
active      BOOLEAN      - Estado
last_data_time TIMESTAMP - Última lectura
created_at  TIMESTAMP    - Fecha creación
```

### Tabla: `weather_data`
```
id              UUID         - ID único del registro
station_id      VARCHAR(50)  - FK a weather_stations
temperature     FLOAT        - °C
humidity        FLOAT        - %
wind_speed_ms   FLOAT        - m/s
wind_gust_ms    FLOAT        - m/s
wind_direction  INT          - 0-360°
total_rainfall  FLOAT        - mm
created_at      TIMESTAMP    - Cuando se recibió
processed       BOOLEAN      - Si fue procesado
```

---

## ✅ Checklist de Integración

### 1. Preparación
- [ ] Backend corriendo en puerto 8000
- [ ] Frontend corriendo en puerto 8080
- [ ] PostgreSQL inicializado
- [ ] WiFi disponible

### 2. Crear Estación (una vez)
- [ ] ID único (ej: ESP32_001)
- [ ] Nombre descriptivo
- [ ] Ubicación (ciudad/lugar)
- [ ] Coordenadas correctas (lat, lng)

### 3. Conectar Dispositivo
- [ ] ESP32 conectado a DHT22
- [ ] WiFi configurado en código
- [ ] API_HOST actualizado
- [ ] Código cargado

### 4. Verificación
- [ ] Monitor Serial mostrando "✅ Datos enviados"
- [ ] Dashboard actualizándose
- [ ] Mapa mostrando la estación
- [ ] Datos históricos disponibles

---

## 🔍 Debugging

### "No se envían datos"

```bash
# 1. Verificar que backend corre
curl http://localhost:8000/api/health

# 2. Verificar WiFi (ESP32)
# Monitor Serial debe mostrar: "✅ WiFi conectado"

# 3. Verificar estación existe
curl http://localhost:8000/api/stations/ESP32_001

# 4. Enviar dato de prueba
curl -X POST http://localhost:8000/api/stations/ESP32_001/data \
  -H "Content-Type: application/json" \
  -d '{"temperature": 22.5, "humidity": 65}'

# 5. Ver datos
curl http://localhost:8000/api/stations/ESP32_001/data?hours=24
```

### "Estación no aparece en el mapa"

- [ ] ¿Está la estación creada?
- [ ] ¿Tiene coordenadas válidas?
- [ ] ¿Ha enviado al menos 1 dato?
- [ ] ¿El navegador está actualizado (F5)?

### "API retorna 404"

- [ ] ID de estación correcto
- [ ] Estación fue creada antes
- [ ] URL correcta: `/api/stations/{ID}/data`

### "API retorna 400 (Bad Request)"

- [ ] JSON válido (prueba con jsonlint.com)
- [ ] Campos requeridos presentes (temperature, humidity)
- [ ] Valores numéricos válidos

---

## 📱 Flujo en Tiempo Real

```
08:00 - ESP32 inicia
08:00 - ✅ Conecta WiFi
08:05 - 📊 Lee DHT22: 22.5°C, 65%
08:05 - 📤 POST a /api/stations/ESP32_001/data
08:05 - ✅ Respuesta 201 Created
08:05 - 💾 Guardado en PostgreSQL
08:05 - 🌐 Frontend recarga datos
08:05 - 👁️ Usuario ve en Dashboard/Mapa

...espera 5 minutos...

08:10 - 📊 Lee DHT22: 22.8°C, 64%
08:10 - 📤 POST a /api/stations/ESP32_001/data
...continúa cada 5 minutos indefinidamente...
```

---

## 🎯 Casos de Uso

### Usar Caso 1: Monitor en Casa
```
ESP32 + DHT22 + Batería → Pared del dormitorio
Envía cada 30 minutos → WiFi de casa
Datos históricos → Exportar a Excel
```

### Caso de Uso 2: Invernadero
```
ESP32 + DHT22 + Anemómetro + Pluviómetro → Invernadero
Envía cada 5 minutos → WiFi o 4G
Alertas → Si temp < 5° o humedad > 90%
```

### Caso de Uso 3: Red de Estaciones
```
10x ESP32 en diferentes puntos de la ciudad
Cada uno envía cada 5 minutos
Dashboard muestra todas las estaciones en mapa
Exportar datos para análisis
```

---

## 📦 Archivos de Referencia

| Archivo | Descripción | Uso |
|---------|-------------|-----|
| `WeatherStation_ESP32.ino` | Código Arduino completo | Cargar en ESP32 |
| `test_enviar_datos.py` | Script Python interactivo | Testing/Debugging |
| `INTEGRACION_ESTACIONES.md` | Documentación completa | Referencia |
| `api_test.sh` | Script bash para testing | Pruebas rápidas |

---

## 🔐 Seguridad (En Desarrollo)

Actualmente:
- ✅ API sin autenticación (válido para red local)
- ✅ HTTP en localhost
- ⚠️ NO usar en internet público

Para producción:
- [ ] Agregar API Key
- [ ] HTTPS/SSL
- [ ] Autenticación OAuth
- [ ] Rate limiting
- [ ] CORS restringido

---

## 📈 Escalabilidad

### Capacidad Teórica:
- **Estaciones:** 100+ simultáneamente
- **Datos por estación:** 288/día (cada 5 min)
- **Almacenamiento:** ~50 MB/estación/año
- **DB:** PostgreSQL optimizado

### Hardware Mínimo:
- Raspberry Pi 3B+: 500+ estaciones
- Raspberry Pi 4: 1000+ estaciones
- VPS pequeño: 10000+ estaciones

---

## 🚀 Próximos Pasos

1. **Ahora:** Prueba con test_enviar_datos.py
2. **Mañana:** Carga el código en ESP32
3. **Dentro de 3 días:** Tienes 12 datos históricos
4. **Dentro de 1 mes:** 8,640 datos = Análisis significativos
5. **Dentro de 1 año:** 3,153,600 datos = Histórico completo

---

## ❓ Preguntas Frecuentes

**P: ¿Cuántos datos puedo enviar?**  
A: Ilimitados. Recomendado: 1 cada 5 minutos = 288/día

**P: ¿Qué pasa si no hay WiFi?**  
A: ESP32 reintenta cada 10 segundos hasta conectar

**P: ¿Los datos se pierden si cae el backend?**  
A: Sí, pero el ESP32 reintenta automáticamente

**P: ¿Puedo cambiar el intervalo de envío?**  
A: Sí, cambia SEND_INTERVAL en el código

**P: ¿Funciona con otros sensores?**  
A: Sí, modifica las funciones readSensors() en el código

**P: ¿Puedo agregar más estaciones?**  
A: Sí, crea más ESP32 con IDs diferentes

---

## 📞 Soporte

Para problemas:

1. **Revisa los logs:**
   ```bash
   tail -f /tmp/backend.log
   ```

2. **Prueba la API directamente:**
   ```bash
   curl http://localhost:8000/api/stations/
   ```

3. **Verifica el Monitor Serial (ESP32)**
   - 115200 baud
   - Busca errores de WiFi o HTTP

4. **Abre la consola del navegador (F12)**
   - Busca errores de CORS o conexión

---

**¡Ya está todo configurado! Ahora tu estación puede enviar datos. 🚀**

