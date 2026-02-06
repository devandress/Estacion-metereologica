#!/bin/bash

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CONFIGURADOR AUTOMÁTICO - weathermx
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Tu configuración
DUCKDNS_TOKEN="a64240d0-87b0-4173-a0ca-26b2117c7061"
DUCKDNS_DOMAIN="weathermx"
PUBLIC_IP="177.236.54.241"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  🔧 CONFIGURADOR AUTOMÁTICO - weathermx"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. Crear script de actualización Duck DNS
echo -e "${YELLOW}📝 Creando script de actualización Duck DNS...${NC}"

cat > /home/andy/Desktop/weather_app/update-duckdns.sh << 'EOF'
#!/bin/bash

# Duck DNS Auto-update
TOKEN="a64240d0-87b0-4173-a0ca-26b2117c7061"
DOMAIN="weathermx"
LOG_FILE="/tmp/duckdns.log"

echo "[$(date)] Duck DNS Update Service iniciado" >> $LOG_FILE

while true; do
    # Obtener IP actual
    CURRENT_IP=$(curl -s https://api.ipify.org)
    
    # Actualizar en Duck DNS
    RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=$CURRENT_IP")
    
    # Log
    echo "[$(date)] IP: $CURRENT_IP | Response: $RESPONSE" >> $LOG_FILE
    
    # Esperar 5 minutos
    sleep 300
done
EOF

chmod +x /home/andy/Desktop/weather_app/update-duckdns.sh
echo -e "${GREEN}✓ Script creado: update-duckdns.sh${NC}"
echo ""

# 2. Crear archivo de configuración para referencia
echo -e "${YELLOW}📝 Creando archivo de configuración...${NC}"

cat > /home/andy/Desktop/weather_app/.weathermx.env << 'EOF'
# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN WEATHERMX
# ═══════════════════════════════════════════════════════════════════════════

# Duck DNS
DUCKDNS_TOKEN=a64240d0-87b0-4173-a0ca-26b2117c7061
DUCKDNS_DOMAIN=weathermx
DUCKDNS_URL=https://www.duckdns.org/update

# IP Pública
PUBLIC_IP=177.236.54.241

# API
API_URL=https://api.weathermx.duckdns.org
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:8081

# ESP32
STATION_ID=ESP32_WEATHERMX_001
STATION_NAME=WeatherStation MX
LOCATION=Escuela - Aula 101
SEND_INTERVAL=30000

# ═══════════════════════════════════════════════════════════════════════════
# IMPORTANTE: Cambiar credenciales en:
# - ESP32_CloudflareDuckDNS.ino (líneas 24-25)
# - Cloudflare config (si usas)
# ═══════════════════════════════════════════════════════════════════════════
EOF

chmod 600 /home/andy/Desktop/weather_app/.weathermx.env
echo -e "${GREEN}✓ Configuración guardada: .weathermx.env${NC}"
echo ""

# 3. Crear documento de referencia rápida
echo -e "${YELLOW}📝 Creando guía rápida de configuración...${NC}"

cat > /home/andy/Desktop/weather_app/SETUP_WEATHERMX.md << 'EOF'
# 🌐 Configuración Rápida - weathermx

## 📋 Tu Información

```
🔑 Token Duck DNS:    a64240d0-87b0-4173-a0ca-26b2117c7061
🌐 Dominio:           weathermx.duckdns.org
📡 IP Pública:        177.236.54.241
🏠 Estación:          ESP32_WEATHERMX_001
```

---

## ⚡ 3 Pasos para Funcionar

### 1️⃣ Verifica tu setup

```bash
cd /home/andy/Desktop/weather_app
bash esp32_simulator.sh
```

### 2️⃣ Configura el ESP32

**Archivo:** `ESP32_CloudflareDuckDNS.ino`

**Líneas 24-25:**
```cpp
const char* WIFI_SSID = "Tu_WiFi_Escuela";
const char* WIFI_PASS = "Tu_Password";
```

**Líneas 300-320:**
- Conecta sensores DHT22, BMP180, etc.

### 3️⃣ Sube a Arduino IDE

1. Abre Arduino IDE
2. Archivo → Abrir → `ESP32_CloudflareDuckDNS.ino`
3. Herramientas → Puerto → Selecciona tu ESP32
4. Click en Upload ⬆️

---

## 🌐 URLs Importantes

| Servicio | URL |
|----------|-----|
| Dashboard Local | http://localhost:8081 |
| API Local | http://localhost:8000 |
| **API Externa** | **https://api.weathermx.duckdns.org** |
| Duck DNS | weathermx.duckdns.org |

---

## 📊 Verifica que Funciona

### Serial Monitor (115200 baud)

Deberías ver cada 30 segundos:
```
HTTP Code: 201
✅ ÉXITO - Datos enviados a webapp
```

### Dashboard

```bash
# Abre tu navegador en:
http://localhost:8081
```

Deberías ver tu estación `ESP32_WEATHERMX_001` con:
- ✓ Temperatura
- ✓ Humedad
- ✓ Presión
- ✓ Timestamp

---

## 🔄 Actualización automática Duck DNS

Para mantener tu dominio actualizado (si tu IP cambia):

```bash
# Iniciar en background
nohup /home/andy/Desktop/weather_app/update-duckdns.sh > /tmp/duckdns.log &

# Ver logs
tail -f /tmp/duckdns.log
```

---

## ❌ Si algo falla

1. **Ejecuta:** `bash test-esp32-setup-local.sh`
2. **Lee:** `VERIFICACION_ESP32.md`
3. **Revisa:** `ESP32_CLOUDFLARE_DUCKDNS.md`

---

## 🔐 Seguridad

✅ **Protecciones:**
- ✓ HTTPS (Cloudflare)
- ✓ Token privado
- ✓ No expones puertos locales
- ✓ DNS dinámico seguro

---

**Estado:** ✅ Listo para Producción  
**Versión:** 1.0
EOF

echo -e "${GREEN}✓ Guía creada: SETUP_WEATHERMX.md${NC}"
echo ""

# 4. Resumen final
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  ${GREEN}✅ CONFIGURACIÓN COMPLETADA${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}📦 Archivos generados:${NC}"
echo "  • update-duckdns.sh        - Auto-actualizar IP en Duck DNS"
echo "  • .weathermx.env           - Variables de configuración"
echo "  • SETUP_WEATHERMX.md       - Guía rápida"
echo ""

echo -e "${YELLOW}🌐 Tu Configuración:${NC}"
echo "  • Token Duck DNS: $DUCKDNS_TOKEN"
echo "  • Dominio: $DUCKDNS_DOMAIN.duckdns.org"
echo "  • IP Pública: $PUBLIC_IP"
echo ""

echo -e "${BLUE}🚀 Próximo Paso:${NC}"
echo "  Abre ESP32_CloudflareDuckDNS.ino en Arduino IDE y sigue los pasos"
echo ""

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
