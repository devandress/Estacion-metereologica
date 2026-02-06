# 🚀 MIGRACIÓN A RASPBERRY PI - GUÍA PASO A PASO

## 📋 Lo que necesitas

```
✓ Raspberry Pi 3+ o superior con Raspberry Pi OS
✓ Conexión a la misma red WiFi que la Raspberry
✓ Los archivos del proyecto (clima, código ESP32, etc)
✓ Tu Token Duck DNS: a64240d0-87b0-4173-a0ca-26b2117c7061
✓ Tu Dominio: weathermx.duckdns.org
```

---

## ⚡ FORMA RÁPIDA (Recomendado) - 10 minutos

### 1️⃣ Preparar Raspberry Pi

En tu Raspberry Pi (por SSH):

```bash
# Conectarse por SSH
ssh pi@raspberrypi.local
# Contraseña por defecto: raspberry

# Crear directorio
sudo mkdir -p /home/pi/weather_app
sudo chown pi:pi /home/pi/weather_app
cd /home/pi/weather_app
```

### 2️⃣ Descargar archivos

**Opción A: Git (más fácil)**

Si tienes Git:
```bash
git clone https://github.com/tu-usuario/weather_app.git .
```

**Opción B: SCP (desde tu computadora)**

En tu computadora:
```bash
# Transferir archivos
scp -r /home/andy/Desktop/weather_app/* pi@raspberrypi.local:/home/pi/weather_app/
```

**Opción C: USB (si no hay red)**

1. Copia todo a USB en tu PC
2. Conecta USB a Raspberry
3. En Raspberry: `cp -r /media/pi/USB/* /home/pi/weather_app/`

### 3️⃣ Ejecutar instalador automático

```bash
cd /home/pi/weather_app
chmod +x setup-raspberry.sh

# Ejecutar instalador
sudo bash setup-raspberry.sh
```

El script hará todo automáticamente ✨

### 4️⃣ Verificar

```bash
bash verify-raspberry.sh
```

Debe mostrar:
```
✅ PASS: 10+
❌ FAIL: 0
⚠️  WARN: 0-1
```

¡Listo! 🎉

---

## 📖 FORMA DETALLADA - 30 minutos

Si prefieres entender cada paso:

### Paso 1: Preparar Raspberry Pi

```bash
# Conectar por SSH
ssh pi@raspberrypi.local

# Cambiar contraseña (IMPORTANTE)
passwd
# Nueva contraseña: elegir algo seguro

# Actualizar sistema
sudo apt-get update
sudo apt-get upgrade -y

# Instalar herramientas básicas
sudo apt-get install -y git curl wget nano
```

### Paso 2: Descargar proyecto

**Opción A: Clonar Git**

```bash
cd /home/pi
git clone https://github.com/tu-usuario/weather_app.git
cd weather_app
```

**Opción B: Descargar desde tu PC**

En tu PC:
```bash
# Crear archivo comprimido
cd /home/andy/Desktop
tar czf weather_app.tar.gz weather_app/

# Transferir a Raspberry
scp weather_app.tar.gz pi@raspberrypi.local:/home/pi/
```

En Raspberry:
```bash
cd /home/pi
tar xzf weather_app.tar.gz
cd weather_app
```

### Paso 3: Instalar dependencias

```bash
# Actualizar pip
sudo pip3 install --upgrade pip

# Crear entorno virtual
python3 -m venv venv

# Activar
source venv/bin/activate

# Instalar dependencias
pip install -r backend/requirements.txt

# Desactivar por ahora
deactivate
```

### Paso 4: Crear archivo de configuración

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

chmod 600 .env
```

### Paso 5: Crear servicio Backend

```bash
sudo tee /etc/systemd/system/weather-backend.service > /dev/null << 'EOF'
[Unit]
Description=Weather App Backend
After=network.target

[Service]
Type=notify
User=pi
WorkingDirectory=/home/pi/weather_app
Environment="PATH=/home/pi/weather_app/venv/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=/home/pi/weather_app/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF
```

### Paso 6: Crear servicio Frontend

```bash
sudo tee /etc/systemd/system/weather-frontend.service > /dev/null << 'EOF'
[Unit]
Description=Weather App Frontend
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/weather_app/frontend
ExecStart=/usr/bin/python3 -m http.server 8081 --bind 0.0.0.0
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF
```

### Paso 7: Crear servicio Duck DNS

```bash
sudo tee /etc/systemd/system/weather-duckdns.service > /dev/null << 'EOF'
[Unit]
Description=Weather Duck DNS Update
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/bin/bash -c 'while true; do curl -s "https://www.duckdns.org/update?domains=weathermx&token=a64240d0-87b0-4173-a0ca-26b2117c7061&ip=$(curl -s https://api.ipify.org)" >> /tmp/duckdns.log 2>&1; sleep 300; done'
Restart=on-failure
RestartSec=60s

[Install]
WantedBy=multi-user.target
EOF
```

### Paso 8: Activar servicios

```bash
sudo systemctl daemon-reload

# Habilitar para autoarranque
sudo systemctl enable weather-backend.service
sudo systemctl enable weather-frontend.service
sudo systemctl enable weather-duckdns.service

# Iniciar ahora
sudo systemctl start weather-backend.service
sudo systemctl start weather-frontend.service
sudo systemctl start weather-duckdns.service
```

### Paso 9: Verificar

```bash
sudo systemctl status weather-backend.service
sudo systemctl status weather-frontend.service
sudo systemctl status weather-duckdns.service
```

Todos deben estar en verde ✅

---

## 🌐 Configurar Cloudflare (Opcional pero Recomendado)

### Paso 1: Descargar cloudflared

```bash
# Detectar arquitectura
uname -m
# Si dice: aarch64 → arm64
# Si dice: armv7l → arm

# Descargar (ejemplo para ARM64)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o /tmp/cloudflared

# Instalar
chmod +x /tmp/cloudflared
sudo mv /tmp/cloudflared /usr/local/bin/
```

### Paso 2: Autenticar

```bash
cloudflared tunnel login
```

Se abrirá tu navegador:
1. Login en Cloudflare
2. Autorizar acceso
3. Se descargará un archivo `.json`

### Paso 3: Crear túnel

```bash
cloudflared tunnel create weathermx
```

Copia el UUID que aparece

### Paso 4: Crear configuración

```bash
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: weathermx
credentials-file: /home/pi/.cloudflared/YOUR_UUID.json

ingress:
  - hostname: api.weathermx.duckdns.org
    service: http://localhost:8000
  - hostname: weathermx.duckdns.org
    service: http://localhost:8081
  - service: http_status:404
EOF
```

Reemplaza `YOUR_UUID` con el que copiaste en paso 3

### Paso 5: Crear servicio

```bash
sudo tee /etc/systemd/system/weather-cloudflare.service > /dev/null << 'EOF'
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
EOF

sudo systemctl daemon-reload
sudo systemctl enable weather-cloudflare.service
sudo systemctl start weather-cloudflare.service
```

---

## ✅ VERIFICAR QUE TODO FUNCIONA

### 1. Acceso Local

En tu PC (misma red):

```bash
# Obtener IP de Raspberry
ssh pi@raspberrypi.local "hostname -I"
# Aparecerá algo como: 192.168.1.100

# Acceder a Frontend
http://192.168.1.100:8081

# Acceder a API
curl http://192.168.1.100:8000/api/stations/
```

### 2. Acceso Remoto

Desde otra red:

```bash
# Dashboard
https://weathermx.duckdns.org

# API
curl https://api.weathermx.duckdns.org/api/stations/
```

### 3. Datos del ESP32

Ver que ESP32 envía datos:

```bash
# En Raspberry
ssh pi@raspberrypi.local

# Ver logs del backend
sudo journalctl -u weather-backend.service -f

# Busca mensajes de "201" o "éxito"
```

---

## 🔍 SOLUCIONAR PROBLEMAS

### "No puedo conectar por SSH"

```bash
# Desde tu PC
ping raspberrypi.local
# Si no funciona:
ping 192.168.1.XXX  # Reemplaza con IP de Raspberry
```

**Soluciones:**
- ¿Raspberry conectada a WiFi?
- ¿Misma red que tu PC?
- ¿SSH habilitado? En configuración de Raspberry OS

### "El backend no inicia"

```bash
ssh pi@raspberrypi.local
sudo systemctl status weather-backend.service
sudo journalctl -u weather-backend.service -f
```

**Soluciones:**
- ¿Venv activado? `python3 -m venv venv`
- ¿Dependencias instaladas? `pip install -r backend/requirements.txt`
- ¿Puerto disponible? `sudo lsof -i :8000`

### "Duck DNS no actualiza"

```bash
ssh pi@raspberrypi.local
tail -f /tmp/duckdns.log
```

**Soluciones:**
- ¿Token correcto? Revisa en duckdns.org
- ¿Conectado a internet? `ping 8.8.8.8`
- ¿Curl disponible? `which curl`

### "Cloudflare no conecta"

```bash
ssh pi@raspberrypi.local
sudo systemctl status weather-cloudflare.service
sudo journalctl -u weather-cloudflare.service -f
```

**Soluciones:**
- ¿Credenciales correctas? `cat ~/.cloudflared/config.yml`
- ¿Tunnel creado? `cloudflared tunnel list`
- ¿UUID en config?

---

## 🛠️ COMANDOS ÚTILES

```bash
# Conectar por SSH
ssh pi@raspberrypi.local

# Reiniciar servicios
sudo systemctl restart weather-backend.service
sudo systemctl restart weather-frontend.service

# Ver todos los servicios
sudo systemctl status weather-*

# Ver logs en vivo
sudo journalctl -u weather-backend.service -f

# Ver procesos Python
ps aux | grep python

# Ver espacio en disco
df -h

# Ver temperatura
vcgencmd measure_temp

# Reiniciar Raspberry
sudo reboot

# Apagar Raspberry
sudo shutdown -h now
```

---

## 📊 MANTENER FUNCIONANDO

### Reinicio automático

Los servicios se reinician automáticamente si fallan

### Actualizaciones

```bash
# Actualizar código
cd /home/pi/weather_app
git pull

# Reiniciar servicios
sudo systemctl restart weather-backend.service
```

### Monitoreo

Ver que todo funcione 24/7:

```bash
# Crear script de monitoreo
cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
    clear
    echo "Estado de servicios:"
    systemctl status weather-backend --no-pager | grep -E "Active|Main PID"
    systemctl status weather-frontend --no-pager | grep -E "Active|Main PID"
    systemctl status weather-duckdns --no-pager | grep -E "Active|Main PID"
    sleep 10
done
EOF

# Ejecutar
bash monitor.sh
```

---

## 🎉 ¡LISTO!

Tu sistema weather_app está en Raspberry Pi:

✅ **Backend** corriendo en puerto 8000  
✅ **Frontend** corriendo en puerto 8081  
✅ **Duck DNS** actualizado automáticamente  
✅ **Cloudflare Tunnel** redirigiendo tráfico  
✅ **Auto-arranque** en reinicios  

Ahora tu ESP32 puede enviar datos 24/7 a:
- **Local:** http://192.168.1.XXX:8000
- **Remoto:** https://api.weathermx.duckdns.org

---

**Status:** ✅ Listo para Producción  
**Versión:** 1.0
