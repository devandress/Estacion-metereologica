# 🔍 Verificación paso a paso - ESP32 + Cloudflare + Duck DNS

## ✅ Checklist de Verificación

### Fase 1: Duck DNS

```bash
# 1. Verificar que Duck DNS tiene tu IP correcta
nslookup estacion-temperatura.duckdns.org

# Debe mostrar algo como:
# Server:         8.8.8.8
# Address:        8.8.8.8#53
# Non-authoritative answer:
# Name:   estacion-temperatura.duckdns.org
# Address: 201.45.89.123  ← TU IP ESCUELA
```

**✅ Si ves tu IP:** Duck DNS funciona  
**❌ Si ves error:** Duck DNS no actualizado

---

### Fase 2: Cloudflare Tunnel

```bash
# 1. Verificar que Cloudflare tunnel está corriendo
ps aux | grep cloudflared

# Debe mostrar:
# pi    1234  0.0  0.5 ... cloudflared tunnel run weather-station

# 2. Si no está corriendo:
sudo systemctl start cloudflared.service
sudo systemctl status cloudflared.service

# 3. Verificar que DNS CNAME existe
nslookup api.estacion-temperatura.duckdns.org

# Debe retornar algo (no error)
```

**✅ Si ves datos:** Cloudflare funciona  
**❌ Si ves error:** Revisar systemd service

---

### Fase 3: Backend Local

```bash
# 1. Verificar que backend está corriendo en puerto 8000
lsof -i :8000

# Debe mostrar:
# python  5678  user  3u  IPv4  123456  0t0  TCP  localhost:8000 (LISTEN)

# 2. Si no está:
cd /home/andy/Desktop/weather_app/backend
python main.py

# 3. Probar conexión local
curl -v http://localhost:8000/api/stations/

# Debe retornar JSON (HTTP 200)
```

**✅ Si ves JSON:** Backend funciona  
**❌ Si ves error:** Revisar backend

---

### Fase 4: Probar HTTPS desde Cloudflare

```bash
# Desde cualquier máquina en internet:
curl -v https://api.estacion-temperatura.duckdns.org/api/stations/

# Debe mostrar HTTP/2 200 con JSON
```

**✅ Si funciona:** Cloudflare conecta correctamente  
**❌ Si da error 403:** Revisar SSL en Cloudflare dashboard

---

### Fase 5: Verificar ESP32

```bash
# En Arduino IDE → Tools → Serial Monitor

# Debe mostrar CADA 30 SEGUNDOS:

═════════════════════════════════════════
📤 Hora de enviar datos
═════════════════════════════════════════

🔵 Enviando datos...
URL: https://api.estacion-temperatura.duckdns.org/api/stations/ESP32_ESCUELA_001/data
Payload: {"temperature":22.5,"humidity":65.0,"pressure":1013.25,...}
HTTP Code: 201
Response: {"id":"esp32-001","station":"ESP32_ESCUELA_001",...}
✅ ÉXITO - Datos enviados a webapp

📊 Resumen de datos enviados:
   🌡️  Temperatura: 22.5°C
   💧 Humedad: 65.0%
   💨 Viento: 3.5 m/s
```

**✅ Si ves "ÉXITO":** ESP32 está enviando correctamente  
**❌ Si ves error:** Ver tabla de troubleshooting abajo

---

## 🔧 Troubleshooting Rápido

### Problema: "Error resolving hostname"

```
Error: gethostbyname() failed

Causa: DNS no resuelve Duck DNS
```

**Soluciones:**
```bash
# 1. Verificar que Duck DNS está actualizado
curl "https://www.duckdns.org/update?domains=estacion-temperatura&token=TU-TOKEN&verbose=true"

# 2. Reiniciar DNS en ESP32
# (Agregar en código ESP32)
WiFi.disconnect();
delay(1000);
WiFi.reconnect();

# 3. Usar DNS público en ESP32
// En setup(), después de WiFi.begin():
WiFi.setDNS(8, 8, 8, 8);  // Google DNS
```

---

### Problema: "HTTP Code: 403"

```
Response: {"detail":"Forbidden"}

Causa: Certificado SSL inválido o Cloudflare bloqueando
```

**Soluciones:**
```bash
# 1. En Cloudflare Dashboard → SSL/TLS → Origin Server
# Descargar certificado y subirlo

# 2. En ESP32, deshabilitar validación SSL (no recomendado):
client.setInsecure();  // ← Ya está en el código

# 3. Verificar que Cloudflare apunta a localhost:8000
curl http://localhost:8000/api/stations/
# Debe funcionar localmente
```

---

### Problema: "Connection timed out"

```
Error: Connection timed out

Causa: Firewall escuela bloqueando HTTPS
```

**Soluciones:**
```bash
# 1. Pedir al IT que abra:
# - Puerto 443 (HTTPS) saliente
# - Dominio: estacion-temperatura.duckdns.org
# - IPs Cloudflare: 103.21.244.0/22

# 2. Alternativa: Usar HTTP (menos seguro)
const char* API_URL = "http://api.estacion-temperatura.duckdns.org";
// (pero requiere Cloudflare en modo HTTP)

# 3. Cambiar puerto:
# Configurar Cloudflare para puerto 8080
# const char* API_URL = "https://api.estacion-temperatura.duckdns.org:8080";
```

---

### Problema: "Timeout while reading response"

```
Error: Timeout while reading response

Causa: Backend muy lento o conexión intermitente
```

**Soluciones:**
```cpp
// En ESP32_CloudflareDuckDNS.ino, aumentar timeout:

https.setConnectTimeout(5000);  // 5 segundos
https.setTimeout(10000);        // 10 segundos lectura
```

---

### Problema: "Payload too large"

```
Error: HTTP Code: 413

Causa: JSON enviado muy grande
```

**Soluciones:**
```cpp
// En ESP32, enviar menos datos:
appClient.sendData(
    temperatura,
    humedad,
    presion
    // Eliminar otros campos por ahora
);
```

---

## 📊 Tabla de Diagnóstico

| Síntoma | Prueba | Solución |
|---------|--------|----------|
| ESP32 no conecta WiFi | `Serial Monitor` muestra "."s infinitos | Verificar SSID/password, usar 2.4GHz |
| WiFi conecta pero HTTP error | Ping a `8.8.8.8` desde ESP32 | Verificar DNS, usar WiFi.setDNS() |
| HTTP error pero sin especificar | Ver HTTP Code en serial | Revisar troubleshooting arriba |
| Datos llegan pero incorrecto JSON | Backend error 422 | Verificar formato con ArduinoJson |
| Dashboard no actualiza | Verificar que datos llegan a `/api/stations/` | Revisar backend logs |

---

## 🧪 Test de Conectividad Completo

### Desde Raspberry Pi (o tu PC)

```bash
#!/bin/bash
# test-connectivity.sh

echo "╔════════════════════════════════════════╗"
echo "║   VERIFICACIÓN COMPLETA DE SETUP       ║"
echo "╚════════════════════════════════════════╝"

# 1. Duck DNS
echo ""
echo "1️⃣  VERIFICANDO DUCK DNS..."
if nslookup estacion-temperatura.duckdns.org > /dev/null; then
    echo "   ✅ Duck DNS resuelve"
    nslookup estacion-temperatura.duckdns.org | grep "Address:" | tail -1
else
    echo "   ❌ Duck DNS NO RESUELVE"
fi

# 2. Cloudflare Tunnel
echo ""
echo "2️⃣  VERIFICANDO CLOUDFLARE TUNNEL..."
if nslookup api.estacion-temperatura.duckdns.org > /dev/null; then
    echo "   ✅ CNAME Cloudflare resuelve"
else
    echo "   ❌ CNAME Cloudflare NO RESUELVE"
fi

# 3. Backend local
echo ""
echo "3️⃣  VERIFICANDO BACKEND LOCAL..."
if curl -s http://localhost:8000/api/stations/ > /dev/null; then
    echo "   ✅ Backend en localhost:8000 OK"
else
    echo "   ❌ Backend NO RESPONDE"
fi

# 4. Cloudflare connection
echo ""
echo "4️⃣  VERIFICANDO HTTPS DESDE CLOUDFLARE..."
if curl -s https://api.estacion-temperatura.duckdns.org/api/stations/ > /dev/null; then
    echo "   ✅ HTTPS desde Cloudflare OK"
else
    echo "   ❌ HTTPS NO FUNCIONA"
fi

# 5. Cloudflare service
echo ""
echo "5️⃣  VERIFICANDO SERVICIO CLOUDFLARED..."
if sudo systemctl is-active --quiet cloudflared.service; then
    echo "   ✅ Servicio cloudflared activo"
else
    echo "   ❌ Servicio cloudflared INACTIVO"
    echo "   💡 Iniciar con: sudo systemctl start cloudflared.service"
fi

# 6. Backend service
echo ""
echo "6️⃣  VERIFICANDO BACKEND..."
if lsof -i :8000 > /dev/null 2>&1; then
    echo "   ✅ Backend corriendo en puerto 8000"
else
    echo "   ❌ Backend NO ESTÁ CORRIENDO"
    echo "   💡 Iniciar con: cd backend && python main.py"
fi

echo ""
echo "═════════════════════════════════════════"
echo "PRUEBA COMPLETA FINALIZADA"
echo "═════════════════════════════════════════"
```

**Ejecutar:**
```bash
chmod +x test-connectivity.sh
./test-connectivity.sh
```

---

## 🧪 Test directo del ESP32

### Desde Serial Monitor en Arduino IDE

1. Abrir Arduino IDE
2. Tools → Serial Monitor
3. Baud Rate: **115200**
4. Esperar 30 segundos

**Esperado:**
```
✅ WiFi conectado!
IP local: 192.168.1.100
RSSI: -45 dBm

═════════════════════════════════════════
📤 Hora de enviar datos
═════════════════════════════════════════

🔵 Enviando datos...
URL: https://api.estacion-temperatura.duckdns.org/api/stations/ESP32_ESCUELA_001/data
Payload: {"temperature":22.5,...}
HTTP Code: 201 ← ESTE NÚMERO ES MUY IMPORTANTE
Response: {...}
✅ ÉXITO
```

**Códigos HTTP significativos:**
- `201` = Creado exitosamente ✅
- `200` = OK ✅
- `400` = Solicitud inválida (revisar JSON)
- `401` = No autorizado (revisar token)
- `403` = Prohibido (revisar SSL/certificados)
- `500` = Error en servidor (revisar backend)
- Timeout = No hay conexión (revisar Cloudflare)

---

## 📈 Escalada de Pruebas

### Nivel 1: Verificación Local (5 min)

```bash
# Todo en tu máquina
curl http://localhost:8000/api/stations/
# Debe retornar lista de estaciones
```

### Nivel 2: Verificación Red Local (5 min)

```bash
# Desde otro dispositivo en la red
curl http://192.168.1.100:8000/api/stations/
# Debe retornar igual que nivel 1
```

### Nivel 3: Verificación Duck DNS (10 min)

```bash
# Desde internet
curl https://estacion-temperatura.duckdns.org:8000/api/stations/
# (Nota: puerto 8000, NO CNAME api.estacion-temperatura)
```

### Nivel 4: Verificación Cloudflare (10 min)

```bash
# Desde internet con Cloudflare
curl https://api.estacion-temperatura.duckdns.org/api/stations/
# (Sin puerto porque Cloudflare lo maneja)
```

### Nivel 5: Verificación ESP32 (5 min)

```
Serial Monitor debe mostrar:
HTTP Code: 201
✅ ÉXITO
```

---

## 🎯 Resumen Rápido

**Si todo funciona:**
1. ✅ Duck DNS resuelve tu IP
2. ✅ Cloudflare túnel redirige a backend
3. ✅ Backend recibe datos HTTPS
4. ✅ ESP32 envía cada 30 segundos
5. ✅ Dashboard muestra datos actuales

**Si algo falla:**
1. Revisar tabla de troubleshooting
2. Ejecutar script test-connectivity.sh
3. Leer Serial Monitor del ESP32
4. Revisar logs: `sudo journalctl -u cloudflared.service -f`

---

**Última actualización:** 2024  
**Status:** ✅ Listo para uso
