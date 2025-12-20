# ⚡ CHEAT SHEET - REFERENCIA RÁPIDA

## 🚀 Comandos esenciales

### Instalar en Raspberry Pi

```bash
cd /home/pi/weather_station
chmod +x setup_raspberry_optimized.sh
./setup_raspberry_optimized.sh
```

### Iniciar servicios

```bash
sudo systemctl start weather-{backend,frontend,tunnel}
sudo systemctl status weather-{backend,frontend,tunnel}
```

### Ver logs

```bash
sudo journalctl -fu weather-backend -n 50
sudo journalctl -fu weather-frontend -n 50
sudo journalctl -fu weather-tunnel -n 50
```

---

## 🧪 Simulador

### Ejecutar con URL local

```bash
python3 fake_weather_terminal.py http://localhost:8080
```

### Ejecutar con URL Heroku (test rápido)

```bash
python3 fake_weather_terminal.py https://weather-andy-7738-467e8e143413.herokuapp.com
```

### Ejecutar con Cloudflare (después configurado)

```bash
python3 fake_weather_terminal.py https://tu-dominio.com
```

---

## 🔧 Cloudflare Tunnel

### Configurar en Raspberry

```bash
cloudflared tunnel login
cloudflared tunnel create raspberry-weather
cloudflared tunnel route dns raspberry-weather tu-dominio.com
```

### Ver túneles activos

```bash
cloudflared tunnel list
```

### Conectar manualmente (debug)

```bash
cloudflared tunnel run --config ~/.cloudflared/config.yml raspberry-weather
```

---

## 🗄️ Base de datos

### Conectar a PostgreSQL

```bash
psql -U weather_user -d weather_db
```

### Queries útiles

```sql
-- Ver todas las estaciones
SELECT * FROM weather_stations;

-- Ver datos recientes
SELECT * FROM weather_data ORDER BY timestamp DESC LIMIT 10;

-- Contar registros
SELECT COUNT(*) FROM weather_data;

-- Borrar datos antiguos (>30 días)
DELETE FROM weather_data WHERE timestamp < NOW() - INTERVAL '30 days';
```

---

## 📊 URLs

### Endpoint API (Backend)

```
GET    /                              → HTML Frontend
GET    /api/stations                  → Lista estaciones
POST   /api/stations                  → Crear estación
GET    /api/stations/{id}             → Obtener estación
POST   /api/stations/{id}/data        → Enviar datos
GET    /api/stations/{id}/data        → Obtener datos
GET    /api/health                    → Health check
GET    /docs                          → Swagger UI
```

---

## 🐛 Debug rápido

### ¿Está Backend corriendo?

```bash
curl http://localhost:8000/api/health
```

### ¿Está Frontend corriendo?

```bash
curl http://localhost:8080/
```

### ¿Está PostgreSQL corriendo?

```bash
sudo systemctl status postgresql
```

### ¿Está Cloudflare funcionando?

```bash
curl https://tu-dominio.com
```

---

## 📈 Monitoreo

### Recursos del sistema

```bash
# CPU y RAM en tiempo real
top -b -n 1 | head -20

# Espacio en disco
df -h

# Temperatura CPU (Raspberry)
vcgencmd measure_temp

# Procesos Python
ps aux | grep python
```

### Red

```bash
# Ver conexiones activas
netstat -tulpn | grep LISTEN

# Ver interfaces de red
ip addr show
```

---

## 🔄 Servicios systemd

### Ver todos los servicios

```bash
sudo systemctl list-unit-files | grep weather
```

### Editar servicio

```bash
sudo systemctl edit weather-backend
# o
sudo nano /etc/systemd/system/weather-backend.service
```

### Recargar servicios

```bash
sudo systemctl daemon-reload
sudo systemctl restart weather-backend
```

### Deshabilitar servicio

```bash
sudo systemctl disable weather-backend
sudo systemctl stop weather-backend
```

---

## 📁 Rutas importantes

```
/home/pi/weather_station/          → Directorio principal
/home/pi/weather_station/backend/  → Backend FastAPI
/home/pi/weather_station/frontend/ → Frontend Nginx
/home/pi/weather_station/.env      → Variables de entorno
~/.cloudflared/                    → Config Cloudflare Tunnel
/etc/systemd/system/weather-*      → Servicios systemd
/var/log/nginx/                    → Logs Nginx
```

---

## 🆘 Errores comunes

### "Cannot connect to API"
→ Verificar que `weather-backend` está corriendo: `sudo systemctl status weather-backend`

### "Port 8080 already in use"
→ Otro proceso usa el puerto: `sudo lsof -i :8080` y `kill -9 <PID>`

### "Tunnel not connected"
→ Ver logs: `sudo journalctl -fu weather-tunnel`
→ Verificar config: `cat ~/.cloudflared/config.yml`

### "Database connection error"
→ PostgreSQL no está corriendo: `sudo systemctl start postgresql`
→ Credenciales incorrectas en `.env`

### "Permission denied" en scripts
→ Hacer ejecutable: `chmod +x script.sh`

---

## 🎯 Test rápido completo (5 minutos)

```bash
# 1. Verificar servicios
sudo systemctl status weather-{backend,frontend,tunnel}

# 2. Probar backend
curl http://localhost:8000/api/health

# 3. Probar frontend
curl http://localhost:8080/ | head -20

# 4. Probar base de datos
psql -U weather_user -d weather_db -c "SELECT COUNT(*) FROM weather_data;"

# 5. Probar simulador (desde otro terminal)
python3 fake_weather_terminal.py http://localhost:8080
# Seleccionar opción 1 (enviar un dato)

# 6. Verificar que se guardó
psql -U weather_user -d weather_db -c "SELECT * FROM weather_data ORDER BY timestamp DESC LIMIT 1;"
```

---

## 📞 Contacto rápido

**Mi Heroku** (para referencia):
```
Frontend: https://weather-andy-7738-467e8e143413.herokuapp.com
API Docs: https://weather-andy-7738-467e8e143413.herokuapp.com/docs
```

**Mi Raspberry Pi Local** (estando en red local):
```
Frontend: http://192.168.1.x:8080
API: http://192.168.1.x:8000
```

---

**Última actualización**: 19 Dic 2025
