#!/bin/bash

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# QUICK START - RASPBERRY PI
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cat << 'EOF'

╔════════════════════════════════════════════════════════════╗
║   🍓 MIGRACIÓN A RASPBERRY PI - GUÍA RÁPIDA              ║
║   weathermx - Estación Meteorológica IoT                 ║
╚════════════════════════════════════════════════════════════╝

📋 NECESITAS:
   ✓ Raspberry Pi 3+ 
   ✓ Token: a64240d0-87b0-4173-a0ca-26b2117c7061
   ✓ Dominio: weathermx.duckdns.org
   ✓ Conexión SSH

⚡ INSTALACIÓN EN 3 PASOS:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASO 1: CONECTARSE
───────────────────
ssh pi@raspberrypi.local
# Contraseña: raspberry

PASO 2: DESCARGAR PROYECTO
──────────────────────────
cd /home/pi
git clone https://github.com/tu-usuario/weather_app.git
cd weather_app

PASO 3: INSTALAR AUTOMÁTICAMENTE
─────────────────────────────────
sudo bash setup-raspberry.sh

✅ ¡LISTO! Sistema corriendo en:
   • Local:  http://192.168.1.XXX:8081
   • Remoto: https://weathermx.duckdns.org

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 DOCUMENTACIÓN:

   1. INSTALACIÓN RÁPIDA
      Lee: INSTALACION_RASPBERRY.md

   2. MIGRACIÓN DETALLADA
      Lee: MIGRACION_RASPBERRY.md

   3. VERIFICAR INSTALACIÓN
      Ejecuta: bash verify-raspberry.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 COMANDOS ÚTILES:

   Ver logs:          sudo journalctl -u weather-backend -f
   Reiniciar:         sudo systemctl restart weather-backend
   Estado:            sudo systemctl status weather-backend
   Ver temperatura:   vcgencmd measure_temp
   Conectar SSH:      ssh pi@raspberrypi.local

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 URLS DESPUÉS DE INSTALAR:

   LOCALES (en tu red):
   • Dashboard: http://192.168.1.XXX:8081
   • API:       http://192.168.1.XXX:8000

   REMOTOS (desde internet):
   • Dashboard: https://weathermx.duckdns.org
   • API:       https://api.weathermx.duckdns.org

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ SI ALGO FALLA:

   1. Ejecuta el verificador:
      bash verify-raspberry.sh

   2. Revisa los logs:
      sudo journalctl -u weather-backend.service -f

   3. Reinstala:
      sudo bash setup-raspberry.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ CARACTERÍSTICAS:

   ✓ Backend FastAPI corriendo en puerto 8000
   ✓ Frontend HTML/JS en puerto 8081
   ✓ Duck DNS auto-actualizado cada 5 minutos
   ✓ Cloudflare Tunnel para acceso seguro
   ✓ Auto-arranque en reinicios
   ✓ Logs persistentes
   ✓ SQLite para guardar datos
   ✓ ESP32 enviando datos cada 30 segundos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 AYUDA:

   Documentación: INSTALACION_RASPBERRY.md
   Troubleshooting: MIGRACION_RASPBERRY.md
   Verificar: bash verify-raspberry.sh

═══════════════════════════════════════════════════════════════

Status: ✅ Listo para Producción
Versión: 1.0

EOF
