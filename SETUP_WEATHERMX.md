# 🌐 Configuración Rápida - weathermx

## 📋 Tu Información

```
🔑 Token Duck DNS:    a64240d0-87b0-4173-a0ca-26b2117c7061
🌐 Dominio:           weathermx.duckdns.org
📡 IP Pública:        177.236.54.241
🏠 Estación:          ESP32_WEATHERMX_001
```

---

## ⚡ 3 Pasos para Funcionar

### 1️⃣ Verifica tu setup

```bash
cd /home/andy/Desktop/weather_app
bash esp32_simulator.sh
```

### 2️⃣ Configura el ESP32

**Archivo:** `ESP32_CloudflareDuckDNS.ino`

**Líneas 24-25:**
```cpp
const char* WIFI_SSID = "Tu_WiFi_Escuela";
const char* WIFI_PASS = "Tu_Password";
```

**Líneas 300-320:**
- Conecta sensores DHT22, BMP180, etc.

### 3️⃣ Sube a Arduino IDE

1. Abre Arduino IDE
2. Archivo → Abrir → `ESP32_CloudflareDuckDNS.ino`
3. Herramientas → Puerto → Selecciona tu ESP32
4. Click en Upload ⬆️

---

## 🌐 URLs Importantes

| Servicio | URL |
|----------|-----|
| Dashboard Local | http://localhost:8081 |
| API Local | http://localhost:8000 |
| **API Externa** | **https://api.weathermx.duckdns.org** |
| Duck DNS | weathermx.duckdns.org |

---

## 📊 Verifica que Funciona

### Serial Monitor (115200 baud)

Deberías ver cada 30 segundos:
```
HTTP Code: 201
✅ ÉXITO - Datos enviados a webapp
```

### Dashboard

```bash
# Abre tu navegador en:
http://localhost:8081
```

Deberías ver tu estación `ESP32_WEATHERMX_001` con:
- ✓ Temperatura
- ✓ Humedad
- ✓ Presión
- ✓ Timestamp

---

## 🔄 Actualización automática Duck DNS

Para mantener tu dominio actualizado (si tu IP cambia):

```bash
# Iniciar en background
nohup /home/andy/Desktop/weather_app/update-duckdns.sh > /tmp/duckdns.log &

# Ver logs
tail -f /tmp/duckdns.log
```

---

## ❌ Si algo falla

1. **Ejecuta:** `bash test-esp32-setup-local.sh`
2. **Lee:** `VERIFICACION_ESP32.md`
3. **Revisa:** `ESP32_CLOUDFLARE_DUCKDNS.md`

---

## 🔐 Seguridad

✅ **Protecciones:**
- ✓ HTTPS (Cloudflare)
- ✓ Token privado
- ✓ No expones puertos locales
- ✓ DNS dinámico seguro

---

**Estado:** ✅ Listo para Producción  
**Versión:** 1.0
