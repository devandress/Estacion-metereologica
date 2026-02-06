#!/bin/bash

# Script de inicio automático para Weather App en Raspberry Pi
# Este script inicia el backend, frontend y simuladores en background

set -e

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directorios
APP_DIR="/home/andy/Desktop/weather_app"
VENV_DIR="$APP_DIR/.venv"
LOG_DIR="/var/log/weather_app"
PID_DIR="/var/run/weather_app"

# Crear directorios de logs si no existen
sudo mkdir -p "$LOG_DIR"
sudo mkdir -p "$PID_DIR"
sudo chown $USER:$USER "$LOG_DIR" "$PID_DIR"

echo -e "${BLUE}=== Iniciando Weather App ===${NC}"

# Cambiar al directorio de la app
cd "$APP_DIR"

# 1. Activar virtual environment
echo -e "${YELLOW}1. Activando virtual environment...${NC}"
if [ ! -d "$VENV_DIR" ]; then
    echo -e "${RED}Virtual environment no encontrado. Ejecuta: python3 -m venv .venv${NC}"
    exit 1
fi
source "$VENV_DIR/bin/activate"

# 2. Instalar/actualizar dependencias
echo -e "${YELLOW}2. Verificando dependencias...${NC}"
pip install -q -r requirements.txt 2>/dev/null || true

# 3. Iniciar Backend (FastAPI)
echo -e "${YELLOW}3. Iniciando Backend (puerto 8000)...${NC}"
nohup python3 "$APP_DIR/backend/main.py" > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$PID_DIR/backend.pid"
echo -e "${GREEN}✓ Backend iniciado (PID: $BACKEND_PID)${NC}"
sleep 2

# 4. Iniciar Frontend (HTTP Server)
echo -e "${YELLOW}4. Iniciando Frontend (puerto 8081)...${NC}"
cd "$APP_DIR/frontend"
nohup python3 -m http.server 8081 > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$PID_DIR/frontend.pid"
echo -e "${GREEN}✓ Frontend iniciado (PID: $FRONTEND_PID)${NC}"
sleep 2

# 5. Iniciar Simuladores de Estaciones Meteorológicas
echo -e "${YELLOW}5. Iniciando simuladores de estaciones...${NC}"
cd "$APP_DIR"

# 4 simuladores con intervalos diferentes
nohup python3 weather_live.py STATION_MADRID_001 10 > "$LOG_DIR/simulator_madrid.log" 2>&1 &
echo $! > "$PID_DIR/simulator_madrid.pid"
echo -e "${GREEN}✓ Madrid simulator iniciado${NC}"

nohup python3 weather_live.py STATION_BARCELONA_001 12 > "$LOG_DIR/simulator_barcelona.log" 2>&1 &
echo $! > "$PID_DIR/simulator_barcelona.pid"
echo -e "${GREEN}✓ Barcelona simulator iniciado${NC}"

nohup python3 weather_live.py STATION_VALENCIA_001 14 > "$LOG_DIR/simulator_valencia.log" 2>&1 &
echo $! > "$PID_DIR/simulator_valencia.pid"
echo -e "${GREEN}✓ Valencia simulator iniciado${NC}"

nohup python3 weather_live.py STATION_BILBAO_001 15 > "$LOG_DIR/simulator_bilbao.log" 2>&1 &
echo $! > "$PID_DIR/simulator_bilbao.pid"
echo -e "${GREEN}✓ Bilbao simulator iniciado${NC}"

# 6. Verificar que los procesos estén corriendo
echo -e "\n${BLUE}=== Verificando servicios ===${NC}"
sleep 2

if ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend corriendo${NC}"
else
    echo -e "${RED}✗ Error iniciando Backend${NC}"
    tail -20 "$LOG_DIR/backend.log"
fi

if pgrep -f "http.server 8081" > /dev/null; then
    echo -e "${GREEN}✓ Frontend corriendo${NC}"
else
    echo -e "${RED}✗ Error iniciando Frontend${NC}"
    tail -20 "$LOG_DIR/frontend.log"
fi

echo -e "\n${BLUE}=== Información de Acceso ===${NC}"
echo -e "Local: ${GREEN}http://localhost:8081${NC}"
echo -e "Backend API: ${GREEN}http://localhost:8000${NC}"
echo -e "Logs: ${YELLOW}$LOG_DIR/${NC}"
echo -e "\n${BLUE}Para detener todos los servicios, ejecuta: stop_weather_app.sh${NC}"
