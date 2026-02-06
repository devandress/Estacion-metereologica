# 🌦️ Weather App - Sistema de Estaciones Meteorológicas

**Sistema profesional de monitoreo de estaciones meteorológicas con acceso remoto, gráficos en vivo y mapas interactivos.**

---

## ⚡ Inicio Rápido (3 Pasos)

### 1️⃣ En tu computadora
```bash
cd /home/andy/Desktop/weather_app
source .venv/bin/activate  # Activar virtualenv
python3 weather_live.py     # Iniciar simuladores
```

### 2️⃣ En otra terminal
```bash
cd backend && python main.py  # Backend (8000)
```

### 3️⃣ En otra terminal
```bash
cd frontend && python3 -m http.server 8081  # Frontend (8081)
```

### 4️⃣ Abrir navegador
```
http://localhost:8081
```

**✅ ¡Listo en 2 minutos!**

---

## 📖 Documentación Completa

### 🚀 Setup Paso a Paso
👉 **[SETUP_COMPLETO.md](SETUP_COMPLETO.md)** - Guía completa con 4 opciones:
- **Opción A:** Inicio rápido en localhost (5 min)
- **Opción B:** Raspberry Pi + Red Escuela (30 min)
- **Opción C:** Cloudflare Tunnel Global (20 min)
- **Opción D:** Docker (10 min)

### 🔧 Configuración de URL
👉 **[GUIA_URL_CONFIGURACION.md](GUIA_URL_CONFIGURACION.md)** - Cambiar URL de API

### ☁️ Cloudflare Tunnel
👉 **[CONFIGURACION_CLOUDFLARE.md](CONFIGURACION_CLOUDFLARE.md)** - Acceso global sin puertos

### ⚡ Referencia Rápida
👉 **[REFERENCIA_RAPIDA_URL.txt](REFERENCIA_RAPIDA_URL.txt)** - Comandos rápidos

---

## 📋 Tabla Comparativa

| Escenario | Comando | Tiempo | Acceso |
|-----------|---------|--------|--------|
| **Pruebas Locales** | `python3 weather_live.py` | 2 min | localhost:8081 |
| **Red Escuela** | `bash setup_api_url.sh 2` | 30 min | 192.168.1.x:8081 |
| **Acceso Global** | `bash setup_api_url.sh 3` | 20 min | https://tu-dominio.com |
| **Docker** | `docker-compose up` | 10 min | localhost:8081 |

---

## 🚀 Scripts Disponibles

```bash
# Iniciar TODO (backend + frontend + simuladores)
bash start_weather_app.sh

# Configurar URL fija
bash setup_api_url.sh

# Ver configuración
bash show_config.sh

# Detener servicios
bash stop_weather_app.sh

# Instalar servicios systemd (startup automático)
sudo bash install_services.sh

# Configurar Cloudflare Tunnel
bash setup_cloudflare.sh
```

---

## 📁 Estructura del Proyecto

```
weather_app/
├── backend/
│   ├── main.py              # FastAPI server
│   ├── requirements.txt      # Dependencias Python
│   └── app/
│       ├── api/            # Rutas API
│       ├── models/         # Modelos BD
│       ├── schemas/        # Esquemas Pydantic
│       └── core/           # Configuración
├── frontend/
│   ├── index.html          # HTML principal
│   └── js/
│       ├── main.js         # Lógica principal
│       └── map.js          # Mapas Leaflet
├── weather_live.py         # Simulador de estaciones
├── .env                    # Configuración (API_URL, etc)
├── setup_api_url.sh        # Script para cambiar URL
└── SETUP_COMPLETO.md       # Este documento
```

---

## 🎯 Características

✅ **Dashboard en tiempo real** - Estadísticas actualizadas  
✅ **Mapa interactivo** - Leaflet.js con marcadores  
✅ **Gráficos históricos** - Chart.js con análisis  
✅ **Gestión de estaciones** - CRUD completo  
✅ **Exportación de datos** - JSON/CSV  
✅ **Simulador integrado** - Para pruebas sin hardware  
✅ **API REST** - Fácil de integrar  
✅ **Acceso remoto** - Cloudflare Tunnel sin puertos  

---

## 🔌 API Endpoints

```bash
# Obtener todas las estaciones
GET http://localhost:8000/api/stations

# Crear estación
POST http://localhost:8000/api/stations
Body: {"id":"STATION_001","name":"Mi Estación",...}

# Enviar datos
POST http://localhost:8000/api/stations/{id}/data
Body: {"temperature":25.5,"humidity":60,...}

# Obtener datos históricos
GET http://localhost:8000/api/stations/{id}/data?hours=24
```

---

## 🌐 Acceso Remoto

### Opción 1: IP Fija de Raspberry Pi
```
http://192.168.1.100:8081
```

### Opción 2: Cloudflare Tunnel (Seguro)
```
https://tu-dominio.com
```

### Opción 3: ngrok (Temporal)
```
https://your-ngrok-url.ngrok.io
```

---

## 📊 Páginas Disponibles

1. **📊 Dashboard** - Resumen y estadísticas
2. **🗺️ Mapa** - Localización de estaciones
3. **📈 Estaciones** - Tabla de todas las estaciones
4. **📉 Analytics** - Gráficos históricos
5. **➕ Nueva Estación** - Formulario para agregar
6. **📥 Exportar** - Descargar datos en CSV/JSON
7. **⚙️ Configuración** - Ajustes de la app

---

## 🛠️ Troubleshooting

### Puerto 8000 ya en uso
```bash
lsof -i :8000
kill -9 <PID>
```

### Base de datos no responde
```bash
# Reiniciar backend
pkill -f "python main.py"
cd backend && python main.py
```

### URL incorrecta en simuladores
```bash
bash setup_api_url.sh
```

### Ver logs en vivo
```bash
sudo journalctl -u weather-app -f
```

---

## 📚 Documentación Completa

- **[SETUP_COMPLETO.md](SETUP_COMPLETO.md)** - Guía paso a paso (TODO el proceso)
- **[GUIA_URL_CONFIGURACION.md](GUIA_URL_CONFIGURACION.md)** - Configurar URL
- **[CONFIGURACION_CLOUDFLARE.md](CONFIGURACION_CLOUDFLARE.md)** - Cloudflare
- **[REFERENCIA_RAPIDA_URL.txt](REFERENCIA_RAPIDA_URL.txt)** - Comandos rápidos

---

## 🔐 Requisitos

- Python 3.8+
- pip
- Navegador moderno
- Acceso a internet (para Cloudflare)

---

## 💡 Uso Típico

### Para Pruebas (5 minutos)
```bash
bash start_weather_app.sh
# Acceder a http://localhost:8081
```

### Para Raspberry Pi (30 minutos)
```bash
bash setup_api_url.sh     # Configurar IP
sudo bash install_services.sh  # Startup automático
sudo systemctl start weather-app
```

### Para Producción (20 minutos)
```bash
bash setup_cloudflare.sh  # Instalar cloudflared
bash setup_api_url.sh     # Configurar URL Cloudflare
sudo bash install_services.sh  # Servicios systemd
```

---

## 📝 Archivos de Configuración

### .env
```
API_URL=http://localhost:8000
DEBUG=False
RETRIES=3
```

### Editar configuración
```bash
nano .env
bash show_config.sh  # Ver cambios
```

---

## 🎓 Próximos Pasos

1. 👉 **Lee [SETUP_COMPLETO.md](SETUP_COMPLETO.md)** - Elige tu opción
2. 🔧 **Sigue los pasos** en orden
3. ✅ **Verifica en http://localhost:8081**
4. 🌐 **Configura acceso remoto** si necesitas
5. 🚀 **Habilita servicios** para startup automático

---

## 📞 Soporte

- **Logs:** `sudo journalctl -u weather-app -f`
- **Config:** `bash show_config.sh`
- **Cambiar URL:** `bash setup_api_url.sh`
- **Docs:** Lee los `.md` en el proyecto

---

**Version:** 2.0 - Actualizado Febrero 2026  
**Status:** ✅ Production Ready
