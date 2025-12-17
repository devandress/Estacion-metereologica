# 🎯 Weather Station WebApp - Guía de Inicio Rápido

## 📁 Estructura del Proyecto

```
weather_app/
├── backend/                    # API FastAPI
│   ├── app/
│   │   ├── api/               # Endpoints
│   │   ├── models/            # Modelos de BD
│   │   ├── schemas/           # Validación Pydantic
│   │   └── core/              # Config, BD
│   ├── main.py               # Entry point
│   └── requirements.txt       # Dependencias
├── frontend/                   # Web estática (Tailwind)
│   ├── index.html
│   └── js/main.js
├── docker-compose.yml         # Full stack con Docker
├── quickstart.sh              # Inicio rápido
├── setup_raspberry.sh         # Setup en Raspberry Pi
├── maintenance.py             # Scripts de mantenimiento
├── test_data_sender.py        # Enviar datos de prueba
└── INTEGRACION_ESP32.md       # Guía integración
```

## 🚀 Opción 1: Inicio Rápido (Desarrollo)

```bash
cd /home/andy/weather_app

# Una línea para todo:
chmod +x quickstart.sh && ./quickstart.sh
```

Luego accede a:
- **Frontend**: http://localhost:8080
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/docs

## 🐳 Opción 2: Con Docker (Recomendado Producción)

```bash
cd /home/andy/weather_app

# Levanta todo: PostgreSQL + Backend + Nginx + Frontend
docker-compose up -d

# Ver logs
docker-compose logs -f backend
```

Acceso: http://localhost (automáticamente en puerto 80)

## 🖥️ Opción 3: En Raspberry Pi (Production)

```bash
# 1. Transferir código a Raspberry Pi
scp -r /home/andy/weather_app pi@192.168.1.100:/home/pi/

# 2. Setup automático
ssh pi@192.168.1.100
cd /home/pi/weather_app
chmod +x setup_raspberry.sh
sudo ./setup_raspberry.sh

# 3. Editar configuración
nano backend/.env

# 4. Iniciar
sudo systemctl start weather-api
sudo systemctl start nginx
```

Acceso: http://192.168.1.100

## 📡 Integración ESP32

1. **Copiar código de integración** a tu `rx.ino`:
   - Ver `INTEGRACION_ESP32.md`
   - O archivo `RX_INTEGRATION.cpp`

2. **Cambiar estos valores en rx.ino**:
   ```cpp
   // Línea ~10
   appClient = new WeatherAppClient("http://192.168.1.100", "ESP32_ESTACION_001");
   ```

3. **Compilar y subir a ESP32**

4. **Verificar en la webapp** después de 5 minutos

## 🧪 Probar sin ESP32

```bash
# Terminal con datos simulados
python3 test_data_sender.py stream 300

# Acceder a http://localhost:8080
# Verás datos llegando en tiempo real
```

## ✨ Características Principales

### Dashboard
- Mostrar todas las estaciones activas
- Última actualización de cada una
- Acceso rápido a detalles

### Gestión de Estaciones
- Crear nueva estación (con BLE o manualmente)
- Editar datos
- Eliminar
- Activar/desactivar

### Selección Múltiple
- Seleccionar varias estaciones con checkboxes
- Exportar datos de todas juntas
- Filtrar por rango de tiempo

### Exportación
- Descargar JSON con todos los datos
- 1 hora, 1 día, 1 semana, 1 mes
- Compatible con análisis externos

## 🔧 API Endpoints (para testing)

```bash
# Crear estación
curl -X POST http://localhost:8000/api/stations/ \
  -H "Content-Type: application/json" \
  -d '{"id":"TEST_001","name":"Test","location":"Lab","latitude":0,"longitude":0}'

# Listar estaciones
curl http://localhost:8000/api/stations

# Enviar datos
curl -X POST http://localhost:8000/api/stations/TEST_001/data \
  -H "Content-Type: application/json" \
  -d '{"station_id":"TEST_001","temperature":25.5,"humidity":60,"wind_speed_ms":2.5,"wind_gust_ms":4.0,"wind_direction_degrees":180,"total_rainfall":0}'

# Obtener datos de estación
curl "http://localhost:8000/api/stations/TEST_001/data?hours=24"

# Exportar múltiples
curl "http://localhost:8000/api/stations/bulk/export?station_ids=TEST_001,TEST_002&hours=168"
```

## 📊 Optimizaciones Raspberry Pi

✅ **Implementadas:**
- Pool conexiones PostgreSQL limitado (2 workers)
- Índices en `station_id + timestamp`
- Limpieza automática de datos > 30 días
- Frontend ligero (sin frameworks pesados)
- Nginx con caché de archivos estáticos
- Gunicorn con 2 workers

```bash
# Monitorear recursos
watch -n 1 'free -h && df -h /home'

# Limpiar datos antiguos (manualmente)
python3 maintenance.py cleanup --days 30

# Ver estadísticas
python3 maintenance.py stats

# Hacer backup
python3 maintenance.py backup
```

## 🔌 Conexión a tu red

### En casa/oficina:
1. Identifica IP de Raspberry Pi
   ```bash
   ping raspberrypi.local
   # O en router, busca el dispositivo
   ```

2. Cambia en ESP32:
   ```cpp
   appClient = new WeatherAppClient("http://192.168.X.X", "ESP32_001");
   ```

3. Accede desde cualquier dispositivo en la red:
   ```
   http://192.168.X.X
   ```

## 🆘 Troubleshooting

### Puerto 8000 en uso
```bash
lsof -i :8000
kill -9 <PID>
```

### Postgresql no inicia
```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

### CORS error en navegador
```
Ya está habilitado. Si falla, editar backend/app/main.py
CORS_ORIGINS=["*"]
```

### Los datos no llegan
1. ¿ESP32 conectado a WiFi? → Ver Serial Monitor
2. ¿API respondiendo? → curl http://localhost:8000/health
3. ¿BD funciona? → psql -U user -d weather_db

## 📝 Próximos Pasos

- [ ] Configurar HTTPS con Let's Encrypt
- [ ] Agregar gráficos de tendencias
- [ ] Sistema de alertas (temperaturas extremas)
- [ ] Integración con Home Assistant
- [ ] APP móvil con Flutter
- [ ] Estadísticas históricas (máximos, mínimos, promedios)

## 📞 Soporte

**Logs para debugging:**

```bash
# Backend
sudo journalctl -u weather-api -f

# Nginx
sudo tail -f /var/log/nginx/error.log

# Systemd
sudo systemctl status weather-api
sudo systemctl restart weather-api

# Base de datos
sudo -u postgres psql weather_db -c "SELECT count(*) FROM weather_data;"
```

---

**¿Primer uso?** Sigue estas líneas:

1. `./quickstart.sh` → Abre http://localhost:8080
2. Crea una estación de prueba
3. `python3 test_data_sender.py stream 60` en otra terminal
4. Verás los datos en vivo en la webapp
5. Sigue `INTEGRACION_ESP32.md` para tu ESP32 real

¡Listo! 🎉
