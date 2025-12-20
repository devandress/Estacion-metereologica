#!/bin/bash

# 🍓 SETUP WEATHER STATION PARA RASPBERRY PI (Optimizado)
# Compatible con Raspberry Pi 4/5 (16GB RAM)
# Incluye Cloudflare Tunnel (sin abrir puertos) + Docker opcional

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🍓 WEATHER STATION - SETUP RASPBERRY PI                       ║"
echo "║  ✅ Cloudflare Tunnel (sin puertos)                            ║"
echo "║  ✅ PostgreSQL Local                                           ║"
echo "║  ✅ Gunicorn + Nginx                                           ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ===== 1. ACTUALIZAR SISTEMA =====
echo -e "${BLUE}1️⃣  Actualizando sistema...${NC}"
sudo apt-get update && sudo apt-get upgrade -y
echo -e "${GREEN}✅ Sistema actualizado${NC}\n"

# ===== 2. INSTALAR DEPENDENCIAS =====
echo -e "${BLUE}2️⃣  Instalando dependencias...${NC}"
sudo apt-get install -y \
    python3.11 python3.11-venv python3.11-dev \
    postgresql postgresql-contrib \
    nginx \
    git curl wget \
    build-essential libssl-dev libffi-dev

echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"

# ===== 3. CREAR DIRECTORIO =====
echo -e "${BLUE}3️⃣  Preparando directorio...${NC}"
APPDIR="/home/pi/weather_station"
sudo mkdir -p $APPDIR
sudo chown pi:pi $APPDIR
cd $APPDIR
echo -e "${GREEN}✅ Directorio: $APPDIR${NC}\n"

# ===== 4. CREAR VENV =====
echo -e "${BLUE}4️⃣  Creando entorno virtual...${NC}"
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
echo -e "${GREEN}✅ Venv creado${NC}\n"

# ===== 5. INSTALAR PYTHON PACKAGES =====
echo -e "${BLUE}5️⃣  Instalando packages...${NC}"
cat > /tmp/requirements_raspberry.txt << 'PYEOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
psycopg==3.0.0
pydantic==2.5.0
pydantic-settings==2.1.0
python-dotenv==1.0.0
httpx==0.25.1
gunicorn==21.2.0
python-multipart==0.0.6
aiofiles==23.2.1
PYEOF

pip install -r /tmp/requirements_raspberry.txt
echo -e "${GREEN}✅ Packages instalados${NC}\n"

# ===== 6. CONFIGURAR POSTGRESQL =====
echo -e "${BLUE}6️⃣  Configurando PostgreSQL...${NC}"
sudo systemctl start postgresql
sudo systemctl enable postgresql

sudo -u postgres psql << SQLEOF || true
CREATE USER weather_user WITH PASSWORD 'raspberry_2025';
CREATE DATABASE weather_db OWNER weather_user;
ALTER ROLE weather_user CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE weather_db TO weather_user;
GRANT ALL ON SCHEMA public TO weather_user;
SQLEOF

echo -e "${GREEN}✅ PostgreSQL configurado${NC}\n"

# ===== 7. INSTALAR CLOUDFLARE TUNNEL =====
echo -e "${BLUE}7️⃣  Instalando Cloudflare Tunnel...${NC}"

# Detectar arquitectura
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then
    URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb"
elif [ "$ARCH" = "armv7l" ]; then
    URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm.deb"
else
    URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
fi

wget -q $URL -O /tmp/cloudflared.deb
sudo dpkg -i /tmp/cloudflared.deb
rm /tmp/cloudflared.deb

echo -e "${GREEN}✅ Cloudflare Tunnel instalado${NC}\n"

# ===== 8. CREAR SYSTEMD SERVICES =====
echo -e "${BLUE}8️⃣  Creando systemd services...${NC}"

sudo tee /etc/systemd/system/weather-backend.service > /dev/null << 'SYSEOF'
[Unit]
Description=Weather Station Backend
After=network.target postgresql.service

[Service]
Type=notify
User=pi
WorkingDirectory=/home/pi/weather_station
Environment="PATH=/home/pi/weather_station/venv/bin"
Environment="DATABASE_URL=postgresql://weather_user:raspberry_2025@localhost:5432/weather_db"
Environment="CORS_ORIGINS=[\"*\"]"
ExecStart=/home/pi/weather_station/venv/bin/gunicorn \
    -w 2 \
    -k uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile - \
    backend.main:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSEOF

sudo tee /etc/systemd/system/weather-frontend.service > /dev/null << 'SYSEOF'
[Unit]
Description=Weather Station Frontend (Nginx)
After=network.target

[Service]
Type=forking
ExecStart=/usr/sbin/nginx -c /etc/nginx/weather.conf
ExecReload=/bin/kill -s HUP $MAINPID
ExecStop=/bin/kill -s QUIT $MAINPID
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SYSEOF

sudo tee /etc/systemd/system/weather-tunnel.service > /dev/null << 'SYSEOF'
[Unit]
Description=Cloudflare Tunnel - Weather Station
After=network.target

[Service]
Type=simple
User=pi
ExecStart=/usr/local/bin/cloudflared tunnel run raspberry
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSEOF

sudo systemctl daemon-reload
echo -e "${GREEN}✅ Services creados${NC}\n"

# ===== 9. CONFIGURAR NGINX =====
echo -e "${BLUE}9️⃣  Configurando Nginx...${NC}"

sudo tee /etc/nginx/weather.conf > /dev/null << 'NGINXEOF'
user pi;
worker_processes 2;
pid /var/run/nginx.pid;

events {
    worker_connections 256;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    sendfile on;
    tcp_nopush on;
    keepalive_timeout 30;
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/javascript application/json;

    upstream backend {
        server 127.0.0.1:8000;
        keepalive 32;
    }

    server {
        listen 8080;
        server_name _;
        
        root /home/pi/weather_station/frontend;
        index index.html;

        # API
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
        }

        # Docs
        location /docs {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }

        location /openapi.json {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }

        # Static
        location /static/ {
            alias /home/pi/weather_station/frontend/js/;
            expires 7d;
        }

        # Frontend
        location / {
            try_files $uri $uri/ /index.html;
            expires 1h;
        }
    }
}
NGINXEOF

echo -e "${GREEN}✅ Nginx configurado${NC}\n"

# ===== 10. CREAR .ENV =====
echo -e "${BLUE}🔟 Creando archivo .env...${NC}"

cat > $APPDIR/.env << 'ENVEOF'
# Database
DATABASE_URL=postgresql://weather_user:raspberry_2025@localhost:5432/weather_db

# API
API_TITLE=Weather Station API
API_VERSION=1.0.0

# Server
HOST=127.0.0.1
PORT=8000
RELOAD=false

# Security
CORS_ORIGINS=["*"]

# Data retention
DATA_RETENTION_DAYS=30
ENVEOF

echo -e "${GREEN}✅ .env creado${NC}\n"

# ===== INFORMACIÓN FINAL =====
echo "╔════════════════════════════════════════════════════════════════╗"
echo -e "${GREEN}✅ SETUP COMPLETADO!${NC}"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${BLUE}📋 PRÓXIMOS PASOS:${NC}\n"

echo "1️⃣  CONFIGURAR CLOUDFLARE TUNNEL:"
echo "    $ cloudflared tunnel login"
echo "    Selecciona tu dominio en el navegador que se abre"
echo ""

echo "2️⃣  CREAR TUNNEL:"
echo "    $ cloudflared tunnel create raspberry-weather"
echo ""

echo "3️⃣  CONFIGURAR RUTAS:"
echo "    $ cloudflared tunnel route dns raspberry-weather tudominio.com"
echo ""

echo "4️⃣  INICIAR SERVICIOS:"
echo "    $ sudo systemctl start weather-backend weather-frontend weather-tunnel"
echo "    $ sudo systemctl enable weather-backend weather-frontend weather-tunnel"
echo ""

echo "5️⃣  VERIFICAR ESTADO:"
echo "    $ sudo systemctl status weather-backend"
echo "    $ sudo systemctl status weather-frontend"
echo "    $ sudo systemctl status weather-tunnel"
echo ""

echo "6️⃣  VER LOGS:"
echo "    $ sudo journalctl -fu weather-backend"
echo "    $ sudo journalctl -fu weather-frontend"
echo "    $ sudo journalctl -fu weather-tunnel"
echo ""

echo -e "${BLUE}🌐 ACCESO:${NC}"
echo "    Local:     http://localhost:8080"
echo "    Remoto:    https://tudominio.com"
echo ""

