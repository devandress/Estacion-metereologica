#!/bin/bash

# Quick start script para Weather Station
echo "🌤️ Weather Station - Quick Start"
echo "=================================="

# Detectar sistema operativo
OS_TYPE=$(uname -s)

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 no está instalado"
    exit 1
fi

# Setup backend
echo -e "${BLUE}📦 Configurando backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install -q -r requirements.txt

# Setup database
echo -e "${BLUE}🗄️ Verificando base de datos...${NC}"
if ! psql -U postgres -d weather_db -c "SELECT 1" > /dev/null 2>&1; then
    echo "Creando base de datos..."
    createdb weather_db || sudo -u postgres createdb weather_db
fi

# Initialize DB
python3 -c "from app.core.database import init_db; init_db()" 2>/dev/null || echo "⚠️ DB podría estar ya inicializada"

echo -e "${GREEN}✅ Backend listo${NC}"

# Frontend
echo -e "${BLUE}🌐 Iniciando frontend...${NC}"
cd ../frontend
python3 -m http.server 8080 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Backend
echo -e "${BLUE}🚀 Iniciando API...${NC}"
cd ../backend
python3 main.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

echo ""
echo -e "${GREEN}✅ ¡Sistema iniciado!${NC}"
echo ""
echo "Accesos:"
echo -e "  Frontend: ${BLUE}http://localhost:8080${NC}"
echo -e "  API:      ${BLUE}http://localhost:8000${NC}"
echo -e "  Docs:     ${BLUE}http://localhost:8000/docs${NC}"
echo ""
echo "Para detener: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Mantener procesos activos
wait $BACKEND_PID
