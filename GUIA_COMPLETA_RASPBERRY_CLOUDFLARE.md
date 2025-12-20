# 🍓 GUÍA COMPLETA - WEATHER STATION EN RASPBERRY PI

## 📋 Resumen de las 3 soluciones

### 1️⃣ **Raspberry Pi 16GB** - Ya está hecho ✅
- Script optimizado: `setup_raspberry_optimized.sh`
- PostgreSQL local (bajo consumo)
- Gunicorn + Nginx (eficiente)
- Compatible con Raspberry Pi 4/5

### 2️⃣ **Conexión sin abrir puertos** - Cloudflare Tunnel (Gratuito) ✅
- **NO necesitas**: Acceder al router
- **NO necesitas**: Abrir puertos
- **SÍ necesitas**: Cuenta Cloudflare (gratuita)
- **Resultado**: URL pública: `https://midominio.com`

### 3️⃣ **Terminal Simuladora** - Genera datos fake ✅
- Script: `fake_weather_terminal.py`
- Genera datos aleatorios pero realistas
- Prueba comunicación sin ESP32 real
- Menú interactivo en terminal

---

## 🚀 GUÍA PASO A PASO

### PASO 1: Instalar en Raspberry Pi

#### En tu Raspberry Pi (SSH):

```bash
# 1. Clonar el proyecto
cd /home/pi
git clone https://github.com/tu-usuario/weather_station.git
cd weather_station

# 2. Ejecutar el script de instalación
chmod +x setup_raspberry_optimized.sh
./setup_raspberry_optimized.sh

# Esto instala:
# ✅ Python 3.11 + venv
# ✅ PostgreSQL
# ✅ Nginx + Gunicorn
# ✅ Cloudflare Tunnel
# ✅ Systemd services (automático)
```

**Tiempo**: ~10 minutos

---

### PASO 2: Configurar Cloudflare Tunnel

#### En la Raspberry Pi:

```bash
# 1. Login en Cloudflare (abre navegador)
cloudflared tunnel login

# Se abrirá el navegador pidiendo que autorices

# 2. Crear el túnel
cloudflared tunnel create raspberry-weather

# Verás un identificador como: 12a3b4c5-6d78-9e0f-1234-56789abcdef0

# 3. Configurar DNS (requiere dominio tuyo en Cloudflare)
cloudflared tunnel route dns raspberry-weather tu-dominio.com

# 4. Crear archivo config
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: raspberry-weather
credentials-file: /home/pi/.cloudflared/12a3b4c5-6d78-9e0f-1234-56789abcdef0.json

ingress:
  - hostname: tu-dominio.com
    service: http://localhost:8080
  - service: http_status:404
EOF

# 5. Iniciar el servicio
sudo systemctl start weather-tunnel
sudo systemctl enable weather-tunnel
```

**Ventajas**:
- ✅ Sin abrir puertos en router
- ✅ HTTPS automático
- ✅ URL pública: `https://tu-dominio.com`
- ✅ Gratuito con Cloudflare

---

### PASO 3: Iniciar servicios en Raspberry Pi

```bash
# Iniciar todos los servicios
sudo systemctl start weather-backend
sudo systemctl start weather-frontend
sudo systemctl start weather-tunnel

# O todos a la vez:
sudo systemctl start weather-{backend,frontend,tunnel}

# Habilitar para que se inicien automáticamente
sudo systemctl enable weather-{backend,frontend,tunnel}

# Verificar estado
sudo systemctl status weather-backend
sudo systemctl status weather-frontend
sudo systemctl status weather-tunnel

# Ver logs en tiempo real
sudo journalctl -fu weather-backend
```

---

### PASO 4: Probar con terminal simuladora

#### En tu laptop (NO en Raspberry):

```bash
# Opción 1: Si tienes la carpeta del proyecto
cd weather_app
python3 fake_weather_terminal.py

# Opción 2: Especificar URL
python3 fake_weather_terminal.py http://localhost:8080

# Opción 3: URL pública de Cloudflare Tunnel
python3 fake_weather_terminal.py https://tu-dominio.com

# Opción 4: URL de Heroku (lo que hicimos antes)
python3 fake_weather_terminal.py https://weather-andy-7738-467e8e143413.herokuapp.com
```

#### Opciones del simulador:

```
1 - Enviar un solo dato
2 - Enviar continuamente (cada 60 segundos)
3 - Enviar continuamente (cada 5 segundos) - Para pruebas rápidas
4 - Cambiar URL de API
5 - Salir
```

#### Ejemplo: Prueba rápida (5 segundos, 12 lecturas)

```
Selecciona opción: 3

✅ Probando conexión a API...
✅ API respondiendo:
   Mensaje: Weather Station API
   Versión: 1.0.0

⚠️  Creando estación si no existe...
✅ Estación creada: FAKE_STATION_001

📤 Iniciando envío de datos cada 5 segundos...
Presiona Ctrl+C para detener

✅ 14:32:15 | Temp: 21.3°C | Hum: 58.2% | Viento: 4.8m/s | Presión: 1013.4hPa
✅ 14:32:20 | Temp: 19.8°C | Hum: 62.1% | Viento: 5.2m/s | Presión: 1012.9hPa
✅ 14:32:25 | Temp: 20.5°C | Hum: 60.3% | Viento: 4.5m/s | Presión: 1014.1hPa
...
```

---

## 🏗️ Arquitectura

```
LAPTOP (tu computer)
├── fake_weather_terminal.py
│   └── Envía datos simulados
└── → Internet

          ↓ (a través de)
          
CLOUDFLARE TUNNEL (sin abrir puertos)
├── Encripta tráfico
├── HTTPS automático
└── Mapea: tu-dominio.com → 192.168.1.x:8080

          ↓

RASPBERRY PI (en tu casa)
├── weather-backend (FastAPI)
│   └── :8000 Gunicorn
├── weather-frontend (Nginx)
│   └── :8080 Nginx
├── PostgreSQL
│   └── localhost:5432
└── weather-tunnel (Cloudflare)
    └── Túnel de salida

          ↓

BASE DE DATOS (PostgreSQL en Raspberry)
└── Almacena todos los datos
```

---

## 📊 Características del simulador

### Datos generados:

```
✅ Temperatura: -10 a 40°C
✅ Humedad: 20 a 95%
✅ Punto de rocío: calculado
✅ Velocidad del viento: 0 a 20 m/s
✅ Ráfagas de viento: variable
✅ Dirección del viento: 0-360°
✅ Presión: 970-1030 hPa
✅ Lluvia: 0-2 mm (aleatorio)
```

### Variaciones realistas:

- **Temperatura**: ±2°C de variación suave
- **Humedad**: ±10% de variación
- **Viento**: Cambios gradules
- Datos ligados a la hora (varían junto)

---

## 🔐 Seguridad

### Cloudflare Tunnel proporciona:

✅ **HTTPS automático** - Certificado gratuito  
✅ **DDoS protection** - Automático  
✅ **WAF (Web Application Firewall)** - Protección  
✅ **No expones IP pública** - Túnel privado  
✅ **Puede cerrar en cualquier momento** - Simplemente desactivar  

### Acceso a Raspberry:

```bash
# SOLO desde SSH
ssh pi@192.168.1.x

# NO expones SSH a internet (por Cloudflare Tunnel)
# SOLO expones el puerto 8080 (Frontend)
```

---

## 📱 Resumen de URLs

### Después de Cloudflare Tunnel:

```
Local (en tu casa):        http://localhost:8080
Local (Raspberry IP):      http://192.168.1.x:8080
Pública (Cloudflare):      https://tu-dominio.com
API (local):               http://localhost:8080/api
API (pública):             https://tu-dominio.com/api
Docs (local):              http://localhost:8080/docs
Docs (pública):            https://tu-dominio.com/docs
```

---

## 🐛 Solucionar problemas

### El simulador no se conecta

```bash
# 1. Verificar que los servicios están corriendo en Raspberry
ssh pi@raspberry.local
sudo systemctl status weather-backend
sudo systemctl status weather-frontend

# 2. Verificar que la URL es correcta
# Local: http://localhost:8080 (desde Raspberry)
# Pública: https://tu-dominio.com (desde internet)

# 3. Ver logs
sudo journalctl -fu weather-backend -n 50
```

### Cloudflare Tunnel no funciona

```bash
# Verificar estado
sudo systemctl status weather-tunnel

# Ver logs
sudo journalctl -fu weather-tunnel -n 50

# Reiniciar
sudo systemctl restart weather-tunnel
```

### Base de datos vacía

```bash
# Conectar a PostgreSQL
ssh pi@raspberry.local
psql -U weather_user -d weather_db

# Dentro de psql:
\dt                    # Listar tablas
SELECT * FROM weather_stations;  # Ver estaciones
SELECT COUNT(*) FROM weather_data;  # Contar datos
```

---

## 📈 Monitoreo

### Ver logs en tiempo real:

```bash
# Backend
sudo journalctl -fu weather-backend

# Frontend
sudo journalctl -fu weather-frontend

# Tunnel
sudo journalctl -fu weather-tunnel

# Todos
sudo journalctl -fu weather-* --all
```

### Ver recursos (en Raspberry):

```bash
# CPU y RAM
top -b -n 1 | head -20

# Espacio en disco
df -h

# Temperatura
vcgencmd measure_temp
```

---

## 🎯 Próximos pasos

### Ya tenemos:

1. ✅ **Raspberry Pi**: Sistema ejecutándose
2. ✅ **Cloudflare Tunnel**: URL pública sin abrir puertos
3. ✅ **Terminal simuladora**: Para probar sin hardware

### Para completar (hardware ESP32):

1. Actualizar `WeatherStation_CONFIG.h`:
   ```cpp
   #define API_HOST "tu-dominio.com"
   #define API_PORT 443
   #define USE_HTTPS true
   ```

2. Cargar en ESP32
3. Verás datos en vivo en `https://tu-dominio.com` 🎉

---

## 💾 Respaldo de datos

### Respaldo de BD (en Raspberry):

```bash
# Crear respaldo
pg_dump -U weather_user weather_db > backup_$(date +%Y%m%d).sql

# Restaurar
psql -U weather_user weather_db < backup_20251219.sql

# En cron (automático diario):
0 3 * * * pg_dump -U weather_user weather_db > /home/pi/backups/backup_$(date +%Y%m%d).sql
```

---

## 📞 Soporte rápido

**Terminal simuladora no se conecta**:
- Verificar URL es correcta
- Verificar servicios en Raspberry: `sudo systemctl status weather-*`

**Cloudflare Tunnel no funciona**:
- Verificar credenciales: `cloudflared tunnel list`
- Verificar config.yml: `cat ~/.cloudflared/config.yml`

**Raspberry Pi lento**:
- Verificar CPU: `top`
- Verificar RAM: `free -h`
- Reducir workers en Gunicorn (cambiar `-w 2` a `-w 1`)

---

**Documento creado**: 19 de Diciembre de 2025  
**Versión**: 1.0
