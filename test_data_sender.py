#!/usr/bin/env python3
"""
Script para enviar datos a la webapp desde ESP32 o dispositivos locales
Útil para testing y integración con sensores
"""

import requests
import json
import time
from datetime import datetime
import random

API_URL = "http://localhost:8000/api/stations"

def create_test_station():
    """Crear estación de prueba"""
    station_data = {
        "id": "TEST_STATION_001",
        "name": "Estación de Prueba",
        "location": "Madrid, España",
        "latitude": 40.4168,
        "longitude": -3.7038,
        "description": "Estación generada automáticamente para testing"
    }
    
    response = requests.post(f"{API_URL}/", json=station_data)
    if response.status_code == 201:
        print("✅ Estación creada:", response.json()["id"])
        return response.json()["id"]
    else:
        print("⚠️ Estación ya existe o error:", response.text)
        return "TEST_STATION_001"

def send_weather_data(station_id, temperature, humidity, wind_speed):
    """Enviar datos de clima"""
    data = {
        "station_id": station_id,
        "temperature": temperature,
        "humidity": humidity,
        "dew_point": temperature - (100 - humidity) / 5,
        "wind_speed_ms": wind_speed,
        "wind_speed_mph": wind_speed * 2.237,
        "wind_gust_ms": wind_speed * 1.3,
        "wind_gust_mph": wind_speed * 1.3 * 2.237,
        "wind_direction_degrees": random.uniform(0, 360),
        "wind_direction_name": random.choice(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
        "total_rainfall": random.uniform(0, 10),
        "total_tips": random.randint(0, 100),
        "rain_rate_mm_per_hour": random.uniform(0, 5),
        "rain_rate_in_per_hour": random.uniform(0, 0.2)
    }
    
    response = requests.post(f"{API_URL}/{station_id}/data", json=data)
    if response.status_code == 201:
        print(f"✅ Datos enviados: {temperature}°C, {humidity}% HR")
        return True
    else:
        print(f"❌ Error:", response.text)
        return False

def simulate_sensor_stream(station_id, duration_seconds=60, interval=5):
    """Simular envío continuo de datos"""
    print(f"\n📡 Simulando sensor por {duration_seconds} segundos...")
    start_time = time.time()
    
    base_temp = 20
    
    while time.time() - start_time < duration_seconds:
        # Generar datos con variación natural
        temperature = base_temp + random.uniform(-2, 2)
        humidity = 50 + random.uniform(-10, 10)
        wind_speed = abs(random.gauss(3, 1))
        
        send_weather_data(station_id, round(temperature, 2), round(humidity, 1), round(wind_speed, 2))
        
        time.sleep(interval)
    
    print("✅ Simulación completada")

if __name__ == "__main__":
    import sys
    
    print("🌤️ Weather Station Data Sender")
    print("=" * 40)
    
    # Crear estación de prueba
    station_id = create_test_station()
    
    if len(sys.argv) > 1 and sys.argv[1] == "stream":
        # Modo simulación continua
        duration = int(sys.argv[2]) if len(sys.argv) > 2 else 60
        simulate_sensor_stream(station_id, duration)
    else:
        # Modo envío manual
        print("\nIngresa datos de sensores (o 'quit' para salir):")
        while True:
            try:
                temp = input("Temperatura (°C): ")
                if temp.lower() == "quit":
                    break
                
                humidity = input("Humedad (%): ")
                wind = input("Velocidad viento (m/s): ")
                
                send_weather_data(station_id, float(temp), float(humidity), float(wind))
            except ValueError:
                print("❌ Valores inválidos")
            except KeyboardInterrupt:
                break
    
    print("\n👋 ¡Hasta luego!")
