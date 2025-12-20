#!/bin/bash

# 🔍 SCRIPT DE VERIFICACIÓN - Weather Station
# Comprueba que todo está correctamente configurado en Raspberry Pi

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 VERIFICACIÓN - WEATHER STATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Track results
CHECKS_PASSED=0
CHECKS_FAILED=0

# ============================================
# FUNCIÓN PARA CHEQUEOS
# ============================================

check_command() {
    local cmd=$1
    local description=$2
    
    if command -v "$cmd" &> /dev/null; then
        echo -e "${GREEN}✅${NC} $description"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌${NC} $description - NO ENCONTRADO"
        ((CHECKS_FAILED++))
    fi
}

check_service() {
    local service=$1
    local description=$2
    
    if sudo systemctl is-active --quiet "$service"; then
        echo -e "${GREEN}✅${NC} $description - CORRIENDO"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌${NC} $description - NO CORRIENDO"
        ((CHECKS_FAILED++))
    fi
}

check_port() {
    local port=$1
    local description=$2
    
    if sudo netstat -tulpn 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✅${NC} $description - Puerto $port abierto"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌${NC} $description - Puerto $port cerrado"
        ((CHECKS_FAILED++))
    fi
}

check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅${NC} $description"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌${NC} $description - NO ENCONTRADO"
        ((CHECKS_FAILED++))
    fi
}

check_url() {
    local url=$1
    local description=$2
    
    if curl -s -m 5 -o /dev/null -w "%{http_code}" "$url" | grep -q "200"; then
        echo -e "${GREEN}✅${NC} $description - Respondiendo"
        ((CHECKS_PASSED++))
    else
        echo -e "${RED}❌${NC} $description - No responde"
        ((CHECKS_FAILED++))
    fi
}

# ============================================
# 1. VERIFICAR SOFTWARE INSTALADO
# ============================================

echo -e "${BLUE}1️⃣  Software instalado${NC}"
echo "─────────────────────────────────────"
check_command "python3" "Python 3"
check_command "pip3" "pip3"
check_command "psql" "PostgreSQL Client"
check_command "nginx" "Nginx"
check_command "cloudflared" "Cloudflare Tunnel"
check_command "git" "Git"
echo ""

# ============================================
# 2. VERIFICAR SERVICIOS SYSTEMD
# ============================================

echo -e "${BLUE}2️⃣  Servicios systemd${NC}"
echo "─────────────────────────────────────"
check_service "weather-backend" "Backend (FastAPI)"
check_service "weather-frontend" "Frontend (Nginx)"
check_service "weather-tunnel" "Tunnel (Cloudflare)"
echo ""

# ============================================
# 3. VERIFICAR PUERTOS
# ============================================

echo -e "${BLUE}3️⃣  Puertos${NC}"
echo "─────────────────────────────────────"
check_port "8000" "Backend API"
check_port "8080" "Frontend"
check_port "5432" "PostgreSQL"
echo ""

# ============================================
# 4. VERIFICAR ARCHIVOS CONFIGURACIÓN
# ============================================

echo -e "${BLUE}4️⃣  Archivos de configuración${NC}"
echo "─────────────────────────────────────"
check_file "/home/pi/weather_station/.env" "Archivo .env"
check_file "/etc/systemd/system/weather-backend.service" "Service backend"
check_file "/etc/systemd/system/weather-frontend.service" "Service frontend"
check_file "/etc/systemd/system/weather-tunnel.service" "Service tunnel"
check_file "/etc/nginx/sites-available/weather" "Nginx config"
echo ""

# ============================================
# 5. VERIFICAR BASE DE DATOS
# ============================================

echo -e "${BLUE}5️⃣  Base de datos${NC}"
echo "─────────────────────────────────────"

if sudo systemctl is-active --quiet postgresql; then
    DB_CHECK=$(psql -U weather_user -d weather_db -t -c "SELECT COUNT(*) FROM weather_stations;" 2>/dev/null || echo "ERROR")
    
    if [ "$DB_CHECK" != "ERROR" ]; then
        echo -e "${GREEN}✅${NC} PostgreSQL conectando"
        echo -e "${GREEN}✅${NC} Estaciones en BD: $DB_CHECK"
        ((CHECKS_PASSED+=2))
    else
        echo -e "${RED}❌${NC} No puedo conectar a PostgreSQL"
        ((CHECKS_FAILED++))
    fi
else
    echo -e "${RED}❌${NC} PostgreSQL no está corriendo"
    ((CHECKS_FAILED++))
fi
echo ""

# ============================================
# 6. VERIFICAR CONECTIVIDAD API
# ============================================

echo -e "${BLUE}6️⃣  Conectividad${NC}"
echo "─────────────────────────────────────"

check_url "http://localhost:8000/api/health" "API Backend (local)"
check_url "http://localhost:8080/" "Frontend (local)"
echo ""

# ============================================
# 7. VERIFICAR CLOUDFLARE TUNNEL
# ============================================

echo -e "${BLUE}7️⃣  Cloudflare Tunnel${NC}"
echo "─────────────────────────────────────"

TUNNEL_NAME=$(cloudflared tunnel list 2>/dev/null | grep "raspberry-weather" || echo "NO_ENCONTRADO")

if [ "$TUNNEL_NAME" != "NO_ENCONTRADO" ]; then
    echo -e "${GREEN}✅${NC} Túnel configurado"
    ((CHECKS_PASSED++))
    
    # Obtener dominio
    DOMAIN=$(cat ~/.cloudflared/config.yml 2>/dev/null | grep "hostname:" | awk '{print $2}' || echo "NO_ENCONTRADO")
    
    if [ "$DOMAIN" != "NO_ENCONTRADO" ]; then
        echo -e "${GREEN}✅${NC} Dominio: $DOMAIN"
        ((CHECKS_PASSED++))
    else
        echo -e "${YELLOW}⚠️${NC}  No puedo leer dominio de config"
    fi
else
    echo -e "${RED}❌${NC} Túnel no configurado"
    ((CHECKS_FAILED++))
fi
echo ""

# ============================================
# 8. INFORMACIÓN DEL SISTEMA
# ============================================

echo -e "${BLUE}8️⃣  Información del sistema${NC}"
echo "─────────────────────────────────────"

# CPU
CPU_TEMP=$(vcgencmd measure_temp 2>/dev/null | grep -oP '\d+\.\d+' || echo "N/A")
echo "🌡️  Temperatura CPU: $CPU_TEMP°C"

# RAM
RAM_FREE=$(free -m | awk 'NR==2{print $7}')
RAM_TOTAL=$(free -m | awk 'NR==2{print $2}')
echo "💾 RAM: ${RAM_FREE}MB / ${RAM_TOTAL}MB"

# Disk
DISK_FREE=$(df -h / | awk 'NR==2{print $4}')
DISK_TOTAL=$(df -h / | awk 'NR==2{print $2}')
echo "💿 Disco: ${DISK_FREE} / ${DISK_TOTAL}"

# IP
IP_LOCAL=$(hostname -I | awk '{print $1}')
echo "🌐 IP local: $IP_LOCAL"

echo ""

# ============================================
# 9. LOGS RECIENTES
# ============================================

echo -e "${BLUE}9️⃣  Últimos errores (si hay)${NC}"
echo "─────────────────────────────────────"

ERROR_BACKEND=$(sudo journalctl -u weather-backend -n 5 --no-pager 2>/dev/null | grep -i "error" || echo "Sin errores")
if [ "$ERROR_BACKEND" == "Sin errores" ]; then
    echo -e "${GREEN}✅${NC} Backend: Sin errores recientes"
else
    echo -e "${YELLOW}⚠️${NC}  Backend:"
    echo "$ERROR_BACKEND" | head -3
fi

ERROR_FRONTEND=$(sudo journalctl -u weather-frontend -n 5 --no-pager 2>/dev/null | grep -i "error" || echo "Sin errores")
if [ "$ERROR_FRONTEND" == "Sin errores" ]; then
    echo -e "${GREEN}✅${NC} Frontend: Sin errores recientes"
else
    echo -e "${YELLOW}⚠️${NC}  Frontend:"
    echo "$ERROR_FRONTEND" | head -3
fi

echo ""

# ============================================
# RESUMEN FINAL
# ============================================

TOTAL=$((CHECKS_PASSED + CHECKS_FAILED))
PERCENTAGE=$((CHECKS_PASSED * 100 / TOTAL))

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 RESUMEN${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Checks pasados: ${GREEN}$CHECKS_PASSED${NC} / $TOTAL"

if [ $CHECKS_FAILED -gt 0 ]; then
    echo -e "Checks fallidos: ${RED}$CHECKS_FAILED${NC}"
fi

echo -e "Porcentaje: ${BLUE}${PERCENTAGE}%${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡TODO ESTÁ CORRECTO!${NC}"
    echo -e "Tu Weather Station está lista para:"
    echo -e "  ✅ Recibir datos del ESP32"
    echo -e "  ✅ Mostrar dashboard en tiempo real"
    echo -e "  ✅ Acceder desde internet (Cloudflare Tunnel)"
else
    echo -e "${RED}⚠️  Hay problemas que necesitan atención${NC}"
    echo -e "Ejecuta: ${YELLOW}sudo journalctl -fu weather-backend${NC} para ver logs"
fi

echo ""
echo -e "${BLUE}═════════════════════════════════════════════${NC}"
echo "Verificación completada: $(date)"
echo -e "${BLUE}═════════════════════════════════════════════${NC}"
echo ""

# Exit code
if [ $CHECKS_FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi
