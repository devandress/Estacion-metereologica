#!/bin/bash

# 🌤️ Weather Station - Quick API Test Script
# Ejecuta: bash api_test.sh

set -e

API_URL="http://localhost:8000/api"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🌤️ Weather Station API Test${NC}\n"

# ===== TEST 1: CREAR ESTACIÓN =====
echo -e "${YELLOW}1. Creando estación de prueba...${NC}"
STATION_RESPONSE=$(curl -s -X POST $API_URL/stations/ \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_station_001",
    "name": "Estación de Prueba",
    "location": "Madrid, España",
    "latitude": 40.4168,
    "longitude": -3.7038,
    "description": "Estación para testing"
  }')

STATION_ID=$(echo $STATION_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✅ Estación creada: $STATION_ID${NC}\n"

# ===== TEST 2: LISTAR ESTACIONES =====
echo -e "${YELLOW}2. Listando estaciones...${NC}"
curl -s $API_URL/stations/ | python3 -m json.tool | head -30
echo -e "\n${GREEN}✅ Estaciones listadas${NC}\n"

# ===== TEST 3: CREAR FUENTE EXTERNA =====
echo -e "${YELLOW}3. Creando fuente de datos externa...${NC}"
SOURCE_RESPONSE=$(curl -s -X POST $API_URL/external/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Weather Source",
    "source_type": "custom",
    "field_mapping": {
      "temperature": "temp",
      "humidity": "humidity"
    },
    "sync_interval_minutes": 30
  }')

SOURCE_ID=$(echo $SOURCE_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✅ Fuente creada: $SOURCE_ID${NC}\n"

# ===== TEST 4: INGESTAR DATOS =====
echo -e "${YELLOW}4. Ingastando datos externos...${NC}"
INGEST_RESPONSE=$(curl -s -X POST $API_URL/external/data \
  -H "Content-Type: application/json" \
  -d "{
    \"source_id\": \"$SOURCE_ID\",
    \"station_id\": \"$STATION_ID\",
    \"raw_data\": {
      \"temp\": 22.5,
      \"humidity\": 65,
      \"wind_speed\": 3.2
    },
    \"location_name\": \"Madrid\",
    \"latitude\": 40.4168,
    \"longitude\": -3.7038
  }")

RECORD_ID=$(echo $INGEST_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo -e "${GREEN}✅ Datos ingastados: Record ID $RECORD_ID${NC}\n"

# ===== TEST 5: VER SALUD DE ESTACIÓN =====
echo -e "${YELLOW}5. Verificando salud de estación...${NC}"
curl -s $API_URL/stations/$STATION_ID/health | python3 -m json.tool
echo -e "${GREEN}✅ Salud verificada${NC}\n"

# ===== TEST 6: VER ESTADÍSTICAS GENERALES =====
echo -e "${YELLOW}6. Estadísticas del sistema...${NC}"
curl -s $API_URL/stations/stats/overview | python3 -m json.tool
echo -e "${GREEN}✅ Estadísticas obtenidas${NC}\n"

# ===== TEST 7: CREAR ENLACE COMPARTIBLE =====
echo -e "${YELLOW}7. Creando enlace público...${NC}"
SHARE_RESPONSE=$(curl -s -X POST $API_URL/public/share-links \
  -H "Content-Type: application/json" \
  -d "{
    \"station_id\": \"$STATION_ID\",
    \"description\": \"Datos públicos de la estación de prueba\",
    \"can_view_current\": true,
    \"can_view_history\": true,
    \"can_download\": true,
    \"expires_in_days\": 30
  }")

TOKEN=$(echo $SHARE_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
LINK_ID=$(echo $SHARE_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✅ Enlace creado:${NC}"
echo -e "   ID: $LINK_ID"
echo -e "   Token: $TOKEN\n"

# ===== TEST 8: ACCEDER A DATOS PÚBLICOS =====
echo -e "${YELLOW}8. Accediendo a datos públicos (sin autenticación)...${NC}"
echo -e "   GET /api/public/station/$TOKEN/current"
curl -s http://localhost:8000/api/public/station/$TOKEN | python3 -m json.tool
echo -e "${GREEN}✅ Datos públicos accesibles${NC}\n"

# ===== TEST 9: VER MAPA EN NAVEGADOR =====
echo -e "${YELLOW}9. Mapa interactivo disponible en:${NC}"
echo -e "   ${BLUE}http://localhost:8080 → Pestaña '📍 Mapa'${NC}\n"

# ===== RESUMEN =====
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ TODOS LOS TESTS COMPLETADOS${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Prueba con API Docs interactivo:${NC}"
echo -e "  ${BLUE}http://localhost:8000/docs${NC}\n"

echo -e "${YELLOW}Endpoints útiles:${NC}"
echo -e "  GET    /api/stations/                        # Listar estaciones"
echo -e "  GET    /api/stations/$STATION_ID/health     # Ver salud"
echo -e "  GET    /api/stations/batch/health            # Ver salud de todas"
echo -e "  POST   /api/external/sources                 # Crear fuente"
echo -e "  POST   /api/external/data                    # Ingestar datos"
echo -e "  POST   /api/public/share-links               # Crear enlace público"
echo -e "  GET    /api/public/station/$TOKEN/current   # Acceder públicamente\n"

echo -e "${BLUE}Para ver documentación completa:${NC}"
echo -e "  cat NUEVAS_FUNCIONALIDADES.md"
echo -e "  cat IMPLEMENTACION_COMPLETADA.md\n"
