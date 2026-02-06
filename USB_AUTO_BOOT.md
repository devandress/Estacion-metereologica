# 📱 USB AUTO-BOOT - INSTALACIÓN AUTOMÁTICA EN RASPBERRY PI

## 🎯 ¿Qué es esto?

Un sistema que permite instalar y configurar todo automáticamente en Raspberry Pi sin necesidad de tocar nada:

1. **Preparas el USB** en tu PC con este script
2. **Conectas el USB** a Raspberry Pi
3. **Al bootear**, todo se instala automáticamente ✨
4. **En 15-20 minutos** está corriendo en Raspberry Pi

---

## 📋 Requisitos

```
✓ USB de 32GB o superior (se formateará)
✓ Raspberry Pi 3+ con Raspberry Pi OS Lite
✓ MicroSD con Raspberry Pi OS instalado
✓ Conexión a internet (WiFi o Ethernet)
✓ 15-20 minutos de paciencia al primer boot
```

---

## 🚀 PASO A PASO

### PASO 1: Preparar el USB en tu PC

En tu computadora:

```bash
cd /home/andy/Desktop/weather_app

# Hacer el script ejecutable
chmod +x prepare-usb.sh

# Ejecutar
./prepare-usb.sh
```

El script te pedirá:
1. Conectar el USB
2. Identificar el dispositivo (ej: sdb, sdc)
3. Confirmar el formateo (escribir "si")

**Resultado:**
- USB formateado con toda la estructura del proyecto
- Archivo de instrucciones: `INSTRUCCIONES.txt`
- Script de auto-setup: `auto-setup-first-boot.sh`

### PASO 2: Preparar Raspberry Pi

#### Opción A: Instalación fresca (recomendado)

1. **Descargar Raspberry Pi OS:**
   ```bash
   # Ir a https://www.raspberrypi.com/software/
   # Descargar Raspberry Pi Imager
   ```

2. **Usar Raspberry Pi Imager:**
   - Selecciona: Raspberry Pi OS (Lite)
   - Selecciona: Tu microSD
   - Habilita SSH (Ctrl+Shift+X)
   - Escribe
   - Espera a que termine

3. **Conectar hardware:**
   - Inserta microSD en Raspberry Pi
   - Conecta el USB al puerto USB 3.0 (los negros)
   - Conecta WiFi o Ethernet (si es posible)
   - Conecta alimentación

#### Opción B: Raspberry Pi ya con Raspberry Pi OS

Solo necesitas:
- Insertar el USB
- Reiniciar la Raspberry

### PASO 3: Primer Boot - Instalación Automática

**Lo que ocurre automáticamente:**

1. Raspberry Pi bootea
2. Detecta el USB automáticamente
3. Copia archivos del proyecto
4. Instala Python3, pip, git
5. Crea entorno virtual
6. Instala dependencias (FastAPI, uvicorn, etc)
7. Configura servicios systemd
8. Instala Cloudflare Tunnel
9. Inicia todos los servicios
10. **¡Listo!** 🎉

**Duración:** 15-20 minutos

**Cómo monitorear:**

```bash
# En otra terminal
ssh pi@raspberrypi.local
# Contraseña: raspberry

# Ver logs en vivo
tail -f /var/log/weather-app-setup.log
```

### PASO 4: Verificar que funciona

Cuando termine el setup automático:

```bash
# Ver estado de servicios
ssh pi@raspberrypi.local
sudo systemctl status weather-backend.service

# Acceder al dashboard local
http://raspberrypi.local:8081
# o
http://192.168.1.XXX:8081
```

---

## 📊 Lo que se instala automáticamente

**Paquetes de sistema:**
- Python3
- pip3
- git
- curl
- nano

**Paquetes Python:**
- FastAPI
- uvicorn
- sqlalchemy
- pydantic
- (todos los del requirements.txt)

**Servicios systemd:**
- `weather-backend` (puerto 8000)
- `weather-frontend` (puerto 8081)
- `weather-duckdns` (actualización automática)
- `weather-cloudflare` (opcional, si se configura)

**Características:**
- Auto-arranque en cada reinicio
- Auto-restart si falla un servicio
- Logs persistentes en `/var/log/weather-app-setup.log`
- Configuración pre-personalizada

---

## 🔐 Configuración pre-integrada

Estos valores ya están en el USB:

```
Token Duck DNS:  a64240d0-87b0-4173-a0ca-26b2117c7061
Dominio:         weathermx.duckdns.org
Backend Port:    8000
Frontend Port:   8081
API URL:         https://api.weathermx.duckdns.org
```

**No necesitas configurar nada**, todo está listo.

---

## 🌐 URLs de acceso después de instalar

### Locales (en tu red)

```
Dashboard: http://raspberrypi.local:8081
           http://192.168.1.XXX:8081

API:       http://raspberrypi.local:8000
           http://192.168.1.XXX:8000
```

### Remotos (desde internet)

```
Dashboard: https://weathermx.duckdns.org
API:       https://api.weathermx.duckdns.org
```

---

## ⚙️ Estructura del USB

Cuando insertes el USB en Raspberry Pi, contendrá:

```
USB (sda1)
├── weather_app/
│   ├── auto-setup-first-boot.sh    ← Se ejecuta automáticamente
│   ├── backend/
│   │   ├── main.py
│   │   ├── requirements.txt
│   │   └── app/
│   ├── frontend/
│   │   ├── index.html
│   │   └── js/
│   ├── .env                         ← Configuración (pre-rellenado)
│   └── [todos los otros archivos]
│
└── INSTRUCCIONES.txt                ← Guía de instalación
```

---

## 🔍 Solucionar problemas

### Si el USB no se detecta

**En Raspberry Pi:**

```bash
# Ver dispositivos montados
lsblk

# Montar manual
sudo mkdir -p /mnt/usb
sudo mount /dev/sda1 /mnt/usb

# Ejecutar setup manual
sudo bash /mnt/usb/weather_app/auto-setup-first-boot.sh
```

### Si el setup se atasca

```bash
# Ver logs
tail -f /var/log/weather-app-setup.log

# Matar proceso si es necesario
sudo killall -9 bash
sudo systemctl restart weather-first-boot.service
```

### Si los servicios no inician

```bash
# Ver estado detallado
sudo systemctl status weather-backend.service

# Ver logs
sudo journalctl -u weather-backend.service -f

# Reiniciar
sudo systemctl restart weather-backend.service
```

### Si necesitas configurar Cloudflare

Después de terminar el setup automático:

```bash
ssh pi@raspberrypi.local

# Iniciar Cloudflare
cloudflared tunnel login
cloudflared tunnel create weathermx

# Crear archivo marker para habilitarlo
touch /home/pi/weather_app/.cloudflare-ready

# Reiniciar
sudo reboot
```

---

## 🛠️ Comandos útiles después de instalar

```bash
# Conectar por SSH
ssh pi@raspberrypi.local

# Ver logs en vivo
sudo journalctl -u weather-backend.service -f

# Reiniciar servicios
sudo systemctl restart weather-backend.service
sudo systemctl restart weather-frontend.service

# Ver estado
sudo systemctl status weather-*

# Verificar instalación
bash /home/pi/weather_app/verify-raspberry.sh

# Ver temperatura (Raspberry)
vcgencmd measure_temp

# Desconectar USB (después de terminar setup)
sudo umount /mnt/usb
```

---

## 📝 Checklist de instalación

```
Preparación en PC:
  ☐ Descargaste prepare-usb.sh
  ☐ Conectaste el USB
  ☐ Ejecutaste: chmod +x prepare-usb.sh && ./prepare-usb.sh
  ☐ USB contiene todo el proyecto
  ☐ USB desmontado correctamente

Preparación de Raspberry Pi:
  ☐ Raspberry Pi OS (Lite) en microSD
  ☐ SSH habilitado
  ☐ MicroSD en Raspberry Pi
  ☐ USB conectado a Raspberry Pi
  ☐ Alimentación conectada

Instalación automática:
  ☐ Raspberry Pi boots
  ☐ Detecta USB automáticamente
  ☐ Copia archivos
  ☐ Instala dependencias (15-20 min)
  ☐ Servicios inician automáticamente

Verificación:
  ☐ Acceso a http://raspberrypi.local:8081
  ☐ Backend responde en puerto 8000
  ☐ Duck DNS actualizado
  ☐ ESP32 puede enviar datos
  ☐ Dashboard muestra datos
```

---

## 🎉 ¡Listo!

Tu sistema estará corriendo completamente automático después de 15-20 minutos.

**No necesitas:**
- Tocar terminal
- Configurar nada
- Instalar paquetes
- Editar archivos
- Conocer Linux

**Solo:**
1. Prepara USB
2. Conecta USB
3. Enciende Raspberry Pi
4. Espera 15-20 minutos
5. ¡Disfruta! 🚀

---

## 📞 Contacto

Si algo falla:

1. Revisa los logs: `tail -f /var/log/weather-app-setup.log`
2. Ejecuta: `bash /home/pi/weather_app/verify-raspberry.sh`
3. Lee: `/home/pi/weather_app/MIGRACION_RASPBERRY.md`

---

**Status:** ✅ Listo para Producción  
**Versión:** 1.0  
**Tiempo de instalación:** 15-20 minutos
