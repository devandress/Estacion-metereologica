#!/bin/bash

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TEST AUTOMÁTICO - ESP32 + Cloudflare + Duck DNS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
DOMAIN="estacion-temperatura.duckdns.org"
API_DOMAIN="api.estacion-temperatura.duckdns.org"
BACKEND_URL="https://api.estacion-temperatura.duckdns.org"
STATION_ID="ESP32_ESCUELA_001"
LOCALHOST_URL="http://localhost:8000"

# Contadores
PASS=0
FAIL=0
WARN=0

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# FUNCIONES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

test_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASS++))
}

test_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAIL++))
}

test_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARN++))
}

test_info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_header "🧪 TEST AUTOMÁTICO - ESP32 + CLOUDFLARE + DUCK DNS"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. VERIFICAR HERRAMIENTAS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_header "1️⃣  VERIFICAR HERRAMIENTAS DISPONIBLES"

# curl
if command -v curl &> /dev/null; then
    test_pass "curl disponible"
else
    test_fail "curl NO disponible (instalar: sudo apt install curl)"
fi

# nslookup
if command -v nslookup &> /dev/null; then
    test_pass "nslookup disponible"
else
    test_warn "nslookup no disponible (dig/nslookup necesarios para DNS)"
fi

# lsof (para verificar puertos)
if command -v lsof &> /dev/null; then
    test_pass "lsof disponible"
else
    test_warn "lsof no disponible (apt install lsof)"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. VERIFICAR DUCK DNS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_header "2️⃣  VERIFICAR DUCK DNS"

if nslookup $DOMAIN &> /dev/null; then
    test_pass "Duck DNS resuelve: $DOMAIN"
    
    # Obtener IP
    IP=$(nslookup $DOMAIN 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
    test_info "IP actual: $IP"
    
    # Verificar si es IP privada (escuela) o pública
    if [[ $IP =~ ^192\.168\. ]] || [[ $IP =~ ^10\.0\. ]] || [[ $IP =~ ^172\.16\. ]]; then
        test_warn "IP es privada (red interna escuela). ¿Cloudflare accede a tu IP?"
    else
        test_pass "IP parece pública"
    fi
else
    test_fail "Duck DNS NO RESUELVE: $DOMAIN"
    test_info "Soluciones:"
    test_info "  1. Verificar en https://www.duckdns.org/"
    test_info "  2. Ejecutar actualización manual:"
    test_info "     curl 'https://www.duckdns.org/update?domains=estacion-temperatura&token=TU-TOKEN'"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. VERIFICAR CLOUDFLARE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_header "3️⃣  VERIFICAR CLOUDFLARE TUNNEL"

# Resolver CNAME
if nslookup $API_DOMAIN &> /dev/null; then
    test_pass "Cloudflare CNAME resuelve: $API_DOMAIN"
else
    test_fail "Cloudflare CNAME NO RESUELVE: $API_DOMAIN"
    test_info "Soluciones:"
    test_info "  1. Verificar en Cloudflare Dashboard"
    test_info "  2. Asegurar que existe CNAME: api -> tunnel"
    test_info "  3. Esperar a que DNS se propague (5-10 min)"
fi

# Verificar que cloudflared está corriendo
if systemctl is-active --quiet cloudflared.service 2>/dev/null; then
    test_pass "Servicio cloudflared está ACTIVO"
else
    test_warn "Servicio cloudflared NO está activo"
    test_info "Iniciar con: sudo systemctl start cloudflared.service"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. VERIFICAR BACKEND LOCAL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_header "4️⃣  VERIFICAR BACKEND LOCAL"

if lsof -i :8000 &> /dev/null; then
    test_pass "Puerto 8000 está en uso (backend corriendo)"
    
    # Probar conexión
    if curl -s $LOCALHOST_URL/api/stations/ > /dev/null 2>&1; then
        test_pass "Backend responde a localhost:8000"
        
        # Obtener estaciones
        STATIONS=$(curl -s $LOCALHOST_URL/api/stations/ | wc -l)
        test_info "Backend tiene datos ($STATIONS líneas de respuesta)"
    else
        test_fail "Backend NO responde a localhost:8000"
    fi
else
    test_fail "Puerto 8000 NO está en uso (backend NO corriendo)"
    test_info "Iniciar con: cd backend && python main.py"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. VERIFICAR CONEXIÓN HTTPS DESDE CLOUDFLARE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_header "5️⃣  VERIFICAR HTTPS DESDE CLOUDFLARE"

HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $BACKEND_URL/api/stations/ 2>/dev/null)

if [[ $HTTPS_RESPONSE == "200" ]]; then
    test_pass "HTTPS funciona: $BACKEND_URL/api/stations/ (HTTP $HTTPS_RESPONSE)"
elif [[ $HTTPS_RESPONSE == "000" ]]; then
    test_fail "HTTPS NO funciona (timeout/sin conexión)"
    test_info "Posibles causas:"
    test_info "  1. Cloudflare tunnel no está corriendo"
    test_info "  2. Backend no accesible desde Cloudflare"
    test_info "  3. Firewall bloqueando HTTPS"
else
    test_warn "HTTPS retorna HTTP $HTTPS_RESPONSE (esperado 200)"
    test_info "Revisar:"
    test_info "  1. Si es 403: problema de SSL/certificados"
    test_info "  2. Si es 500: error en backend"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. VERIFICAR CONFIGURACIÓN .env
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_header "6️⃣  VERIFICAR CONFIGURACIÓN .env"

if [[ -f /home/andy/Desktop/weather_app/.env ]]; then
    test_pass "Archivo .env existe"
    
    # Verificar API_URL
    if grep -q "API_URL" /home/andy/Desktop/weather_app/.env; then
        API_URL_VALUE=$(grep "API_URL" /home/andy/Desktop/weather_app/.env | cut -d= -f2)
        test_info "API_URL configurada: $API_URL_VALUE"
        
        if [[ "$API_URL_VALUE" == "https://api.estacion-temperatura.duckdns.org" ]]; then
            test_pass "API_URL está correctamente configurada para Cloudflare"
        else
            test_warn "API_URL no es la esperada: $API_URL_VALUE"
        fi
    else
        test_warn "API_URL no encontrada en .env"
    fi
else
    test_warn "Archivo .env NO existe"
    test_info "Crear con: echo 'API_URL=https://api.estacion-temperatura.duckdns.org' > /home/andy/Desktop/weather_app/.env"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. VERIFICAR CÓDIGO ESP32
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_header "7️⃣  VERIFICAR CÓDIGO ESP32"

if [[ -f /home/andy/Desktop/weather_app/ESP32_CloudflareDuckDNS.ino ]]; then
    test_pass "Archivo ESP32_CloudflareDuckDNS.ino existe"
    
    # Verificar configuraciones
    if grep -q "WIFI_SSID" /home/andy/Desktop/weather_app/ESP32_CloudflareDuckDNS.ino; then
        test_pass "Configuración WIFI_SSID encontrada"
    fi
    
    if grep -q "estacion-temperatura.duckdns.org" /home/andy/Desktop/weather_app/ESP32_CloudflareDuckDNS.ino; then
        test_pass "URL Duck DNS configurada en ESP32"
    fi
    
    if grep -q "STATION_ID" /home/andy/Desktop/weather_app/ESP32_CloudflareDuckDNS.ino; then
        test_pass "STATION_ID configurado en ESP32"
    fi
else
    test_fail "Archivo ESP32_CloudflareDuckDNS.ino NO EXISTE"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 8. PRUEBA DE POST (simular ESP32)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_header "8️⃣  SIMULAR POST DEL ESP32"

# Crear JSON de prueba
JSON_DATA='{"temperature":23.5,"humidity":65.0,"pressure":1013.25,"wind_speed":3.5,"timestamp":"2024-01-15T10:30:00Z"}'

# Enviar a backend local
LOCAL_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$JSON_DATA" \
    "$LOCALHOST_URL/api/stations/ESP32_TEST/data" \
    -w "\n%{http_code}" 2>/dev/null | tail -1)

if [[ $LOCAL_RESPONSE == "201" ]] || [[ $LOCAL_RESPONSE == "200" ]]; then
    test_pass "POST a localhost funciona (HTTP $LOCAL_RESPONSE)"
else
    test_warn "POST a localhost retorna HTTP $LOCAL_RESPONSE"
fi

# Enviar a backend vía Cloudflare
CLOUDFLARE_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "$JSON_DATA" \
    "$BACKEND_URL/api/stations/ESP32_TEST/data" \
    -w "\n%{http_code}" 2>/dev/null | tail -1)

if [[ $CLOUDFLARE_RESPONSE == "201" ]] || [[ $CLOUDFLARE_RESPONSE == "200" ]]; then
    test_pass "POST vía Cloudflare funciona (HTTP $CLOUDFLARE_RESPONSE)"
else
    test_warn "POST vía Cloudflare retorna HTTP $CLOUDFLARE_RESPONSE"
fi

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RESUMEN FINAL
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

print_header "📊 RESUMEN DE RESULTADOS"

echo -e "${GREEN}✅ PASS: $PASS${NC}"
echo -e "${RED}❌ FAIL: $FAIL${NC}"
echo -e "${YELLOW}⚠️  WARN: $WARN${NC}"

echo ""

# Determinar estado general
if [[ $FAIL -eq 0 ]]; then
    if [[ $WARN -eq 0 ]]; then
        echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  ✅ ¡TODO FUNCIONANDO PERFECTAMENTE!  ║${NC}"
        echo -e "${GREEN}║  Puedes iniciar el ESP32              ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
        exit 0
    else
        echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║  ⚠️  FUNCIONANDO CON ADVERTENCIAS    ║${NC}"
        echo -e "${YELLOW}║  Revisar los WARN antes de usar      ║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
        exit 1
    fi
else
    echo -e "${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ PROBLEMAS ENCONTRADOS             ║${NC}"
    echo -e "${RED}║  Revisar los FAIL antes de continuar  ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════╝${NC}"
    exit 2
fi
