# ⚡ INSTRUCCIONES ESENCIALES - 30 SEGUNDOS

## 🎯 Situación actual

- ✅ Heroku deployado (funcional)
- ✅ Scripts creados (setup, simulador, verificador)
- ✅ Documentación completa
- 🟡 Esperando que ejecutes en Raspberry Pi

---

## 🚀 Los 3 comandos que necesitas

### 1. En Raspberry Pi:

```bash
cd /home/pi/weather_station
chmod +x setup_raspberry_optimized.sh
./setup_raspberry_optimized.sh
```

**¿Qué hace?**
- Instala Python, PostgreSQL, Nginx, Cloudflare Tunnel
- Crea 3 servicios systemd (auto-start)
- Configura todo automáticamente

**Tiempo**: 15 minutos

---

### 2. Configurar Cloudflare:

```bash
cloudflared tunnel login
cloudflared tunnel create raspberry-weather
cloudflared tunnel route dns raspberry-weather tu-dominio.com
sudo systemctl start weather-tunnel
```

**¿Qué hace?**
- Crea URL pública: `https://tu-dominio.com`
- Sin abrir puertos en router
- HTTPS automático

**Tiempo**: 5 minutos

---

### 3. Probar en tu laptop:

```bash
python3 fake_weather_terminal.py https://tu-dominio.com
```

**¿Qué hace?**
- Envía datos de prueba
- Verifica que funciona

**Tiempo**: 5 minutos

---

## ✨ Resultado

```
https://tu-dominio.com 
        ↑
   Datos en vivo
   del ESP32
```

---

## 📚 Si necesitas más info:

```bash
# Resumen ejecutivo (5 min)
cat PASOS_SIGUIENTES.md

# Guía completa (20 min)
cat GUIA_COMPLETA_RASPBERRY_CLOUDFLARE.md

# Referencia rápida
cat CHEAT_SHEET.md
```

---

**¡Listo! Ejecuta y disfruta 🎉**
