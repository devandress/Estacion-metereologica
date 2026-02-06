#!/bin/bash

#####################################
# Weather App - Instalación RPi 8GB
# Script automático de setup
#####################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
PROJECT_DIR="$HOME/weather_app"
DOCKER_COMPOSE_URL="https://github.com/docker/compose/releases/latest/download/docker-compose-Linux-aarch64"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🍓 Weather App - RPi 8GB Setup       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Función para imprimir pasos
step() {
    echo -e "${YELLOW}▶ $1${NC}"
}

# Función para imprimir éxito
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Función para imprimir error
error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Verificar si es Raspberry Pi
step "Verificando sistema..."
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    error "Este script está diseñado para Raspberry Pi. Continuando de todas formas..."
fi
success "Sistema detectado"

# Actualizar sistema
step "Actualizando sistema (esto puede tardar 5-10 minutos)..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
success "Sistema actualizado"

# Instalar dependencias
step "Instalando dependencias..."
sudo apt-get install -y -qq \
    curl \
    wget \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    > /dev/null 2>&1
success "Dependencias instaladas"

# Instalar Docker
step "Instalando Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh > /dev/null 2>&1
sudo usermod -aG docker $USER
success "Docker instalado"

# Instalar Docker Compose
step "Instalando Docker Compose..."
sudo curl -L "$DOCKER_COMPOSE_URL" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
success "Docker Compose instalado"

# Verificar instalaciones
step "Verificando instalaciones..."
docker --version
docker-compose --version
success "Verificación completada"

# Clonar repositorio
if [ ! -d "$PROJECT_DIR" ]; then
    step "Clonando repositorio..."
    git clone https://github.com/devandress/Estacion-metereologica.git "$PROJECT_DIR"
    success "Repositorio clonado"
else
    step "Directorio ya existe, actualizando..."
    cd "$PROJECT_DIR"
    git pull origin main
    success "Repositorio actualizado"
fi

cd "$PROJECT_DIR"

# Crear archivo .env
step "Configurando archivo .env..."
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# Base de datos
DATABASE_URL=postgresql://weather_user:weather_secure_password@postgres:5432/weather_db

# Backend
API_URL=http://localhost:8000
HOST=0.0.0.0
PORT=8000

# Frontend
FRONTEND_URL=http://localhost:80

# Cloudflare/Duck DNS (reemplazar con tus valores)
CLOUDFLARE_API_TOKEN=tu-token-cloudflare
DUCKDNS_TOKEN=tu-token-duckdns
DUCKDNS_DOMAIN=estacion-temperatura

# Logs
LOG_LEVEL=info
EOF
    chmod 600 .env
    success "Archivo .env creado"
    echo -e "${YELLOW}⚠️  Editar .env con tus credenciales:${NC}"
    echo "   nano $PROJECT_DIR/.env"
else
    success "Archivo .env ya existe"
fi

# Construir imágenes Docker
step "Construyendo imágenes Docker (esto puede tardar 10-15 minutos)..."
docker-compose build --quiet
success "Imágenes construidas"

# Iniciar servicios
step "Iniciando servicios..."
docker-compose up -d
success "Servicios iniciados"

# Esperar a que se inicien
sleep 10

# Verificar estado
step "Verificando estado de servicios..."
docker-compose ps

# Health check
step "Realizando health checks..."
if docker-compose ps | grep -q "healthy"; then
    success "Servicios activos y saludables"
else
    echo -e "${YELLOW}⚠️  Espera un momento para que se inicialicen completamente...${NC}"
    sleep 20
    docker-compose ps
fi

# Mostrar URLs
echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🎉 ¡Instalación Completada!          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}URLs de acceso:${NC}"
echo "  🌐 Dashboard: http://$(hostname -I | awk '{print $1}'):80"
echo "  🔌 API: http://$(hostname -I | awk '{print $1}'):8000"
echo "  📊 Stats: docker stats"
echo ""
echo -e "${GREEN}Próximos pasos:${NC}"
echo "  1. Editar .env con credenciales:"
echo "     nano $PROJECT_DIR/.env"
echo ""
echo "  2. Configurar Cloudflare Tunnel (opcional)"
echo "  3. Configurar Duck DNS (opcional)"
echo "  4. Cargar código en ESP32"
echo ""
echo -e "${GREEN}Comandos útiles:${NC}"
echo "  docker-compose logs -f          # Ver logs en tiempo real"
echo "  docker-compose restart          # Reiniciar servicios"
echo "  docker-compose down             # Detener servicios"
echo "  docker stats                    # Ver consumo de recursos"
echo ""
echo -e "${GREEN}Documentación:${NC}"
echo "  📖 Guía RPi: cat RASPBERRY_PI_8GB_SETUP.md"
echo "  📖 Guía ESP32: cat README_ESP32_SETUP.md"
echo ""
success "¡Sistema listo para usar! 🚀"
