# 🚀 SETUP COMPLETO - Weather App

**Este documento guía el proceso COMPLETO de instalación y configuración**

---

## 📖 Tabla de Contenidos

1. [Opción A: Inicio Rápido (LocalHost)](#opción-a-inicio-rápido-localhost)
2. [Opción B: Raspberry Pi + Red Escuela](#opción-b-raspberry-pi--red-escuela)
3. [Opción C: Cloudflare Tunnel (Acceso Global)](#opción-c-cloudflare-tunnel-acceso-global)
4. [Opción D: Docker (Más Simple)](#opción-d-docker-más-simple)

---

# OPCIÓN A: Inicio Rápido (LocalHost)

**Tiempo:** 5 minutos  
**Para:** Probar en tu computadora

## Paso 1: Requisitos Previos

```bash
# Verificar Python
python3 --version  # Debe ser 3.8+

# Verificar pip
pip3 --version
```

## Paso 2: Clonar y Entrar al Proyecto

```bash
cd /home/andy/Desktop/weather_app
```

## Paso 3: Crear Virtual Environment

```bash
python3 -m venv .venv
source .venv/bin/activate  # En Linux/Mac
# O en Windows:
# .venv\Scripts\activate
```

## Paso 4: Instalar Dependencias

```bash
pip install -r requirements.txt
```

## Paso 5: Configurar Base de Datos (Opcional)

```bash
# Backend ya tiene SQLite configurado por defecto
# Si quieres PostgreSQL, configura en backend/app/core/config.py
```

## Paso 6: Iniciar Backend

```bash
cd backend
python main.py
```

Verás:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

## Paso 7: En otra terminal, Iniciar Frontend

```bash
cd frontend
python3 -m http.server 8081
```

Verás:
```
Serving HTTP on 0.0.0.0 port 8081
```

## Paso 8: Abrir en Navegador

```
http://localhost:8081
```

## Paso 9: Iniciar Simuladores (Opcional)

```bash
cd /home/andy/Desktop/weather_app
python3 weather_live.py STATION_MADRID_001 10
```

## ✅ ¡Listo!

Tu app está corriendo en:
- **Frontend:** http://localhost:8081
- **Backend API:** http://localhost:8000/api
- **Datos:** Se envían cada 10 segundos

---

# OPCIÓN B: Raspberry Pi + Red Escuela

**Tiempo:** 30 minutos  
**Para:** Red local de la escuela (WiFi escuela)

## Paso 1: Conectar Raspberry Pi a Red Escuela

```bash
# En la Raspberry Pi
sudo raspi-config
# Navega a: Localisation → WiFi
# Elige la red "SchoolWiFi" (o tu red)
```

## Paso 2: Obtener IP de Raspberry

```bash
hostname -I
# Salida: 192.168.1.100  ← Esta es tu IP
```

## Paso 3: Ir a Directorio de la App

```bash
cd /home/andy/Desktop/weather_app
```

## Paso 4: Hacer Scripts Ejecutables

```bash
chmod +x start_weather_app.sh
chmod +x setup_api_url.sh
chmod +x show_config.sh
```

## Paso 5: Configurar URL a IP de Raspberry

```bash
bash setup_api_url.sh
# Elige: 2 (IP Raspberry)
# Ingresa: 192.168.1.100
```

## Paso 6: Instalar Servicios systemd (Startup automático)

```bash
sudo bash install_services.sh
```

## Paso 7: Iniciar Servicios

```bash
sudo systemctl start weather-app
sudo systemctl start cloudflare-tunnel  # Opcional
```

## Paso 8: Verificar que Está Corriendo

```bash
sudo systemctl status weather-app
```

## Paso 9: Acceder desde Otra Computadora en la Red

En otro dispositivo en la red de escuela:
```
http://192.168.1.100:8081
```

## Paso 10: Reinicio Automático

Cada vez que se reinicie la Raspberry:
1. ✅ Se inicia automáticamente el backend
2. ✅ Se inicia automáticamente el frontend
3. ✅ Se inician automáticamente los simuladores
4. ✅ Accesible desde cualquier dispositivo en la red

## ✅ ¡Listo!

La app está corriendo en tu red con inicio automático.

### Comandos Útiles

```bash
# Ver logs en vivo
sudo journalctl -u weather-app -f

# Detener servicios
sudo systemctl stop weather-app

# Reiniciar
sudo systemctl restart weather-app

# Ver si se inicia automáticamente
systemctl is-enabled weather-app
# Salida debe ser: enabled
```

---

# OPCIÓN C: Cloudflare Tunnel (Acceso Global)

**Tiempo:** 20 minutos  
**Para:** Acceder desde cualquier red (escuela, casa, móvil, etc.)

## Paso 1: Crear Cuenta Cloudflare Gratis

```
https://dash.cloudflare.com/sign-up
```

## Paso 2: Tener un Dominio en Cloudflare

**Opción A: Con dominio propio:**
- Compra un dominio (ej: tusitio.com)
- Agrega a Cloudflare
- Usa: https://api.tusitio.com

**Opción B: Sin dominio (PRUEBA GRATIS):**
- Cloudflare te da uno automáticamente
- Usa: https://api-abc123.trycloudflare.com

## Paso 3: Instalar cloudflared

```bash
bash setup_cloudflare.sh
```

## Paso 4: Autenticarse con Cloudflare

```bash
cloudflared login
```

Te abrirá navegador. Inicia sesión y autoriza.

## Paso 5: Crear el Túnel

```bash
cloudflared tunnel create weather-app
```

## Paso 6: Configurar la URL en weather_live.py

```bash
bash setup_api_url.sh
# Elige: 3 (Dominio Cloudflare) o 4 (Prueba)
# Ingresa: tu-dominio-cloudflare
```

## Paso 7: Crear config.yml

```bash
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: weather-app
credentials-file: ~/.cloudflared/weather-app.json

ingress:
  - hostname: api.tu-dominio.com
    service: http://localhost:8000
  - hostname: weather.tu-dominio.com
    service: http://localhost:8081
  - service: http_status:404
EOF
```

Reemplaza `tu-dominio.com` con tu dominio.

## Paso 8: Instalar Servicio Cloudflare

```bash
sudo cp /home/andy/Desktop/weather_app/cloudflare-tunnel.service \
       /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable cloudflare-tunnel
sudo systemctl start cloudflare-tunnel
```

## Paso 9: Iniciar Todo

```bash
sudo systemctl start weather-app
sudo systemctl start cloudflare-tunnel
```

## Paso 10: Acceder Globalmente

Desde cualquier red:
```
https://weather.tu-dominio.com
https://api.tu-dominio.com/api
```

O si usas dominio de prueba:
```
https://weather-abc123.trycloudflare.com
https://api-abc123.trycloudflare.com/api
```

## ✅ ¡Listo!

Tu app está expuesta al internet de forma segura sin abrir puertos.

### Comandos Útiles

```bash
# Ver estado del túnel
sudo systemctl status cloudflare-tunnel

# Ver logs
sudo journalctl -u cloudflare-tunnel -f

# Reiniciar
sudo systemctl restart cloudflare-tunnel
```

---

# OPCIÓN D: Docker (Más Simple)

**Tiempo:** 10 minutos  
**Para:** Evitar problemas de dependencias

## Paso 1: Instalar Docker

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install docker.io docker-compose

# Verificar
docker --version
docker-compose --version
```

## Paso 2: Construir Imagen

```bash
cd /home/andy/Desktop/weather_app
docker-compose build
```

## Paso 3: Iniciar Servicios

```bash
docker-compose up -d
```

## Paso 4: Verificar que Está Corriendo

```bash
docker-compose ps
```

Salida:
```
CONTAINER ID   IMAGE                    STATUS
abc123         weather_backend          Up 2 minutes
def456         weather_frontend         Up 2 minutes
ghi789         weather_db               Up 2 minutes
```

## Paso 5: Acceder

```
http://localhost:8081
```

## ✅ ¡Listo!

Todo está en contenedores Docker.

### Comandos Útiles

```bash
# Ver logs
docker-compose logs -f

# Detener
docker-compose down

# Reiniciar
docker-compose restart

# Actualizar código y reiniciar
docker-compose down && docker-compose up -d --build
```

---

# 📋 TABLA DE COMPARACIÓN

| Característica | Opción A (Local) | Opción B (Raspberry) | Opción C (Cloudflare) | Opción D (Docker) |
|---|---|---|---|---|
| Tiempo Setup | 5 min | 30 min | 20 min | 10 min |
| Acceso Local | ✅ | ✅ | ✅ | ✅ |
| Acceso Red | ❌ | ✅ | ✅ | ✅ |
| Acceso Global | ❌ | ❌ | ✅ | ❌ |
| Inicio Automático | ❌ | ✅ | ✅ | ❌ |
| Complejidad | Baja | Media | Media | Baja |
| Recomendado | Pruebas | Escuela | Producción | Desarrollo |

---

# 🔧 CONFIGURACIÓN POSTERIOR

Después de instalar, puedes configurar:

## Cambiar URL de API

```bash
bash setup_api_url.sh
# Elige tu opción (1-5)
```

## Ver Configuración

```bash
bash show_config.sh
```

## Editar Archivo .env

```bash
nano .env
```

Parámetros disponibles:
- `API_URL` - URL de la API
- `DEBUG` - Mostrar detalles (True/False)
- `HTTP_TIMEOUT` - Timeout de conexión
- `RETRIES` - Reintentos si falla

---

# 📚 DOCUMENTACIÓN ADICIONAL

- [GUIA_URL_CONFIGURACION.md](GUIA_URL_CONFIGURACION.md) - Cambiar URL de API
- [CONFIGURACION_CLOUDFLARE.md](CONFIGURACION_CLOUDFLARE.md) - Cloudflare Tunnel
- [INSTALACION_RAPIDA.txt](INSTALACION_RAPIDA.txt) - Referencia rápida

---

# ❓ TROUBLESHOOTING

## "Error: Cannot connect to API"

```bash
# 1. Verificar que backend está corriendo
curl http://localhost:8000/api

# 2. Ver estado del servicio
sudo systemctl status weather-app

# 3. Ver logs
sudo journalctl -u weather-app -n 50
```

## "Error: Port already in use"

```bash
# Encontrar proceso usando puerto 8000
lsof -i :8000

# Matar proceso
kill -9 <PID>
```

## "No se ve el cambio de URL"

```bash
# 1. Verificar .env
cat .env | grep API_URL

# 2. Reiniciar simuladores
pkill -f weather_live.py

# 3. Reiniciar servicios
sudo systemctl restart weather-app
```

---

# 🎯 PRÓXIMOS PASOS

1. **Elige una opción** según tus necesidades
2. **Sigue los pasos** en orden
3. **Verifica que funciona** con `http://localhost:8081`
4. **Configura URL** si necesitas acceso remoto
5. **Habilita servicios** para inicio automático

---

# 📞 SOPORTE

- Ver logs: `sudo journalctl -u weather-app -f`
- Config: `bash show_config.sh`
- Cambiar URL: `bash setup_api_url.sh`
- Documentación: Lee los archivos `.md` en el proyecto

**Versión:** 2.0 (Actualizado Feb 2026)
