#!/bin/bash

# 🚀 Deploy a Heroku - Weather Station
# Este script sube tu aplicación a Heroku automáticamente

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🚀 DEPLOY A HEROKU - Weather Station                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ===== 1. VERIFICAR HEROKU CLI =====
echo -e "${BLUE}1️⃣  Verificando Heroku CLI...${NC}"
if ! command -v heroku &> /dev/null; then
    echo -e "${RED}❌ Heroku CLI no está instalado${NC}"
    echo "Instala desde: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi
echo -e "${GREEN}✅ Heroku CLI instalado${NC}"
echo ""

# ===== 2. VERIFICAR LOGIN =====
echo -e "${BLUE}2️⃣  Verificando login en Heroku...${NC}"
if ! heroku auth:whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  No estás logeado. Iniciando login...${NC}"
    heroku login
fi
echo -e "${GREEN}✅ Logeado en Heroku${NC}"
echo ""

# ===== 3. CREAR APP EN HEROKU =====
echo -e "${BLUE}3️⃣  Creando aplicación en Heroku...${NC}"

# Pedir nombre de la app
read -p "Nombre de la aplicación (ej: weather-station-andy-001): " APP_NAME

# Validar nombre
if [ -z "$APP_NAME" ]; then
    APP_NAME="weather-station-$(date +%s)"
    echo -e "${YELLOW}ℹ️  Usando nombre por defecto: $APP_NAME${NC}"
fi

# Crear la app
if heroku apps:info --app=$APP_NAME &> /dev/null; then
    echo -e "${YELLOW}⚠️  App ya existe: $APP_NAME${NC}"
else
    echo -e "${YELLOW}Creando app: $APP_NAME${NC}"
    heroku create $APP_NAME
fi

APP_URL="https://$APP_NAME.herokuapp.com"
echo -e "${GREEN}✅ Aplicación: $APP_APP_NAME${NC}"
echo -e "${GREEN}   URL: $APP_URL${NC}"
echo ""

# ===== 4. CONFIGURAR BASE DE DATOS =====
echo -e "${BLUE}4️⃣  Configurando PostgreSQL...${NC}"

if heroku addons:info heroku-postgresql:hobby-dev --app=$APP_NAME &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL ya configurado${NC}"
else
    echo -e "${YELLOW}Agregando PostgreSQL (hobby-dev)...${NC}"
    heroku addons:create heroku-postgresql:hobby-dev --app=$APP_NAME
fi

echo -e "${GREEN}✅ PostgreSQL configurado${NC}"
echo ""

# ===== 5. CONFIGURAR VARIABLES DE ENTORNO =====
echo -e "${BLUE}5️⃣  Configurando variables de entorno...${NC}"

# CORS
heroku config:set CORS_ORIGINS="*" --app=$APP_NAME

# Debug
heroku config:set DEBUG="false" --app=$APP_NAME

# Workers
heroku config:set WEB_CONCURRENCY="2" --app=$APP_NAME

echo -e "${GREEN}✅ Variables configuradas${NC}"
echo ""

# ===== 6. SETUP GIT =====
echo -e "${BLUE}6️⃣  Configurando Git...${NC}"

# Verificar si ya hay .git
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Inicializando Git...${NC}"
    git init
    git add .
    git commit -m "Initial commit for Heroku deployment"
fi

# Agregar remote de Heroku
if git remote | grep -q heroku; then
    echo -e "${YELLOW}Remote Heroku ya existe${NC}"
else
    echo -e "${YELLOW}Agregando remote Heroku...${NC}"
    heroku git:remote --app=$APP_NAME
fi

echo -e "${GREEN}✅ Git configurado${NC}"
echo ""

# ===== 7. DEPLOY =====
echo -e "${BLUE}7️⃣  Desplegando a Heroku...${NC}"
echo -e "${YELLOW}Esto puede tomar 2-3 minutos...${NC}"
echo ""

git push heroku main 2>&1 || git push heroku master 2>&1

echo ""
echo -e "${GREEN}✅ Deploy completado${NC}"
echo ""

# ===== 8. INICIALIZAR BASE DE DATOS =====
echo -e "${BLUE}8️⃣  Inicializando base de datos...${NC}"

heroku run "cd backend && python3 -c 'from app.core.database import init_db; init_db()'" --app=$APP_NAME

echo -e "${GREEN}✅ Base de datos inicializada${NC}"
echo ""

# ===== 9. RESUMEN =====
echo "╔════════════════════════════════════════════════════════════════╗"
echo -e "${GREEN}✅ ¡DEPLOY EXITOSO!${NC}"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${BLUE}📊 INFORMACIÓN DE TU APLICACIÓN:${NC}"
echo ""
echo "  Nombre:        $APP_NAME"
echo "  URL Pública:   $APP_URL"
echo "  Dashboard:     $APP_URL"
echo "  API:           $APP_URL/api"
echo "  Docs:          $APP_URL/docs"
echo ""

echo -e "${YELLOW}🎯 PRÓXIMO PASO - Actualizar ESP32:${NC}"
echo ""
echo "Abre: WeatherStation_CONFIG.h"
echo ""
echo "Cambia estas líneas:"
echo "  #define API_HOST \"$APP_NAME.herokuapp.com\""
echo "  #define API_PORT 443"
echo "  #define USE_HTTPS true"
echo ""

echo -e "${YELLOW}📱 COMANDOS ÚTILES:${NC}"
echo ""
echo "  Ver logs:       heroku logs -f --app=$APP_NAME"
echo "  Ver config:     heroku config --app=$APP_NAME"
echo "  Abrir app:      heroku open --app=$APP_NAME"
echo "  Ejecutar bash:  heroku run bash --app=$APP_NAME"
echo ""

echo -e "${GREEN}🚀 ¡TU APLICACIÓN ESTÁ EN VIVO!${NC}"
echo ""
echo "Abre en navegador: $APP_URL"
echo ""

# ===== 10. CREAR ARCHIVO DE CONFIGURACIÓN =====
echo -e "${BLUE}9️⃣  Creando archivo de configuración...${NC}"

cat > /tmp/heroku_config.txt << EOL
🚀 CONFIGURACIÓN HEROKU - Weather Station

APP NAME:    $APP_NAME
URL:         $APP_URL
TIPO:        Heroku Hobby Tier (Gratis)

DATABASE:    PostgreSQL (hobby-dev) - Gratis
MEMORY:      512MB RAM

API:         https://$APP_URL/api
DOCS:        https://$APP_URL/docs

PARA ESP32 (WeatherStation_CONFIG.h):
  #define API_HOST "$APP_NAME.herokuapp.com"
  #define API_PORT 443
  #define USE_HTTPS true

Otros comandos útiles:
  Ver logs: heroku logs -f --app=$APP_NAME
  Conectar a BD: heroku pg:psql --app=$APP_NAME
  Restartear: heroku dyno:restart --app=$APP_NAME
EOL

cat /tmp/heroku_config.txt

echo ""
echo -e "${GREEN}✅ Archivo guardado en: /tmp/heroku_config.txt${NC}"
echo ""

echo "═════════════════════════════════════════════════════════════════"
echo "🎉 ¡DEPLOY COMPLETADO!"
echo "═════════════════════════════════════════════════════════════════"
