#!/bin/bash

# 🚀 INICIAR ESTACIÓN METEOROLÓGICA - Versión Ligera para Raspberry Pi 8GB
# Este script hace TODA la magia automáticamente

set -e

clear
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🌦️  ESTACIÓN METEOROLÓGICA - INICIO RÁPIDO 🌦️              ║"
echo "║  Versión Optimizada para Raspberry Pi 8GB                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colores para mensajes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sin color

# Obtener directorio actual
APP_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$APP_DIR"

# 1. VERIFICAR DOCKER
echo -e "${BLUE}[1/5]${NC} Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker no está instalado${NC}"
    echo "Instálalo con: curl -fsSL https://get.docker.com | sh"
    exit 1
fi
echo -e "${GREEN}✓ Docker detectado${NC}"

# 2. VERIFICAR DOCKER COMPOSE
echo ""
echo -e "${BLUE}[2/5]${NC} Verificando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker Compose no instalado${NC}"
    echo "Intenta: sudo apt install docker-compose"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose detectado${NC}"

# 3. CONSTRUIR IMAGEN
echo ""
echo -e "${BLUE}[3/5]${NC} Construcción de imagen Docker (esto puede tardar 2-3 min)..."
docker-compose build --no-cache

# 4. INICIAR SERVICIOS
echo ""
echo -e "${BLUE}[4/5]${NC} Iniciando servicios..."
docker-compose up -d

echo ""
echo -e "${BLUE}[5/5]${NC} Verificando que todo esté corriendo..."
sleep 5

# Esperar a que esté listo
echo "Esperando a que el servidor esté listo..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null; then
        echo -e "${GREEN}✓ Servidor listo${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  ✅ ¡TODO ESTÁ FUNCIONANDO!                                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}ACCESO:${NC}"
echo "  🌐 Dashboard: ${BLUE}http://localhost:8081${NC}"
echo "  🔌 API: ${BLUE}http://localhost:8000/api/stations${NC}"
echo ""
echo -e "${GREEN}PRÓXIMOS PASOS:${NC}"
echo "  1️⃣  Abre http://localhost:8081 en tu navegador"
echo "  2️⃣  Haz clic en '➕ Nueva Estación'"
echo "  3️⃣  Completa: Nombre, Ubicación, Latitud, Longitud"
echo "  4️⃣  ¡Guarda el ID que aparece!"
echo ""
echo -e "${GREEN}DOCUMENTACIÓN:${NC}"
echo "  📖 Guía detallada: cat GUIA_REGISTRAR_ESTACION.md"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo "  • El servidor usa SQLite (ligero y rápido)"
echo "  • Los datos se guardan en: weather.db"
echo "  • CPU limitado a 2 cores (optimizado para RPi)"
echo "  • Memoria limitada a 1GB (deja espacio libre)"
echo ""
echo "Para detener: ${BLUE}docker-compose down${NC}"
echo "Para ver logs: ${BLUE}docker-compose logs -f backend${NC}"
echo ""
