# 🔧 Guía: Configurar URL Fija para la API

## Problema
Por defecto, los simuladores envían datos a `http://localhost:8000`. Necesitas cambiar esto a:
- Tu IP de Raspberry Pi (en la red de la escuela)
- Un dominio Cloudflare
- Cualquier otra URL

## Solución

Ahora todo se configura desde el archivo **`.env`**

---

## 📝 Método 1: Script Interactivo (Recomendado)

```bash
bash setup_api_url.sh
```

Te mostrará opciones:
```
Opciones de URL:

  1 - Local (http://localhost:8000)
  2 - IP Raspberry (ej: http://192.168.1.100:8000)
  3 - Dominio Cloudflare con SSL
  4 - Dominio Cloudflare (prueba)
  5 - Ingresada manualmente
```

Elige una opción y listo.

---

## 📝 Método 2: Editar .env Manualmente

Abre el archivo:
```bash
nano .env
```

Busca la línea:
```
API_URL=http://localhost:8000
```

Reemplázala con tu URL:
```
# Ejemplos:
API_URL=http://192.168.1.100:8000
API_URL=https://api.tu-dominio.com
API_URL=https://api-abc123.trycloudflare.com
```

Guarda con: `Ctrl+O`, `Enter`, `Ctrl+X`

---

## 🎯 Ejemplos de Configuración

### Opción 1: Local (Para pruebas)
```
API_URL=http://localhost:8000
```

### Opción 2: IP de Raspberry en la red
```bash
# Primero obtén la IP de la Raspberry
hostname -I

# Luego usa:
API_URL=http://192.168.1.100:8000
```

### Opción 3: Cloudflare Tunnel (Recomendado)
```bash
# Si usas Cloudflare Tunnel con tu dominio:
API_URL=https://api.tu-dominio.com

# O si usas el dominio de prueba Cloudflare:
API_URL=https://api-abc123.trycloudflare.com
```

### Opción 4: ngrok
```bash
# Si usas ngrok:
API_URL=https://ngrok-url-que-te-da.ngrok.io
```

---

## ✅ Verificar Configuración

Ver la configuración actual:
```bash
bash show_config.sh
```

Salida:
```
╔═════════════════════════════════════════╗
║   Configuración Actual - Weather App     ║
╚═════════════════════════════════════════╝

API:
  URL: https://api.tu-dominio.com

Simulador:
  Intervalo: 12 segundos
  Debug: False

Conexión:
  Timeout: 5 segundos
  Reintentos: 3
  Espera: 2 segundos
```

---

## 🚀 Usar la Nueva URL

Una vez configurada la URL, inicia los simuladores:

```bash
# Opción 1: Iniciar todo con el script
bash start_weather_app.sh

# Opción 2: Iniciar simulador individual
python3 weather_live.py STATION_MADRID_001 10

# Opción 3: Iniciar todos los simuladores
python3 weather_live.py
```

---

## 🔍 Solución de Problemas

### "Error: No puede conectar a la URL"

1. Verifica que la URL sea correcta:
```bash
bash show_config.sh
```

2. Comprueba que el backend está corriendo:
```bash
curl -I http://tu-url:8000/api
```

3. Si recibe error 401/403, revisa Cloudflare Tunnel.

### "El archivo .env no se lee"

El script automáticamente crea `.env` si no existe. Si quieres recrearlo:

```bash
cat > .env << 'EOF'
API_URL=http://localhost:8000
DEBUG=False
DEFAULT_INTERVAL=12
HTTP_TIMEOUT=5
RETRIES=3
RETRY_DELAY=2
EOF
```

### "Cambié la URL pero sigue usando la vieja"

Reinicia el simulador:
```bash
pkill -f weather_live.py
python3 weather_live.py STATION_MADRID_001 10
```

---

## 📋 Parámetros Disponibles en .env

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `API_URL` | `http://localhost:8000` | URL base de la API |
| `DEBUG` | `False/True` | Mostrar información detallada |
| `DEFAULT_INTERVAL` | `12` | Intervalo por defecto (segundos) |
| `HTTP_TIMEOUT` | `5` | Timeout de conexión (segundos) |
| `RETRIES` | `3` | Intentos si falla conexión |
| `RETRY_DELAY` | `2` | Espera entre reintentos (segundos) |

---

## 🎓 Ejemplo: Cambiar URL para Cloudflare

```bash
# 1. Configurar Cloudflare (si aún no lo hiciste)
bash setup_cloudflare.sh
cloudflared login
cloudflared tunnel create weather-app

# 2. Cambiar la URL en weather_live.py
bash setup_api_url.sh
# Elige opción 4, ingresa: api-abc123.trycloudflare.com

# 3. Iniciar Cloudflare Tunnel en una terminal
cloudflared tunnel run weather-app

# 4. En otra terminal, iniciar simuladores
bash start_weather_app.sh

# 5. Acceder desde cualquier red
# https://weather-abc123.trycloudflare.com
```

---

¿Necesitas ayuda adicional? Revisa el archivo `.env` o ejecuta:
```bash
bash show_config.sh
```
