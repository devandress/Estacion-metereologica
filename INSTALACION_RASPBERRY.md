# 🍓 GUÍA INSTALACIÓN WEATHERMX EN RASPBERRY PI

## 📋 Requisitos Previos

```
✓ Raspberry Pi 3+ o superior
✓ Raspberry Pi OS instalado (Lite o Desktop)
✓ Conexión a internet WiFi
✓ Acceso SSH habilitado
```

---

## ⚡ Instalación Rápida (5 minutos)

### Paso 1: Conectarse por SSH

```bash
# Desde tu computadora
ssh pi@raspberrypi.local
# o si conoces la IP:
ssh pi@192.168.1.XXX
```

**Contraseña por defecto:** `raspberry`

---

### Paso 2: Descargar el proyecto

```bash
# Crear directorio
mkdir -p /home/pi/weather_app
cd /home/pi/weather_app

# Si tienes Git:
git clone https://github.com/tu-usuario/weather_app.git .

# O si no, copia los archivos manualmente
```

---

### Paso 3: Ejecutar instalador automático

```bash
# Haz el script ejecutable
chmod +x setup-raspberry.sh

# Ejecutar con permisos de administrador
sudo bash setup-raspberry.sh
```

El script hará automáticamente:
- ✅ Instalar dependencias (Python3, pip, git)
- ✅ Crear entorno virtual
- ✅ Instalar librerías (FastAPI, uvicorn, etc)
- ✅ Crear servicios systemd (autoarranque)
- ✅ Descargar Cloudflare Tunnel
- ✅ Iniciar todos los servicios

---

## 🔧 Configuración Manual (Detallado)

Si prefieres hacerlo paso a paso:

### 1. Actualizar sistema

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 2. Instalar dependencias

```bash
sudo apt-get install -y python3 python3-pip python3-venv git curl
```

### 3. Clonar/Descargar proyecto

```bash
cd /home/pi
git clone https://github.com/tu-usuario/weather_app.git
cd weather_app
```

### 4. Crear entorno virtual

```bash
python3 -m venv venv
source venv/bin/activate
```

### 5. Instalar dependencias Python

```bash
pip install -r backend/requirements.txt
```

### 6. Crear archivo .env

```bash
cat > .env << 'EOF'
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
API_URL=https://api.weathermx.duckdns.org
FRONTEND_PORT=8081
DUCKDNS_TOKEN=a64240d0-87b0-4173-a0ca-26b2117c7061
DUCKDNS_DOMAIN=weathermx
DATABASE_URL=sqlite:////home/pi/weather_app/weather_data.db
EOF
```

### 7. Crear servicio Backend

```bash
sudo nano /etc/systemd/system/weather-backend.service
```

Pega esto:

```ini
[Unit]
Description=Weather App Backend
After=network.target

[Service]
Type=notify
User=pi
WorkingDirectory=/home/pi/weather_app
Environment="PATH=/home/pi/weather_app/venv/bin"
ExecStart=/home/pi/weather_app/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Presiona: `Ctrl+O` → Enter → `Ctrl+X`

### 8. Crear servicio Frontend

```bash
sudo nano /etc/systemd/system/weather-frontend.service
```

Pega esto:

```ini
[Unit]
Description=Weather App Frontend
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/weather_app/frontend
ExecStart=/usr/bin/python3 -m http.server 8081 --bind 0.0.0.0
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### 9. Crear servicio Duck DNS

```bash
sudo nano /etc/systemd/system/weather-duckdns.service
```

Pega esto:

```ini
[Unit]
Description=Duck DNS Update
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/bin/bash -c 'while true; do curl -s "https://www.duckdns.org/update?domains=weathermx&token=a64240d0-87b0-4173-a0ca-26b2117c7061&ip=$(curl -s https://api.ipify.org)" >> /tmp/duckdns.log 2>&1; sleep 300; done'
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### 10. Habilitar y iniciar servicios

```bash
sudo systemctl daemon-reload
sudo systemctl enable weather-backend.service
sudo systemctl enable weather-frontend.service
sudo systemctl enable weather-duckdns.service
sudo systemctl start weather-backend.service
sudo systemctl start weather-frontend.service
sudo systemctl start weather-duckdns.service
```

### 11. Verificar estado

```bash
sudo systemctl status weather-backend.service
sudo systemctl status weather-frontend.service
sudo systemctl status weather-duckdns.service
```

---

## 🌐 Configurar Cloudflare Tunnel

### 1. Descargar cloudflared

```bash
# Para Raspberry Pi 3/4 (ARM)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /tmp/cloudflared

# Para Raspberry Pi Zero (ARMv6)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm -o /tmp/cloudflared

# Instalar
chmod +x /tmp/cloudflared
sudo mv /tmp/cloudflared /usr/local/bin/
```

### 2. Autenticar

```bash
cloudflared tunnel login
```

Se abrirá un navegador donde debes:
1. Login en Cloudflare
2. Autorizar
3. Copiar el archivo `.json` que aparece

### 3. Crear tunnel

```bash
cloudflared tunnel create weathermx
```

Guarda el UUID que aparece

### 4. Crear config

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Pega esto (reemplaza `YOUR_UUID` con tu UUID):

```yaml
tunnel: weathermx
credentials-file: /home/pi/.cloudflared/YOUR_UUID.json

ingress:
  - hostname: api.weathermx.duckdns.org
    service: http://localhost:8000
  - hostname: weathermx.duckdns.org
    service: http://localhost:8081
  - service: http_status:404
```

### 5. Crear servicio Cloudflare

```bash
sudo nano /etc/systemd/system/weather-cloudflare.service
```

```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/usr/local/bin/cloudflared tunnel run weathermx
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### 6. Iniciar

```bash
sudo systemctl daemon-reload
sudo systemctl enable weather-cloudflare.service
sudo systemctl start weather-cloudflare.service
```

---

## ✅ Verificar que Funciona

### 1. Local (en tu red)

```bash
# Obtener IP de Raspberry
hostname -I

# Acceder desde navegador
http://192.168.1.XXX:8081     # Frontend
http://192.168.1.XXX:8000     # API
```

### 2. Remoto (desde internet)

```bash
# Desde otra red
curl https://api.weathermx.duckdns.org/api/stations/
# Debe retornar JSON
```

### 3. ESP32

El ESP32 debe estar recibiendo:
```
HTTP Code: 201
✅ ÉXITO - Datos enviados a webapp
```

---

## 🔍 Solucionar Problemas

### Backend no inicia

```bash
# Ver logs detallados
sudo journalctl -u weather-backend.service -f

# Ver el error exacto
sudo systemctl status weather-backend.service
```

**Soluciones:**
- ¿Python3 instalado?: `python3 --version`
- ¿Dependencias instaladas?: `source venv/bin/activate && pip list`
- ¿Puerto en uso?: `sudo lsof -i :8000`

### Frontend no funciona

```bash
sudo systemctl status weather-frontend.service -f
```

**Soluciones:**
- ¿Archivos existen?: `ls -la frontend/`
- ¿Puerto en uso?: `sudo lsof -i :8081`

### Duck DNS no actualiza

```bash
tail -f /tmp/duckdns.log
```

**Soluciones:**
- ¿Token correcto?: Revisa en duckdns.org
- ¿Conectado a internet?: `ping 8.8.8.8`
- ¿curl disponible?: `which curl`

### Cloudflare Tunnel no conecta

```bash
sudo journalctl -u weather-cloudflare.service -f
```

**Soluciones:**
- ¿cloudflared instalado?: `which cloudflared`
- ¿Config existe?: `cat ~/.cloudflared/config.yml`
- ¿Tunnel creado?: `cloudflared tunnel list`

---

## 🔧 Comandos Útiles

```bash
# Ver IP local
hostname -I

# Reiniciar backend
sudo systemctl restart weather-backend.service

# Reiniciar todo
sudo systemctl restart weather-backend.service weather-frontend.service weather-duckdns.service

# Ver logs en vivo
sudo journalctl -u weather-backend.service -f

# Ver procesos
ps aux | grep python

# Matar proceso si está atascado
sudo pkill -f "uvicorn"

# Redimensionar swap (para Raspberry con poco RAM)
sudo nano /etc/dphys-swapfile
# Cambiar CONF_SWAPSIZE=100 a CONF_SWAPSIZE=512
sudo /etc/init.d/dphys-swapfile restart

# Ver uso de recursos
top
# o
htop
```

---

## 📊 Rendimiento en Raspberry Pi

### Recomendaciones

```
✓ Pi Zero/Zero W: Lite OS, sin desktop
✓ Pi 3B+: Funciona perfecto
✓ Pi 4: Excelente rendimiento
```

### Optimizaciones

1. **Reducir temperatura**
   ```bash
   sudo vcgencmd measure_temp
   # Si > 70°C, añade ventilador
   ```

2. **Ver uso de memoria**
   ```bash
   free -h
   ```

3. **Si se queda sin espacio**
   ```bash
   df -h
   sudo apt autoremove
   sudo apt clean
   ```

---

## 🚀 Próximos Pasos

✅ **Instalación completada:**
- Sistema en línea 24/7
- Auto-arranque en reinicio
- Acceso remoto seguro vía Cloudflare

📋 **Checklist:**
- [ ] Raspberry Pi encendida permanentemente
- [ ] WiFi estable
- [ ] Servicios iniciando automáticamente
- [ ] ESP32 enviando datos (ver logs: `journalctl -u weather-duckdns.service -f`)
- [ ] Dashboard accesible en https://weathermx.duckdns.org
- [ ] Datos guardándose en base de datos

---

**Status:** ✅ Listo para Producción  
**Versión:** 1.0  
**Documentación:** 2026
