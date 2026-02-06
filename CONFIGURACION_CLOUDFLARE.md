# 🌐 Guía Completa: Ejecutar Weather App en Cualquier Red

## Problema
Necesitas que la Raspberry Pi ejecute la webapp en la red de la escuela sin:
- Preocuparte por puertos específicos
- Configurar firewalls o port forwarding
- Interacción manual cada vez que se enciende

## Solución: Cloudflare Tunnel + systemd

### ¿Cómo Funciona?

```
Raspberry Pi (Red Escuela)
    ↓
Cloudflare Tunnel (encriptado, sin puertos expuestos)
    ↓
Dominio Público (weather.tudominio.com)
    ↓
Cualquier Dispositivo en Cualquier Red ✓
```

---

## PASO 1: Preparación Inicial (Una sola vez)

### En tu Raspberry Pi:

```bash
cd /home/andy/Desktop/weather_app

# Hacer scripts ejecutables
chmod +x start_weather_app.sh
chmod +x stop_weather_app.sh
chmod +x setup_cloudflare.sh
chmod +x install_services.sh
```

---

## PASO 2: Configurar Cloudflare

### 2.1 Instalar cloudflared
```bash
bash setup_cloudflare.sh
```

### 2.2 Autenticarte con Cloudflare
```bash
cloudflared login
```
Te abrirá un navegador. Inicia sesión con tu cuenta Cloudflare y **autoriza**.

### 2.3 Crear el túnel
```bash
cloudflared tunnel create weather-app
```

Esto crea un archivo `~/.cloudflared/weather-app.json` con tus credenciales.

### 2.4 Configurar tu dominio

Si tienes un dominio en Cloudflare:
```bash
# Reemplaza "tudominio.com" con tu dominio real
cloudflared tunnel route dns weather-app weather.tudominio.com
cloudflared tunnel route dns weather-app api.tudominio.com
```

Si **NO tienes dominio**, Cloudflare te da uno automáticamente:
```bash
cloudflared tunnel run weather-app
```
Busca en la salida: `https://weather-xxxx.trycloudflare.com`

### 2.5 Crear config.yml
```bash
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: weather-app
credentials-file: ~/.cloudflared/weather-app.json

ingress:
  - hostname: weather.tudominio.com
    service: http://localhost:8081
  - hostname: api.tudominio.com
    service: http://localhost:8000
  - service: http_status:404
EOF
```

---

## PASO 3: Instalar Servicios systemd (para startup automático)

### 3.1 Instalar servicios
```bash
sudo bash install_services.sh
```

Esto instala dos servicios:
- **weather-app**: Backend + Frontend + Simuladores
- **cloudflare-tunnel**: Expone la webapp al internet

### 3.2 Iniciar servicios manualmente (para probar)
```bash
sudo systemctl start weather-app
sudo systemctl start cloudflare-tunnel
```

### 3.3 Ver estado
```bash
sudo systemctl status weather-app
sudo systemctl status cloudflare-tunnel
```

### 3.4 Ver logs
```bash
sudo journalctl -u weather-app -f
sudo journalctl -u cloudflare-tunnel -f
```

---

## PASO 4: Verificar que Todo Funciona

### Local (en la Raspberry):
```
http://localhost:8081           → Frontend
http://localhost:8000/api       → Backend API
```

### Desde Cloudflare:
```
https://weather.tudominio.com        → Frontend
https://api.tudominio.com/api        → Backend API
```

### O si usas el dominio de prueba:
```
https://weather-xxxx.trycloudflare.com   → Frontend
https://api-xxxx.trycloudflare.com       → Backend API
```

---

## PASO 5: Reinicio Automático (Lo que pediste)

Una vez instalados los servicios systemd, la Raspberry Pi:

1. **Se enciende**
2. **Automáticamente inicia**:
   - Backend (puerto 8000)
   - Frontend (puerto 8081)
   - Simuladores de estaciones
   - Cloudflare Tunnel
3. **Expone la webapp al internet** sin intervención manual

```bash
# Verificar servicios habilitados
systemctl is-enabled weather-app
systemctl is-enabled cloudflare-tunnel
```

Ambos deben mostrar: `enabled`

---

## COMANDOS ÚTILES

### Iniciar/Detener Servicios
```bash
# Iniciar ambos
sudo systemctl start weather-app cloudflare-tunnel

# Detener ambos
sudo systemctl stop weather-app cloudflare-tunnel

# Reiniciar
sudo systemctl restart weather-app cloudflare-tunnel
```

### Ver Logs en Tiempo Real
```bash
# Todo junto
sudo journalctl -u weather-app -u cloudflare-tunnel -f

# Solo app
sudo journalctl -u weather-app -f

# Solo tunnel
sudo journalctl -u cloudflare-tunnel -f
```

### Deshabilitar Startup Automático
```bash
sudo systemctl disable weather-app
sudo systemctl disable cloudflare-tunnel
```

---

## SOLUCIÓN DE PROBLEMAS

### "cloudflared: command not found"
```bash
# Reinstalar
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
sudo dpkg -i cloudflared.deb
```

### El servicio no inicia
```bash
# Ver error específico
sudo systemctl status weather-app
sudo journalctl -u weather-app -n 50
```

### Cloudflare dice "tunnel not found"
```bash
# Asegúrate de haber creado el túnel
cloudflared tunnel list

# Si no existe, créalo
cloudflared tunnel create weather-app
```

### No se conecta desde la red de la escuela
1. El DNS debe resolver tu dominio
2. Cloudflare debe tener el dominio activo
3. El tunnel debe estar en "Healthy" en el dashboard de Cloudflare

---

## ARQUITECTURA FINAL

```
┌─────────────────────────────────────┐
│      Raspberry Pi (Red Escuela)     │
├─────────────────────────────────────┤
│  systemd Service: weather-app       │
│  ├─ Backend FastAPI (8000)          │
│  ├─ Frontend HTTP (8081)            │
│  └─ Simuladores (threads)           │
├─────────────────────────────────────┤
│  systemd Service: cloudflare-tunnel │
│  └─ Expone al internet (sin puertos)│
└─────────────────────────────────────┘
         ↓ (Cloudflare Tunnel)
┌─────────────────────────────────────┐
│       Internet Público              │
│  (weather.tudominio.com)            │
└─────────────────────────────────────┘
         ↓ (HTTPS/SSL gratis)
┌─────────────────────────────────────┐
│   Cualquier Dispositivo/Red         │
│   (School WiFi, 4G, etc.)          │
└─────────────────────────────────────┘
```

---

## RESUMEN

✅ **Encender Raspberry** → Todo se inicia automáticamente
✅ **Acceso desde cualquier red** → Cloudflare Tunnel
✅ **Sin configurar puertos** → Todo local (8000, 8081)
✅ **HTTPS/SSL gratis** → Cloudflare
✅ **Sin firewalls** → Conexión segura

---

## Siguientes Pasos

1. [Crear cuenta Cloudflare gratuita](https://dash.cloudflare.com/sign-up)
2. Ejecutar `bash setup_cloudflare.sh`
3. Ejecutar `sudo bash install_services.sh`
4. Reiniciar Raspberry Pi y verificar que todo funciona
5. Acceder desde tu teléfono/laptop en la red de la escuela ✓
