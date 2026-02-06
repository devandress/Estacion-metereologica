#!/bin/bash

# Script para instalar y configurar Cloudflare Tunnel en Raspberry Pi
# Debe ejecutarse DESPUÉS de que la aplicación esté corriendo en Docker

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🌐 Cloudflare Tunnel - RPi Setup    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar si estamos en Raspberry Pi
if [ ! -f /proc/cpuinfo ] || ! grep -q "ARM\|aarch64" /proc/cpuinfo; then
    echo -e "${YELLOW}⚠️  Este script está optimizado para ARM (Raspberry Pi)${NC}"
fi

# Descargar cloudflared
echo -e "${YELLOW}▶ Descargando Cloudflared para ARM64...${NC}"
ARCH=$(uname -m)
if [[ "$ARCH" == "aarch64" ]]; then
    DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
elif [[ "$ARCH" == "armv7l" ]]; then
    DOWNLOAD_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm"
else
    echo -e "${RED}❌ Arquitectura no soportada: $ARCH${NC}"
    exit 1
fi

curl -L "$DOWNLOAD_URL" -o /tmp/cloudflared
chmod +x /tmp/cloudflared
sudo mv /tmp/cloudflared /usr/local/bin/cloudflared
echo -e "${GREEN}✅ Cloudflared instalado${NC}"

# Verificar instalación
cloudflared --version

# Crear directorio de configuración
sudo mkdir -p /etc/cloudflared
sudo chown -R $USER /etc/cloudflared

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔐 Autenticación con Cloudflare      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo "Ejecutando: cloudflared tunnel login"
echo ""
cloudflared tunnel login

# Obtener nombre del tunnel
echo ""
echo -e "${YELLOW}▶ Nombre del tunnel (ej: weather-app):${NC}"
read -p "Ingresa nombre: " TUNNEL_NAME

# Crear tunnel
echo -e "${YELLOW}▶ Creando tunnel: $TUNNEL_NAME${NC}"
cloudflared tunnel create "$TUNNEL_NAME"

# Obtener UUID
UUID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
echo -e "${GREEN}✅ Tunnel ID: $UUID${NC}"

# Obtener dominio
echo ""
echo -e "${YELLOW}▶ Dominio Duck DNS (ej: estacion-temperatura.duckdns.org):${NC}"
read -p "Ingresa dominio: " DUCKDNS_DOMAIN

# Crear archivo de configuración
echo -e "${YELLOW}▶ Configurando tunnel...${NC}"
sudo tee /etc/cloudflared/config.yml > /dev/null << EOF
tunnel: $TUNNEL_NAME
credentials-file: /root/.cloudflared/${UUID}.json

ingress:
  - hostname: api.$DUCKDNS_DOMAIN
    service: http://localhost:8000
  - hostname: $DUCKDNS_DOMAIN
    service: http://localhost:80
  - service: http_status:404
EOF

echo -e "${GREEN}✅ Configuración guardada${NC}"

# Crear servicio systemd
echo -e "${YELLOW}▶ Creando servicio systemd...${NC}"
sudo tee /etc/systemd/system/cloudflared.service > /dev/null << EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target docker.service
Wants=network-online.target
Requires=docker.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel run --config /etc/cloudflared/config.yml $TUNNEL_NAME
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable cloudflared.service
echo -e "${GREEN}✅ Servicio cloudflared configurado${NC}"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ Configuración Completada          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Para iniciar el servicio:${NC}"
echo "  sudo systemctl start cloudflared.service"
echo ""
echo -e "${GREEN}Para verificar estado:${NC}"
echo "  sudo systemctl status cloudflared.service"
echo ""
echo -e "${GREEN}Para ver logs:${NC}"
echo "  sudo journalctl -u cloudflared -f"
echo ""
echo -e "${GREEN}URLs de acceso:${NC}"
echo "  🌐 Dashboard: https://$DUCKDNS_DOMAIN"
echo "  🔌 API: https://api.$DUCKDNS_DOMAIN"
echo ""
