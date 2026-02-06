#!/bin/bash

# GUÍA INTERACTIVA DE SETUP - Weather App
# Ejecutar con: bash

clear

cat << 'EOF'

╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║          🌦️  WEATHER APP - GUÍA INTERACTIVA DE SETUP                         ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

Bienvenido! Esta guía te ayudará a elegir qué documentación leer.

Responde algunas preguntas y te diremos exactamente qué hacer.

═══════════════════════════════════════════════════════════════════════════════

1. ¿Es la PRIMERA VEZ que usas esto?

   a) Sí, es mi primera vez
   b) No, ya lo he usado antes

   Respuesta (a/b): 
EOF

read -p "" FIRST_TIME

if [ "$FIRST_TIME" = "a" ]; then
    clear
    cat << 'EOF'

✅ PERFECTO. Sigue estos pasos:

PASO 1: Lee esta guía rápida (3 minutos)
   📄 README_SETUP.md
   
   Copiar comando:
   cat README_SETUP.md

PASO 2: Entiende las opciones
   Verás 4 opciones diferentes:
   - LocalHost (para pruebas)
   - Raspberry Pi (para red de escuela)
   - Cloudflare (para acceso global)
   - Docker (para evitar problemas)

PASO 3: Elige la opción que necesitas

PASO 4: Continúa leyendo ↓

═══════════════════════════════════════════════════════════════════════════════
EOF

else
    clear
    cat << 'EOF'

✅ EXCELENTE. Vayamos directo al grano.

╚═══════════════════════════════════════════════════════════════════════════════

EOF
fi

cat << 'EOF'

2. ¿Qué necesitas AHORA?

   a) Quiero INSTALAR por primera vez
   b) Quiero CAMBIAR la URL de la API
   c) Quiero usar CLOUDFLARE TUNNEL
   d) Necesito TROUBLESHOOTING (algo no funciona)
   e) Quiero entender cómo FUNCIONA

   Respuesta (a/b/c/d/e): 
EOF

read -p "" OPTION

case $OPTION in
    a)
        clear
        cat << 'EOF'

╔═══════════════════════════════════════════════════════════════════════════════╗
║                    INSTALACIÓN PRIMERA VEZ                                   ║
╚═══════════════════════════════════════════════════════════════════════════════╝

3. ¿Dónde quieres instalar?

   a) En MI COMPUTADORA (localhost)
   b) En RASPBERRY PI (red escuela)
   c) En INTERNET (con Cloudflare)
   d) Con DOCKER

   Respuesta (a/b/c/d): 
EOF
        read -p "" INSTALL_LOC

        case $INSTALL_LOC in
            a)
                clear
                cat << 'EOF'

✅ OPCIÓN: LocalHost (Tu Computadora)

SIGUE ESTOS PASOS:

📖 PASO 1: Lee la guía completa
   Archivo: SETUP_COMPLETO.md
   Busca: "# OPCIÓN A: Inicio Rápido"
   Tiempo: 5 minutos

📋 PASO 2: Ejecuta estos comandos en orden:

   # Terminal 1
   cd backend
   python main.py

   # Terminal 2
   cd frontend
   python3 -m http.server 8081

   # Terminal 3
   python3 weather_live.py

✅ PASO 3: Abre en navegador
   http://localhost:8081

¡LISTO!

═══════════════════════════════════════════════════════════════════════════════

Comando para ver la guía:
  cat SETUP_COMPLETO.md | grep -A 50 "# OPCIÓN A"
EOF
                ;;
            b)
                clear
                cat << 'EOF'

✅ OPCIÓN: Raspberry Pi (Red Escuela)

SIGUE ESTOS PASOS:

📖 PASO 1: Lee la guía completa
   Archivo: SETUP_COMPLETO.md
   Busca: "# OPCIÓN B: Raspberry Pi"
   Tiempo: 30 minutos

📋 PASO 2: Ejecuta estos comandos en orden:

   1. Obtener IP:
      hostname -I

   2. Configurar URL:
      bash setup_api_url.sh
      (Opción 2: IP Raspberry)

   3. Instalar servicios:
      sudo bash install_services.sh

   4. Iniciar:
      sudo systemctl start weather-app

✅ PASO 3: Acceder desde otra PC
   http://<tu-ip>:8081

¡LISTO!

═══════════════════════════════════════════════════════════════════════════════

Comando para ver la guía:
  cat SETUP_COMPLETO.md | grep -A 60 "# OPCIÓN B"
EOF
                ;;
            c)
                clear
                cat << 'EOF'

✅ OPCIÓN: Cloudflare (Internet Global)

SIGUE ESTOS PASOS:

📖 PASO 1: Lee las guías
   Primero: SETUP_COMPLETO.md → "# OPCIÓN C"
   Luego: CONFIGURACION_CLOUDFLARE.md (completa)
   Tiempo: 20 minutos

📋 PASO 2: Ejecuta estos comandos en orden:

   1. Crear cuenta Cloudflare:
      https://dash.cloudflare.com/sign-up

   2. Instalar cloudflared:
      bash setup_cloudflare.sh

   3. Autenticarse:
      cloudflared login

   4. Crear túnel:
      cloudflared tunnel create weather-app

   5. Configurar URL:
      bash setup_api_url.sh
      (Opción 3 o 4: Cloudflare)

   6. Instalar servicios:
      sudo bash install_services.sh

   7. Iniciar:
      sudo systemctl start weather-app
      sudo systemctl start cloudflare-tunnel

✅ PASO 3: Acceder desde cualquier lugar
   https://tu-dominio.com

¡LISTO!

═══════════════════════════════════════════════════════════════════════════════

Comandos para ver las guías:
  cat SETUP_COMPLETO.md | grep -A 60 "# OPCIÓN C"
  cat CONFIGURACION_CLOUDFLARE.md
EOF
                ;;
            d)
                clear
                cat << 'EOF'

✅ OPCIÓN: Docker

SIGUE ESTOS PASOS:

📖 PASO 1: Lee la guía
   Archivo: SETUP_COMPLETO.md
   Busca: "# OPCIÓN D"
   Tiempo: 10 minutos

📋 PASO 2: Ejecuta estos comandos:

   1. Instalar Docker:
      sudo apt install docker.io docker-compose

   2. Construir:
      docker-compose build

   3. Iniciar:
      docker-compose up -d

   4. Verificar:
      docker-compose ps

✅ PASO 3: Acceder
   http://localhost:8081

¡LISTO!

═══════════════════════════════════════════════════════════════════════════════

Comando para ver la guía:
  cat SETUP_COMPLETO.md | grep -A 30 "# OPCIÓN D"
EOF
                ;;
        esac
        ;;
    b)
        clear
        cat << 'EOF'

╔═══════════════════════════════════════════════════════════════════════════════╗
║                   CAMBIAR URL DE LA API                                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

✅ MUY FÁCIL:

Opción 1: Script Interactivo (Recomendado)
  bash setup_api_url.sh
  (Te guiará paso a paso)

Opción 2: Editar manualmente
  nano .env
  (Busca: API_URL=...)

Opción 3: Ver guía completa
  cat GUIA_URL_CONFIGURACION.md

═══════════════════════════════════════════════════════════════════════════════

EJEMPLOS DE URLs:

  LocalHost:
    http://localhost:8000

  IP Raspberry:
    http://192.168.1.100:8000

  Cloudflare:
    https://api.tu-dominio.com
    https://api-abc123.trycloudflare.com

  ngrok:
    https://ngrok-url-que-te-da.ngrok.io

═══════════════════════════════════════════════════════════════════════════════
EOF
        ;;
    c)
        clear
        cat << 'EOF'

╔═══════════════════════════════════════════════════════════════════════════════╗
║                      CLOUDFLARE TUNNEL                                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝

✅ DOCUMENTACIÓN COMPLETA:

  cat CONFIGURACION_CLOUDFLARE.md

✅ PASOS RÁPIDOS:

  1. Crear cuenta: https://dash.cloudflare.com/sign-up
  2. Instalar: bash setup_cloudflare.sh
  3. Login: cloudflared login
  4. Crear: cloudflared tunnel create weather-app
  5. Config: nano ~/.cloudflared/config.yml
  6. Ejecutar: cloudflared tunnel run weather-app

═══════════════════════════════════════════════════════════════════════════════
EOF
        ;;
    d)
        clear
        cat << 'EOF'

╔═══════════════════════════════════════════════════════════════════════════════╗
║                    TROUBLESHOOTING - ALGO NO FUNCIONA                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝

✅ GUÍAS DE AYUDA:

  1. Referencia Rápida (Problemas comunes)
     cat REFERENCIA_RAPIDA_URL.txt

  2. Troubleshooting Completo
     cat SETUP_COMPLETO.md | grep -A 20 "Troubleshooting"

  3. Ver Logs
     sudo journalctl -u weather-app -f

  4. Ver Configuración
     bash show_config.sh

═══════════════════════════════════════════════════════════════════════════════

PROBLEMAS COMUNES:

❌ "Error: Connection refused"
   ✓ Backend no está corriendo
   ✓ Solución: python3 backend/main.py

❌ "Port 8000 already in use"
   ✓ Otro proceso usa el puerto
   ✓ Solución: lsof -i :8000 ; kill -9 <PID>

❌ "Cambié URL pero sigue igual"
   ✓ Los simuladores usan la vieja URL
   ✓ Solución: pkill -f weather_live.py

❌ "Datos no llegan"
   ✓ Verificar .env: cat .env
   ✓ Ver logs: sudo journalctl -u weather-app -f

═══════════════════════════════════════════════════════════════════════════════
EOF
        ;;
    e)
        clear
        cat << 'EOF'

╔═══════════════════════════════════════════════════════════════════════════════╗
║              ¿CÓMO FUNCIONA? - ENTENDER LA ARQUITECTURA                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝

✅ DIAGRAMA Y ARQUITECTURA:

  cat SETUP_VISUAL.txt

✅ COMPONENTES:

  1. BACKEND (FastAPI en puerto 8000)
     ├─ Recibe datos de simuladores
     ├─ Almacena en base de datos
     └─ Expone API REST

  2. FRONTEND (HTTP en puerto 8081)
     ├─ Dashboard en tiempo real
     ├─ Mapa interactivo
     ├─ Gráficos históricos
     └─ Formularios CRUD

  3. SIMULADORES (threads Python)
     ├─ Generan datos realistas
     ├─ Envían a backend cada 10-15 seg
     └─ Simulan 4 estaciones españolas

  4. BASE DE DATOS
     ├─ Almacena estaciones
     ├─ Almacena mediciones
     └─ Disponible para consultas

✅ FLUJO DE DATOS:

  Simuladores → POST /api/stations/{id}/data → Backend
       ↓                                          ↓
    Generan                                   Almacena
    datos                                     en BD
       ↓                                          ↓
    Cada 10s    ←─────────────────→    Frontend
                  GET /api/stations
                      Muestra

═══════════════════════════════════════════════════════════════════════════════

COMANDOS ÚTILES PARA ENTENDER:

  # Ver estructur del proyecto
  tree

  # Ver proceso del backend
  ps aux | grep main.py

  # Ver datos siendo guardados
  sqlite3 backend.db "SELECT * FROM measurements LIMIT 5;"

  # Ver logs en vivo
  sudo journalctl -u weather-app -f

═══════════════════════════════════════════════════════════════════════════════
EOF
        ;;
esac

cat << 'EOF'

═══════════════════════════════════════════════════════════════════════════════

📚 ACCESO RÁPIDO A DOCUMENTACIÓN:

Iniciar todo:             bash start_weather_app.sh
Ver config:               bash show_config.sh
Cambiar URL:              bash setup_api_url.sh
Ver guía:                 cat README_SETUP.md
Ver todos los docs:       ls -la *.md *.txt

═══════════════════════════════════════════════════════════════════════════════

¿NECESITAS MÁS AYUDA?

  1. Índice de Documentación:    cat INDICE_DOCUMENTACION.txt
  2. Todos los documentos en:    ls *.md *.txt
  3. Ver este menú de nuevo:     bash GUIA_INTERACTIVA.sh

═══════════════════════════════════════════════════════════════════════════════

¡BUENA SUERTE! 🚀

EOF

echo ""
