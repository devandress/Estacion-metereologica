#!/bin/bash

# Start script - Inicia ambos servicios

echo "🚀 Weather Station - Iniciando sistema..."
echo ""

# Detener procesos anteriores
echo "🛑 Deteniendo procesos anteriores..."
pkill -9 -f "http.server\|python.*main\|uvicorn" 2>/dev/null
sleep 1

# Frontend
echo "🌐 Iniciando Frontend (Puerto 8080)..."
cd /home/andy/weather_app/frontend
python3 -m http.server 8080 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 1

# Backend
echo "🔌 Iniciando Backend (Puerto 8000)..."
cd /home/andy/weather_app/backend
source venv/bin/activate 2>/dev/null
python3 main.py > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

echo ""
echo "✅ ¡Sistema iniciado!"
echo ""
echo "📊 Frontend:  http://localhost:8080"
echo "🔌 Backend:   http://localhost:8000"
echo "📚 API Docs:  http://localhost:8000/docs"
echo ""
echo "PIDs:"
echo "  Frontend: $FRONTEND_PID"
echo "  Backend:  $BACKEND_PID"
echo ""
echo "Para detener: kill $BACKEND_PID $FRONTEND_PID"
echo ""
