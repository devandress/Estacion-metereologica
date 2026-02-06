# 🚀 Configuración ESP32 + Cloudflare + Duck DNS - INICIO RÁPIDO

## 📦 Archivos Nuevos Creados

```
ESP32_CloudflareDuckDNS.ino       ← Código para cargar en ESP32
ESP32_CLOUDFLARE_DUCKDNS.md       ← Guía completa (paso a paso)
VERIFICACION_ESP32.md             ← Troubleshooting y diagnóstico  
test-esp32-setup.sh               ← Script de verificación automática
README_ESP32_SETUP.md             ← Este archivo
```

---

## ⚡ Inicio en 3 Pasos

### Paso 1: Verificar que todo está configurado

```bash
cd /home/andy/Desktop/weather_app
bash test-esp32-setup.sh
```

Debe mostrar:
```
✅ PASS: 8
❌ FAIL: 0  
⚠️  WARN: 0

╔════════════════════════════════════════╗
║  ✅ ¡TODO FUNCIONANDO PERFECTAMENTE!  ║
║  Puedes iniciar el ESP32              ║
╚════════════════════════════════════════╝
```

### Paso 2: Cargar código en ESP32

1. Abrir Arduino IDE
2. Archivo → Abrir → `ESP32_CloudflareDuckDNS.ino`
3. **Editar líneas 24-29:**
   ```cpp
   const char* WIFI_SSID = "Tu_WiFi_Escuela";
   const char* WIFI_PASS = "Tu_Password";
   ```
4. Herramientas → Puerto → Seleccionar puerto ESP32
5. Click Upload (botón con flecha)

### Paso 3: Verificar en Serial Monitor

1. Herramientas → Monitor Serial
2. Baud Rate: `115200`
3. Ver cada 30 segundos:
   ```
   HTTP Code: 201
   ✅ ÉXITO - Datos enviados a webapp
   ```

---

## 🔧 Configuración Duck DNS

### Opción A: Script automático (recomendado)

```bash
# Crear script de actualización
cat > /home/andy/Desktop/weather_app/update-duckdns.sh << 'EOF'
#!/bin/bash
TOKEN="tu-token-aqui"
DOMAIN="estacion-temperatura"

while true; do
    IP=$(curl -s https://api.ipify.org)
    curl "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=$IP"
    echo "[$(date)] IP: $IP"
    sleep 300  # Cada 5 minutos
done
EOF

chmod +x /home/andy/Desktop/weather_app/update-duckdns.sh

# Ejecutar en segundo plano
nohup /home/andy/Desktop/weather_app/update-duckdns.sh > /tmp/duckdns.log &
```

### Opción B: Con cron (más seguro)

```bash
crontab -e

# Agregar esta línea:
*/5 * * * * curl "https://www.duckdns.org/update?domains=estacion-temperatura&token=TU-TOKEN&ip=$(curl -s https://api.ipify.org)"
```

### Opción C: Desde el ESP32 mismo (más fácil)

Ya está incluido en el código `.ino` - descomenta líneas 200-210

---

## 🌐 Configuración Cloudflare (si no lo hiciste)

### 1. Instalar CLI

```bash
# Linux/Raspberry
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared
sudo cp cloudflared /usr/local/bin/
```

### 2. Autenticar

```bash
cloudflared tunnel login

# Se abrirá navegador - autorizar
```

### 3. Crear tunnel

```bash
cloudflared tunnel create weather-station
```

### 4. Config file

```bash
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: weather-station
credentials-file: /home/pi/.cloudflared/[UUID].json

ingress:
  - hostname: api.estacion-temperatura.duckdns.org
    service: http://localhost:8000
  - service: http_status:404
EOF
```

Reemplazar `[UUID]` con tu ID real

### 5. Activar como servicio

```bash
sudo nano /etc/systemd/system/cloudflared.service
```

```ini
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/usr/local/bin/cloudflared tunnel run weather-station
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable cloudflared.service
sudo systemctl start cloudflared.service
```

---

## 📊 Verificar que funciona

```bash
# Test Duck DNS
nslookup estacion-temperatura.duckdns.org
# Debe mostrar tu IP

# Test Cloudflare
curl https://api.estacion-temperatura.duckdns.org/api/stations/
# Debe retornar JSON

# Test ESP32 (Serial Monitor)
# Debe mostrar HTTP Code: 201 cada 30 seg
```

---

## ❌ Si algo no funciona

### Opción 1: Ejecutar script de diagnóstico

```bash
bash test-esp32-setup.sh

# Verá qué está fallando exactamente
```

### Opción 2: Revisar guía completa

```bash
cat ESP32_CLOUDFLARE_DUCKDNS.md | less
# O abrir en editor
```

### Opción 3: Revisar troubleshooting

```bash
cat VERIFICACION_ESP32.md | less
# Tabla de problemas y soluciones
```

---

## 🎯 Resumen de URLs

| Uso | URL |
|-----|-----|
| Dashboard local | http://localhost:8081 |
| API local | http://localhost:8000 |
| API desde internet | https://api.estacion-temperatura.duckdns.org |
| ESP32 envía a | https://api.estacion-temperatura.duckdns.org |
| Duck DNS domain | estacion-temperatura.duckdns.org |

---

## 📚 Documentación

- **ESP32_CLOUDFLARE_DUCKDNS.md** - Guía completa y detallada
- **VERIFICACION_ESP32.md** - Troubleshooting con tabla de diagnóstico
- **test-esp32-setup.sh** - Verificación automática
- **ESP32_CloudflareDuckDNS.ino** - Código para ESP32

---

## 🔐 Seguridad

✅ **Protecciones incluidas:**
- HTTPS con Cloudflare (certificados Let's Encrypt)
- No se exponen puertos locales
- Duck DNS como DNS dinámico seguro
- Token en Cloudflare (regenerable en dashboard)

---

## 📞 Ayuda Rápida

**¿Dónde está tu Token Duck DNS?**
- Ir a https://www.duckdns.org/
- Login
- Ver token junto a tu dominio
- Copiar y guardar seguro

**¿Cómo cambiar SSID/Password del ESP32?**
- Abrir ESP32_CloudflareDuckDNS.ino en Arduino IDE
- Líneas 24-25:
  ```cpp
  const char* WIFI_SSID = "Nueva_WiFi";
  const char* WIFI_PASS = "Nueva_Password";
  ```
- Upload nuevamente

**¿Cada cuánto envía datos el ESP32?**
- Línea 31: `const unsigned long SEND_INTERVAL = 30000;` (30 segundos)
- Cambiar a tu preferencia (ej: 10000 = 10 segundos)

**¿Cómo agregar más sensores?**
- Líneas 300-320 muestran dónde conectarlos
- Editar funciones como `readTemperature()`, `readHumidity()`, etc.

---

## ✅ Checklist Final

```
□ Duck DNS dominio creado y actualizado
□ Cloudflare Tunnel instalado y corriendo
□ .env actualizado con API_URL
□ test-esp32-setup.sh ejecutado exitosamente
□ Arduino IDE configurado para ESP32
□ ESP32_CloudflareDuckDNS.ino cargado en ESP32
□ Serial Monitor muestra "HTTP Code: 201"
□ Dashboard actualiza datos cada 30 segundos
□ Acceso desde externa: https://api.estacion-temperatura.duckdns.org/api/stations/
```

---

**Status:** ✅ Listo para Producción  
**Versión:** 1.0  
**Última actualización:** 2024
