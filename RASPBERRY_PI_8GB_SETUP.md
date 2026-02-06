# 🍓 Configuración Optimizada para Raspberry Pi 8GB

Este documento detalla cómo optimizar y ejecutar el Weather App en una Raspberry Pi 4 con 8GB de RAM.

---

## 📋 Requisitos Previos

- **Hardware:** Raspberry Pi 4 con 8GB RAM
- **OS:** Raspberry Pi OS (64-bit recomendado)
- **SD Card:** Mínimo 32GB de capacidad
- **Conexión:** Ethernet o WiFi estable

---

## 🚀 Instalación Rápida (5 minutos)

### 1. Preparar Raspberry Pi

```bash
# Actualizar el sistema
sudo apt-get update && sudo apt-get upgrade -y

# Instalar dependencias básicas
sudo apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    libssl-dev \
    libffi-dev

# Expandir filesystem (recomendado)
sudo raspi-config
# → Advanced Options → Expand Filesystem
```

### 2. Instalar Docker (recomendado para Raspberry Pi)

```bash
# Script oficial de Docker para ARM
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario a grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Instalar Docker Compose
sudo apt-get install -y docker-compose

# Verificar instalación
docker --version
docker-compose --version
```

### 3. Clonar y Configurar Proyecto

```bash
cd /home/pi  # O tu directorio preferido
git clone https://github.com/devandress/Estacion-metereologica.git weather_app
cd weather_app

# Crear archivo .env con configuración Raspberry Pi
cat > .env << 'EOF'
# Base de datos
DATABASE_URL=postgresql://weather_user:weather_secure_password@postgres:5432/weather_db

# Backend
API_URL=http://localhost:8000
HOST=0.0.0.0
PORT=8000

# Frontend
FRONTEND_URL=http://localhost:80

# Cloudflare/Duck DNS
CLOUDFLARE_API_TOKEN=tu-token-aqui
DUCKDNS_TOKEN=tu-token-aqui
DUCKDNS_DOMAIN=estacion-temperatura

# Logs
LOG_LEVEL=info
EOF

chmod 600 .env
```

### 4. Iniciar Docker Compose

```bash
# Construir imágenes (puede tardar 10-15 min en RPi)
docker-compose build

# Iniciar servicios
docker-compose up -d

# Verificar estado
docker-compose ps
```

---

## 🔧 Optimizaciones Aplicadas

### 1. Limites de Memoria

| Servicio | Límite | Reserva |
|----------|--------|---------|
| PostgreSQL | 1GB | 512MB |
| Backend | 512MB | 256MB |
| Nginx | 128MB | 64MB |
| **Total** | **1.6GB** | **832MB** |

✅ Deja 6.4GB libres para el sistema y otras aplicaciones

### 2. Configuraciones de Base de Datos

```sql
-- PostgreSQL optimizado para RPi
shared_buffers = 256MB      -- 25% de 1GB
effective_cache_size = 512MB
work_mem = 16MB
```

### 3. Workers de Gunicorn

```bash
# Configuración:
- 2 workers (procesos)
- 2 threads por worker
- Total: 4 hilos de ejecución concurrentes

# Ventaja:
- Usa poco CPU (RPi 4 tiene 4 cores)
- Bajo consumo de RAM (~50MB por worker)
- Manejo eficiente de múltiples requests
```

### 4. JSON Compilado

Se agregó `orjson` para:
- Serialización JSON 3x más rápida
- Menos consumo de CPU
- Menos uso de memoria

### 5. Imágenes Docker Ligeras

- `python:3.11-slim` - 160MB vs 900MB de versión completa
- `postgres:15-alpine` - 200MB vs 350MB estándar
- `nginx:alpine` - 40MB vs 150MB estándar

---

## 📊 Monitoreo de Recursos

### Ver consumo en tiempo real

```bash
# Método 1: docker stats
docker stats

# Método 2: htop (instalar si no está)
sudo apt-get install htop
htop

# Método 3: free memory
free -h
```

### Logs de aplicación

```bash
# Logs backend
docker-compose logs -f backend

# Logs postgres
docker-compose logs -f postgres

# Logs nginx
docker-compose logs -f nginx
```

---

## 🔌 Configuración de Servicios (Opcional)

### Arrancar automáticamente con Raspberry Pi

```bash
# Crear servicio systemd
sudo nano /etc/systemd/system/weather-app.service
```

```ini
[Unit]
Description=Weather App with Docker
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/weather_app
ExecStart=/usr/bin/docker-compose up
ExecStop=/usr/bin/docker-compose down
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

```bash
# Habilitar y activar
sudo systemctl daemon-reload
sudo systemctl enable weather-app.service
sudo systemctl start weather-app.service
sudo systemctl status weather-app.service
```

---

## 🔄 Actualizar Proyecto

```bash
# Detener servicios
docker-compose down

# Actualizar código
git pull origin main

# Reconstruir imágenes
docker-compose build

# Reiniciar
docker-compose up -d

# Ver estado
docker-compose ps
```

---

## ⚡ Rendimiento Esperado

### Velocidad de Respuesta
- **API local:** 50-100ms
- **API remota (Cloudflare):** 100-300ms

### Uso de Recursos
- **RAM en reposo:** ~400-500MB
- **RAM con carga:** ~1.2-1.5GB
- **CPU en reposo:** 5-10%
- **CPU con carga:** 30-50%

### Capacidad
- **Requests concurrentes:** 20-50
- **Almacenamiento DB:** 2GB por año (aprox)

---

## 🛠️ Solución de Problemas

### El API no responde

```bash
# Reiniciar backend
docker-compose restart backend

# Ver logs
docker-compose logs backend --tail=50
```

### Base de datos lenta

```bash
# Reiniciar postgres
docker-compose restart postgres

# Verificar espacio en disco
df -h

# Si < 500MB libre, limpiar:
docker system prune -a
```

### Memoria llena

```bash
# Ver consumo actual
free -h

# Reiniciar servicios
docker-compose restart

# Limpiar imágenes no usadas
docker image prune -a
```

### Puerto 8000 ya en uso

```bash
# Encontrar qué usa el puerto
sudo lsof -i :8000

# Usar puerto diferente en docker-compose.yml
# Cambiar "8000:8000" a "8001:8000"
```

---

## 🔐 Seguridad

### ✅ Mejores Prácticas Aplicadas

1. **Usuario no-root en Docker**
   ```dockerfile
   RUN useradd -m -u 1000 appuser
   USER appuser
   ```

2. **Contraseña segura en .env**
   ```bash
   chmod 600 .env  # Solo lectura para usuario
   ```

3. **Health checks automáticos**
   ```bash
   docker-compose ps  # Muestra estado de salud
   ```

4. **Reinicio automático en caso de error**
   ```yaml
   restart: unless-stopped
   ```

### 🔑 Cambiar contraseña PostgreSQL

```bash
# 1. Acceder a postgres
docker-compose exec postgres psql -U weather_user -d weather_db

# 2. Cambiar contraseña
ALTER USER weather_user WITH PASSWORD 'nueva_contraseña';
\q

# 3. Actualizar .env y docker-compose
nano .env
# Cambiar DATABASE_URL

# 4. Reiniciar
docker-compose down
docker-compose up -d
```

---

## 📈 Escalado Futuro

Si necesitas más rendimiento en el futuro:

### 1. Aumentar Workers (si tienes más de 8GB)

```bash
# En Dockerfile.backend, cambiar:
CMD ["gunicorn", "-w", "4", ...  # De 2 a 4 workers
```

### 2. Agregar Redis para Cache

```yaml
# En docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
```

### 3. Usar Base de Datos Remota

```bash
# Usar PostgreSQL cloud en lugar de local
# Actualizar DATABASE_URL en .env
DATABASE_URL=postgresql://user:pass@cloud-db.com/weather_db
```

---

## 📞 Soporte y Documentación

- **Guía ESP32:** [README_ESP32_SETUP.md](README_ESP32_SETUP.md)
- **Guía Cloudflare:** [ESP32_CLOUDFLARE_DUCKDNS.md](ESP32_CLOUDFLARE_DUCKDNS.md)
- **Troubleshooting:** [VERIFICACION_ESP32.md](VERIFICACION_ESP32.md)

---

## ✅ Checklist de Instalación

```
□ Raspberry Pi OS actualizado
□ Docker e Docker Compose instalados
□ Proyecto clonado en /home/pi/
□ Archivo .env configurado
□ docker-compose build ejecutado
□ docker-compose up -d iniciado
□ docker-compose ps muestra todos los servicios running
□ http://localhost:80 accesible desde navegador
□ http://localhost:8000/api/stations/ retorna JSON
□ Servicio systemd configurado (opcional)
□ Monitoreo con docker stats funcionando
```

---

**Status:** ✅ Optimizado para Raspberry Pi 4 8GB  
**Versión:** 1.0  
**Fecha:** 2026
