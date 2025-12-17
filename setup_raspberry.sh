#!/bin/bash

# Weather Station Setup Script para Raspberry Pi
set -e

echo "🌤️ Weather Station Setup Script"
echo "================================"

# Detectar si es Raspberry Pi
if grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
    echo "✅ Raspberry Pi detectada"
else
    echo "⚠️ Este script está optimizado para Raspberry Pi"
fi

# Crear usuario si no existe
if ! id "weather" &>/dev/null; then
    echo "Creando usuario 'weather'..."
    sudo useradd -m -s /bin/bash weather
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
sudo apt-get update
sudo apt-get install -y python3.11 python3.11-venv python3-pip \
    postgresql postgresql-contrib \
    nginx \
    git \
    curl

# Setup backend
echo "⚙️ Configurando backend..."
cd /home/weather/weather_app/backend 2>/dev/null || {
    echo "❌ Directorio backend no encontrado"
    exit 1
}

python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Inicializar base de datos
echo "🗄️ Inicializando PostgreSQL..."
sudo -u postgres createdb weather_db 2>/dev/null || echo "Base de datos ya existe"
sudo -u postgres createuser weather_user 2>/dev/null || echo "Usuario ya existe"

# Setup systemd service
echo "🚀 Configurando systemd service..."
sudo tee /etc/systemd/system/weather-api.service > /dev/null <<EOF
[Unit]
Description=Weather Station API
After=network.target postgresql.service

[Service]
Type=notify
User=weather
WorkingDirectory=/home/weather/weather_app/backend
Environment="PATH=/home/weather/weather_app/backend/venv/bin"
ExecStart=/home/weather/weather_app/backend/venv/bin/gunicorn -w 2 -b 127.0.0.1:8000 main:app
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable weather-api

# Setup Nginx
echo "🌐 Configurando Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/weather-station
sudo ln -sf /etc/nginx/sites-available/weather-station /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx

echo ""
echo "✅ Setup completado!"
echo ""
echo "Próximos pasos:"
echo "1. Editar /home/weather/weather_app/backend/.env con credenciales"
echo "2. Inicializar base de datos: python -c 'from app.core.database import init_db; init_db()'"
echo "3. Iniciar servicios:"
echo "   sudo systemctl start weather-api"
echo "   sudo systemctl start nginx"
echo "4. Acceder a: http://$(hostname -I | awk '{print $1}')"
echo ""
