#!/bin/bash

# 🔍 VERIFICADOR DE INSTALACIÓN - Versión Optimizada
# Comprueba que todo está configurado correctamente

set -e

clear
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🔍 VERIFICADOR DE ESTACIÓN METEOROLÓGICA                     ║"
echo "║  Versión Optimizada para Raspberry Pi 8GB                    ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

PASSED=0
FAILED=0
WARNINGS=0

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check() {
    echo -n "[$1/10] $2... "
}

pass() {
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}"
    echo "         → $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}"
    echo "         → $1"
    ((WARNINGS++))
}

# Test 1: Docker
check "1" "Docker instalado"
if command -v docker &> /dev/null; then
    pass
else
    fail "Docker no encontrado. Instala con: curl -fsSL https://get.docker.com | sh"
fi

# Test 2: Docker Compose
check "2" "Docker Compose"
if command -v docker-compose &> /dev/null; then
    pass
else
    fail "Docker Compose no encontrado. Instala con: sudo apt install docker-compose"
fi

# Test 3: Permisos Docker
check "3" "Permisos de Docker"
if docker ps > /dev/null 2>&1; then
    pass
else
    warn "No tienes permisos. Ejecuta: sudo usermod -aG docker \$USER && newgrp docker"
fi

# Test 4: Estructura de directorios
check "4" "Estructura de carpetas"
if [[ -d "backend" && -d "frontend" && -f "docker-compose.yml" ]]; then
    pass
else
    fail "Estructura incompleta. Asegúrate de estar en /home/andy/Desktop/weather_app"
fi

# Test 5: requirements.txt
check "5" "Backend requirements.txt"
if [[ -f "backend/requirements.txt" ]]; then
    # Verifica que NO tenga PostgreSQL (versión ligera)
    if ! grep -q "psycopg2" backend/requirements.txt; then
        pass
    else
        warn "Aún tiene psycopg2. La versión debería usar SQLite"
    fi
else
    fail "No encontré backend/requirements.txt"
fi

# Test 6: Frontend HTML
check "6" "Frontend index.html"
if [[ -f "frontend/index.html" ]]; then
    pass
else
    fail "No encontré frontend/index.html"
fi

# Test 7: Dockerfile optimizado
check "7" "Dockerfile optimizado"
if [[ -f "Dockerfile.backend" ]]; then
    if grep -q "python:3.11-slim" Dockerfile.backend; then
        pass
    else
        warn "Dockerfile podría estar usando image más pesada"
    fi
else
    fail "No encontré Dockerfile.backend"
fi

# Test 8: Docker Compose con SQLite
check "8" "Docker Compose optimizado"
if [[ -f "docker-compose.yml" ]]; then
    if ! grep -q "postgres:" docker-compose.yml; then
        pass
    else
        warn "Aún tiene servicio PostgreSQL. Para versión ligera, solo backend con SQLite"
    fi
else
    fail "No encontré docker-compose.yml"
fi

# Test 9: Guía de registro
check "9" "Documentación usuario"
if [[ -f "GUIA_REGISTRAR_ESTACION.md" ]]; then
    pass
else
    warn "No encontré GUIA_REGISTRAR_ESTACION.md"
fi

# Test 10: Script de inicio
check "10" "Script de inicio optimizado"
if [[ -f "start-rpi-optimizado.sh" && -x "start-rpi-optimizado.sh" ]]; then
    pass
else
    fail "Script start-rpi-optimizado.sh no existe o no es ejecutable"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo -e "║  Resultados:                                                ║"
echo -e "║  ${GREEN}✓ PASS: $PASSED/10${NC}        ${RED}✗ FAIL: $FAILED/10${NC}        ${YELLOW}⚠ WARN: $WARNINGS/10${NC}             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ ¡TODO VERIFICADO CORRECTAMENTE!                             ║${NC}"
    echo -e "${GREEN}║  Ahora puedes ejecutar: ./start-rpi-optimizado.sh              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ Hay problemas que arreglar antes de iniciar                 ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "💡 Soluciona los errores marcados arriba y vuelve a ejecutar este script"
    exit 1
fi
