"""
Simulador de estación meteorológica ESP32.
Crea automáticamente una estación de prueba y envía lecturas realistas
cada 30 segundos al backend en http://localhost:8000.

Uso:  python3 simulate_station.py
      python3 simulate_station.py --interval 10   # cada 10 s
      python3 simulate_station.py --station-id <uuid>  # reusar ID existente
"""
import argparse
import json
import math
import random
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

BASE_URL = "https://weather-mx.fly.dev"


# ── helpers ──────────────────────────────────────────────────────────────────

def api(method: str, path: str, body: dict | None = None) -> dict:
    url = BASE_URL + path
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={"Content-Type": "application/json"} if data else {}
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())


def ensure_station(station_id: str | None) -> dict:
    """Return existing station or create a new demo one."""
    if station_id:
        try:
            station = api("GET", f"/api/stations/{station_id}")
            print(f"  Usando estación existente: {station['name']} ({station['id']})")
            return station
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"  ID {station_id!r} no encontrado, creando nueva estación…")
            else:
                raise

    station = api("POST", "/api/stations/", {
        "name": "est_norte_02",
        "location": "Ciudad de México, México",
        "latitude": 19.4326,
        "longitude": -99.1332,
        "active": True,
    })
    print(f"  Estación creada: {station['name']}")
    print(f"  ID: {station['id']}")
    return station


# ── sensor model ─────────────────────────────────────────────────────────────

def sensor_reading(t: float, rain_event: bool) -> dict:
    """Generate a realistic sensor reading for time t (unix seconds)."""
    hour = (t / 3600) % 24

    # temperatura: ciclo diurno 15–32 °C + ruido
    temp = 23.5 + 8.5 * math.sin(math.pi * (hour - 6) / 12) + random.gauss(0, 0.4)

    # humedad: inversamente correlada con temperatura + ruido
    hum = 65 - 18 * math.sin(math.pi * (hour - 6) / 12) + random.gauss(0, 1.5)
    hum = max(20.0, min(100.0, hum))

    # viento: ligero con ráfagas ocasionales
    wind = abs(random.gauss(3.5, 1.2))
    gust = wind + abs(random.gauss(1.5, 0.8))
    direction = (180 + random.gauss(0, 30)) % 360

    # lluvia
    rain_rate = 0.0
    tips = 0
    if rain_event:
        rain_rate = random.uniform(0.5, 8.0)
        tips = random.randint(1, 4)

    return {
        "temperature":             round(temp, 2),
        "humidity":                round(hum, 2),
        "wind_speed_ms":           round(wind, 2),
        "wind_gust_ms":            round(gust, 2),
        "wind_direction_degrees":  round(direction, 1),
        "rain_rate_mm_per_hour":   round(rain_rate, 2),
        "total_tips":              tips,
        "total_rainfall":          round(rain_rate / 2, 2),
    }


# ── main loop ─────────────────────────────────────────────────────────────────

def run(station_id: str | None, interval: int):
    print("=" * 56)
    print("  Simulador de estación meteorológica")
    print(f"  Backend: {BASE_URL}")
    print(f"  Intervalo: {interval} s")
    print("=" * 56)

    # wait for backend
    for attempt in range(1, 16):
        try:
            api("GET", "/health")
            print("  Backend OK\n")
            break
        except Exception:
            print(f"  Esperando backend… intento {attempt}/15")
            time.sleep(2)
    else:
        print("  ERROR: backend no disponible en", BASE_URL)
        return

    station = ensure_station(station_id)
    sid = station["id"]
    print(f"\n  Enviando datos a /api/data/submit  (Ctrl+C para parar)\n")
    print(f"  {'Hora':<20}  {'Temp':>6}  {'Hum':>5}  {'Viento':>8}  {'Lluvia':>7}")
    print("  " + "-" * 53)

    rain_event = False
    rain_countdown = 0
    reading_count = 0

    try:
        while True:
            t = time.time()

            # lluvia aleatoria: ~10 % de probabilidad de inicio de evento
            if rain_countdown > 0:
                rain_countdown -= 1
                rain_event = True
            elif random.random() < 0.10:
                rain_event = True
                rain_countdown = random.randint(2, 6)
            else:
                rain_event = False

            reading = sensor_reading(t, rain_event)
            payload = {"station_id": sid, **reading}

            try:
                resp = api("POST", "/api/data/submit", payload)
                reading_count += 1
                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                rain_str = f"{reading['rain_rate_mm_per_hour']:>5.1f} mm/h" if rain_event else "    seco"
                print(
                    f"  {now}  "
                    f"{reading['temperature']:>5.1f}°C  "
                    f"{reading['humidity']:>4.0f}%  "
                    f"{reading['wind_speed_ms']:>5.1f} m/s  "
                    f"{rain_str}"
                )
            except urllib.error.HTTPError as e:
                print(f"  ⚠ HTTP {e.code}: {e.read().decode()[:80]}")
            except Exception as e:
                print(f"  ⚠ Error: {e}")

            time.sleep(interval)

    except KeyboardInterrupt:
        print(f"\n\n  Simulador detenido. {reading_count} lecturas enviadas.")
        print(f"  ID de estación: {sid}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Simulador ESP32")
    parser.add_argument("--interval", type=int, default=30,
                        help="Segundos entre lecturas (default: 30)")
    parser.add_argument("--station-id", type=str, default=None,
                        help="UUID de estación existente (si no se da, crea una nueva)")
    args = parser.parse_args()
    run(args.station_id, args.interval)
