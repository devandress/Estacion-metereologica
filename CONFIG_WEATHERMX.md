# ⚙️ CONFIGURACIÓN WEATHERMX - TUS DATOS

## 🔐 Credenciales Personales

```
Dominio Duck DNS:    weathermx.duckdns.org
Token Duck DNS:      a64240d0-87b0-4173-a0ca-26b2117c7061
IP Escuela:          177.236.54.241
```

---

## ✅ Archivos Automáticamente Configurados

Los siguientes archivos **YA ESTÁN ACTUALIZADOS** con tu información:

### 1. ESP32_CloudflareDuckDNS.ino
```cpp
const char* DUCKDNS_DOMAIN = "weathermx.duckdns.org";
const char* API_URL = "https://api.weathermx.duckdns.org";
const char* DUCKDNS_TOKEN = "a64240d0-87b0-4173-a0ca-26b2117c7061";
```

✅ **LISTO PARA CARGAR EN ESP32**

---

## 🚀 PASOS SIGUIENTES

### Paso 1: Cargar Código en ESP32

1. Abre **Arduino IDE**
2. File → Open → `ESP32_CloudflareDuckDNS.ino`
3. Edita solo líneas 24-25 (WiFi de tu escuela):
   ```cpp
   const char* WIFI_SSID = "Tu_WiFi_de_Escuela";
   const char* WIFI_PASS = "Tu_Contraseña";
   ```
4. Tools → Port → Selecciona tu puerto COM ESP32
5. Click **Upload** (botón con flecha)

### Paso 2: Verificar Configuración

```bash
cd /home/andy/Desktop/weather_app
bash test-esp32-setup.sh
```

Debe mostrar:
```
✅ Duck DNS resuelve: weathermx.duckdns.org
✅ IP: 177.236.54.241
✅ Cloudflare CNAME resuelve
✅ HTTPS funciona desde Cloudflare
```

### Paso 3: Ver Datos en Tiempo Real

1. **Serial Monitor en Arduino IDE:**
   - Tools → Serial Monitor
   - Baud Rate: 115200
   - Cada 30 segundos verás:
   ```
   HTTP Code: 201
   ✅ ÉXITO - Datos enviados a webapp
   ```

2. **Dashboard en navegador:**
   - http://localhost:8081
   - Ir a "Estaciones" o "Mapa"
   - Buscar "ESP32_ESCUELA_001"
   - Ver datos actualizándose en tiempo real

---

## 📊 URLs Configuradas

| Servicio | URL |
|----------|-----|
| **Dashboard Local** | http://localhost:8081 |
| **API Local** | http://localhost:8000 |
| **API Remota (Cloudflare)** | https://api.weathermx.duckdns.org |
| **Duck DNS** | weathermx.duckdns.org → 177.236.54.241 |
| **Cloudflare Dashboard** | https://dash.cloudflare.com/ |

---

## 🔧 Configuración Duck DNS (Tu Token)

Tu token ya está guardado en el código del ESP32. Para referencias futuras:

```bash
# Actualizar IP manualmente si es necesario:
curl "https://www.duckdns.org/update?domains=weathermx&token=a64240d0-87b0-4173-a0ca-26b2117c7061&ip=$(curl -s https://api.ipify.org)"

# Verificar DNS resuelve:
nslookup weathermx.duckdns.org
# Debe retornar: 177.236.54.241
```

---

## 🌐 Configuración Cloudflare (Próximo Paso)

Si aún **no has configurado Cloudflare Tunnel**, sigue estos pasos:

### Instalación:
```bash
# Linux/Raspberry
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared
sudo cp cloudflared /usr/local/bin/
```

### Autenticación:
```bash
cloudflared tunnel login
# Se abrirá navegador - autorizar
```

### Crear Tunnel:
```bash
cloudflared tunnel create weather-station
# Copiar el UUID mostrado
```

### Config File:
```bash
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: weather-station
credentials-file: /home/pi/.cloudflared/[UUID].json

ingress:
  - hostname: api.weathermx.duckdns.org
    service: http://localhost:8000
  - service: http_status:404
EOF
```

### Activar como Servicio:
```bash
sudo systemctl start cloudflared.service
sudo systemctl status cloudflared.service
```

---

## ✅ Checklist Final

```
□ Token Duck DNS guardado: a64240d0-87b0-4173-a0ca-26b2117c7061
□ IP Escuela confirmada: 177.236.54.241
□ ESP32_CloudflareDuckDNS.ino ACTUALIZADO con dominio weathermx
□ Arduino IDE instalado
□ ESP32 cargado con código
□ WiFi de escuela configurado en ESP32 (líneas 24-25)
□ Serial Monitor muestra HTTP Code: 201
□ test-esp32-setup.sh ejecutado exitosamente
□ Dashboard muestra datos en tiempo real
□ Cloudflare Tunnel activo (si está configurado)
□ HTTPS funciona: https://api.weathermx.duckdns.org
```

---

## 🎯 RESUMEN RÁPIDO

```
ESP32 → WiFi Escuela → weathermx.duckdns.org (177.236.54.241)
      → HTTPS POST
      → Cloudflare Tunnel
      → Backend FastAPI
      → Dashboard actualiza cada 30 seg
```

**Tu sistema está 99% listo. Solo falta:**
1. Editar WiFi en ESP32 (líneas 24-25)
2. Upload a ESP32
3. Ver datos en Serial Monitor

---

## 📞 SOPORTE RÁPIDO

**P: ¿Por qué no aparecen los datos?**
- R: Ver Serial Monitor - debe mostrar HTTP Code 201
- Si dice error: Revisar WiFi (líneas 24-25 del .ino)

**P: ¿Cómo cambio la IP de Duck DNS?**
- R: Se actualiza automático cada 5 min o ejecuta:
```bash
curl "https://www.duckdns.org/update?domains=weathermx&token=a64240d0-87b0-4173-a0ca-26b2117c7061&ip=$(curl -s https://api.ipify.org)"
```

**P: ¿El token es secreto?**
- R: SÍ - No lo compartas. Es como tu contraseña.

**P: ¿Puedo usar otro ESP32?**
- R: SÍ - Carga el mismo código en múltiples ESP32
- Cambia `STATION_ID` si quieres identificarlos

---

**Estado: ✅ LISTO PARA PRODUCCIÓN**  
**Configuración completada:** 2024-02-04  
**Próximo paso:** Cargar código en ESP32
