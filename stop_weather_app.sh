#!/bin/bash

# Script para detener todos los servicios de Weather App

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PID_DIR="/var/run/weather_app"

echo -e "${BLUE}=== Deteniendo Weather App ===${NC}"

# Detener Backend
if [ -f "$PID_DIR/backend.pid" ]; then
    PID=$(cat "$PID_DIR/backend.pid")
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID 2>/dev/null && echo -e "${GREEN}✓ Backend detenido${NC}" || echo -e "${RED}✗ Error deteniendo Backend${NC}"
    fi
    rm "$PID_DIR/backend.pid"
fi

# Detener Frontend
if pgrep -f "http.server 8081" > /dev/null; then
    pkill -f "http.server 8081" && echo -e "${GREEN}✓ Frontend detenido${NC}"
fi

# Detener Simuladores
pkill -f "weather_live.py" && echo -e "${GREEN}✓ Simuladores detenidos${NC}"

# Detener Cloudflare Tunnel si está corriendo
pkill -f "cloudflared" && echo -e "${GREEN}✓ Cloudflare Tunnel detenido${NC}" || true

echo -e "${BLUE}Todos los servicios han sido detenidos${NC}"
