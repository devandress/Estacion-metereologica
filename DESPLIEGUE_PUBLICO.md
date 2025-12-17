# 🚀 Despliegue en Servidor Público

## 📋 Resumen Rápido

```
1. Desplegar en servidor (Heroku, AWS, DigitalOcean, etc)
   ↓
2. Obtener URL pública (ej: https://miappclima.com)
   ↓
3. Cambiar 1 línea en el ESP32:
   const char* API_HOST = "miappclima.com";
   ↓
4. Cargar código
   ↓
5. ¡Listo! Los datos se envían a internet
```

---

## 🌐 Opción 1: Heroku (Más Fácil)

### Paso 1: Crear cuenta en Heroku
```
1. Ir a https://www.heroku.com
2. Sign up
3. Verificar email
```

### Paso 2: Conectar GitHub
```
1. Dashboard → Connected apps
2. Connect to GitHub
3. Seleccionar repositorio
```

### Paso 3: Deploy automático
```
1. Ir a Deploy tab
2. Enable automatic deploys from main
3. Click "Deploy Branch"
4. Esperar ~2 minutos
```

### Paso 4: Obtener URL
```
Heroku genera automáticamente:
https://tu-app-nombre-12345.herokuapp.com

Ej: https://weather-station-andy-001.herokuapp.com
```

### Paso 5: Actualizar ESP32

**Archivo:** `WeatherStation_ESP32.ino`

```cpp
// ANTES:
const char* API_HOST = "192.168.1.100";    // IP local
const int API_PORT = 8000;                  // Puerto local
const char* STATION_ID = "ESP32_001";

// DESPUÉS:
const char* API_HOST = "weather-station-andy-001.herokuapp.com";  // URL pública
const int API_PORT = 443;                   // Puerto HTTPS
const char* STATION_ID = "ESP32_001";
```

### Paso 6: Modificar el código para HTTPS

```cpp
// Cambiar esto:
HTTPClient http;
http.begin(url);

// A esto:
HTTPClient http;
http.setInsecure();  // Para certificados SSL autofirmados
http.begin(url);
```

### Paso 7: Compilar y cargar
```
1. Arduino IDE → Sketch → Upload
2. Monitor Serial mostrará:
   ✅ WiFi conectado
   ✅ Datos enviados
```

---

## 🌐 Opción 2: DigitalOcean (Recomendado)

### Paso 1: Crear Droplet (VPS)
```
1. https://www.digitalocean.com
2. Create → Droplet
3. Seleccionar:
   - Ubuntu 22.04
   - 1GB RAM ($4/mes)
   - Frankfurt (o tu región)
4. Create Droplet
```

### Paso 2: Obtener IP del servidor
```
Aparecerá en Dashboard:
123.45.67.89

Esta es tu IP pública
```

### Paso 3: Conectar por SSH
```bash
ssh root@123.45.67.89

# Primera vez pedirá contraseña (enviada por email)
```

### Paso 4: Instalar dependencias
```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Python, PostgreSQL, etc
apt install -y python3 python3-pip postgresql postgresql-contrib nginx

# Instalar dependencias Python
cd /home && git clone https://github.com/tuusuario/weather_app.git
cd weather_app/backend
pip3 install -r requirements.txt
```

### Paso 5: Configurar base de datos
```bash
sudo -u postgres psql << EOF
CREATE DATABASE weather_db;
CREATE USER weather_user WITH PASSWORD 'tu_contraseña_segura';
ALTER ROLE weather_user SET client_encoding TO 'utf8';
ALTER ROLE weather_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE weather_user SET default_transaction_deferrable TO on;
ALTER ROLE weather_user SET default_transaction_read_uncommitted TO off;
ALTER ROLE weather_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE weather_db TO weather_user;
EOF
```

### Paso 6: Configurar Nginx
```bash
cat > /etc/nginx/sites-available/weather_app << 'EOF'
server {
    listen 80;
    server_name 123.45.67.89;  # Tu IP o dominio
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /frontend {
        alias /home/weather_app/frontend;
    }
}
EOF

ln -s /etc/nginx/sites-available/weather_app /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Paso 7: Iniciar backend con Gunicorn
```bash
cd /home/weather_app/backend
gunicorn -w 2 -b 0.0.0.0:8000 main:app &
```

### Paso 8: Obtener URL
```
Tu URL pública:
http://123.45.67.89

O con dominio:
http://tudominio.com
```

### Paso 9: Actualizar ESP32
```cpp
const char* API_HOST = "123.45.67.89";  // Tu IP pública
const int API_PORT = 80;                 // Puerto HTTP
```

---

## 🔒 Opción 3: Con Dominio Propio

### Paso 1: Comprar dominio
```
GoDaddy, Namecheap, etc:
- tudominio.com (~$10/año)
```

### Paso 2: Apuntar a tu servidor
```
En tu registrador:
- A Record: 123.45.67.89
- TTL: 3600
- Esperar 15-30 minutos
```

### Paso 3: Configurar SSL (Let's Encrypt)
```bash
apt install -y certbot python3-certbot-nginx

certbot certonly --nginx -d tudominio.com

# Seguir las instrucciones
```

### Paso 4: Actualizar Nginx con HTTPS
```bash
cat > /etc/nginx/sites-available/weather_app << 'EOF'
server {
    listen 443 ssl http2;
    server_name tudominio.com;
    
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
    }
}

server {
    listen 80;
    server_name tudominio.com;
    return 301 https://$server_name$request_uri;
}
EOF

systemctl restart nginx
```

### Paso 5: ESP32 con HTTPS
```cpp
const char* API_HOST = "tudominio.com";
const int API_PORT = 443;

// En el código:
HTTPClient http;
http.setInsecure();  // Aceptar certificado SSL
http.begin("https://tudominio.com/api/stations/ESP32_001/data");
```

---

## 📊 Comparación de Opciones

| Opción | Costo | Dificultad | Ventajas | Desventajas |
|--------|-------|-----------|----------|------------|
| **Heroku** | Gratis/7$ | Muy Fácil | Automático, sin admin | Servidor compartido, dormida gratis |
| **DigitalOcean** | $4/mes | Media | Control total, rápido | Requiere configuración |
| **AWS** | Variable | Difícil | Escalable, profesional | Caro, complejo |
| **Raspberry Pi** | Solo hardware | Fácil | Control total, barato | Conexión local, debe estar on |

---

## 🔧 Cambios Mínimos en ESP32

### Caso 1: Servidor Local (Actual)
```cpp
const char* API_HOST = "192.168.1.100";
const int API_PORT = 8000;
const char* SCHEMA = "http";

String url = String(SCHEMA) + "://" + API_HOST + ":" + API_PORT 
           + "/api/stations/" + STATION_ID + "/data";
// http://192.168.1.100:8000/api/stations/ESP32_001/data
```

### Caso 2: Servidor Público (HTTP)
```cpp
const char* API_HOST = "123.45.67.89";
const int API_PORT = 80;
const char* SCHEMA = "http";

String url = String(SCHEMA) + "://" + API_HOST + ":" + API_PORT 
           + "/api/stations/" + STATION_ID + "/data";
// http://123.45.67.89/api/stations/ESP32_001/data
```

### Caso 3: Con Dominio (HTTPS)
```cpp
const char* API_HOST = "tudominio.com";
const int API_PORT = 443;
const char* SCHEMA = "https";

HTTPClient http;
http.setInsecure();
String url = String(SCHEMA) + "://" + API_HOST 
           + "/api/stations/" + STATION_ID + "/data";
// https://tudominio.com/api/stations/ESP32_001/data
```

---

## 📋 Checklist de Despliegue

### Antes de desplegar:
- [ ] Código funcionando en local
- [ ] Backend en puerto 8000
- [ ] Frontend en puerto 8080
- [ ] BD PostgreSQL OK
- [ ] Todos los datos se almacenan

### Despliegue:
- [ ] Servidor contratado (Heroku/DigitalOcean/etc)
- [ ] Código subido a servidor
- [ ] BD creada en servidor
- [ ] Nginx/gunicorn configurado
- [ ] URL pública obtenida

### Post-despliegue:
- [ ] Cambiar API_HOST en ESP32
- [ ] Cargar código en ESP32
- [ ] Verificar en Monitor Serial
- [ ] Ver datos en dashboard público
- [ ] Backup configurado

---

## 🌍 Ejemplos Reales

### Ejemplo 1: Casa en Madrid
```
URL: http://192.168.1.100:8080         (Local, solo en casa)
URL: http://123.45.67.89                (Desde internet)
URL: https://miestacion.com             (Con dominio bonito)

ESP32 usa: https://miestacion.com
```

### Ejemplo 2: Invernadero con monitoreo
```
Invernadero A: ESP32_INVERNADERO_A
Invernadero B: ESP32_INVERNADERO_B
Invernadero C: ESP32_INVERNADERO_C

Todos envían a: https://clima-invernadero.com

Dashboard muestra las 3 estaciones en tiempo real
```

### Ejemplo 3: Red de ciudades
```
Madrid:    ESP32_MADRID_001 → https://clima.ejemplo.com
Barcelona: ESP32_BARCELONA_001 → https://clima.ejemplo.com
Valencia:  ESP32_VALENCIA_001 → https://clima.ejemplo.com

Mapa mundial mostrando todas las ciudades
```

---

## 🔐 Seguridad en Servidor Público

### Recomendaciones:

1. **Usar HTTPS siempre**
   ```
   ✅ https://tudominio.com
   ❌ http://tudominio.com
   ```

2. **Agregar API Key**
   ```cpp
   http.addHeader("Authorization", "Bearer tu_api_key_secreto");
   ```

3. **Rate limiting**
   ```
   Máx 1 request cada 5 minutos por estación
   ```

4. **CORS restringido**
   ```
   Solo permitir desde tu dominio
   ```

5. **Firewall**
   ```
   Bloquear puertos innecesarios
   Permitir solo 80, 443
   ```

---

## 📱 Flujo Final

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. Comprar servidor ($4-10/mes o gratis en Heroku)       │
│     ↓                                                       │
│  2. Desplegar código (git push o SCP)                      │
│     ↓                                                       │
│  3. Obtener URL pública (https://tudominio.com)            │
│     ↓                                                       │
│  4. Cambiar 1 línea ESP32:                                 │
│     const char* API_HOST = "tudominio.com";                │
│     ↓                                                       │
│  5. Cargar código en ESP32                                 │
│     ↓                                                       │
│  6. ¡LISTO! Accede desde cualquier navegador:             │
│     https://tudominio.com                                  │
│     ↓                                                       │
│  7. Ve tus datos en tiempo real desde cualquier lugar      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 Ventajas de Servidor Público

```
✅ Acceso desde cualquier lugar (casa, oficina, móvil)
✅ Múltiples estaciones en diferentes ubicaciones
✅ Datos disponibles 24/7
✅ Backup automático
✅ HTTPS seguro
✅ Dominio profesional (opcional)
✅ Escalable (más estaciones fácilmente)
✅ Compartir datos con otros usuarios
```

---

## ⚡ Siguientes Pasos

1. **Hoy:** Funciona en local (192.168.1.X)
2. **Mañana:** Despliega en Heroku (gratis 5 minutos)
3. **Próxima semana:** Compra dominio ($10)
4. **Próximo mes:** ¡Múltiples estaciones en línea!

---

**¡Es así de simple! URL pública en ESP32 y listo. 🚀**

