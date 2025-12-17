#!/usr/bin/env python3
"""
Script de prueba para enviar datos a la API
Uso: python3 test_enviar_datos.py
"""

import requests
import json
import time
from datetime import datetime
import sys

API_BASE = "http://localhost:8000/api"

class bcolors:
    OK = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    BLUE = '\033[94m'

def print_header(msg):
    print(f"\n{bcolors.BOLD}{bcolors.BLUE}{'='*60}{bcolors.ENDC}")
    print(f"{bcolors.BOLD}{bcolors.BLUE}{msg}{bcolors.ENDC}")
    print(f"{bcolors.BOLD}{bcolors.BLUE}{'='*60}{bcolors.ENDC}\n")

def print_ok(msg):
    print(f"{bcolors.OK}✅ {msg}{bcolors.ENDC}")

def print_error(msg):
    print(f"{bcolors.FAIL}❌ {msg}{bcolors.ENDC}")

def print_warning(msg):
    print(f"{bcolors.WARNING}⚠️  {msg}{bcolors.ENDC}")

def print_info(msg):
    print(f"{bcolors.BLUE}ℹ️  {msg}{bcolors.ENDC}")

# ===== CREAR ESTACIÓN =====
def crear_estacion(station_id, name, location, lat, lng):
    print_info(f"Creando estación: {station_id}")
    
    try:
        response = requests.post(
            f"{API_BASE}/stations/",
            json={
                "id": station_id,
                "name": name,
                "location": location,
                "latitude": lat,
                "longitude": lng,
                "description": f"Estación de prueba creada a las {datetime.now()}"
            },
            timeout=5
        )
        
        if response.status_code == 201:
            data = response.json()
            print_ok(f"Estación creada: {data['id']}")
            print(f"   Nombre: {data['name']}")
            print(f"   Ubicación: {data['location']}")
            print(f"   Coordenadas: {data['latitude']}, {data['longitude']}")
            return True
        elif response.status_code == 422:
            print_warning("Estación ya existe")
            return True
        else:
            print_error(f"Error {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print_error("No se puede conectar al servidor (http://localhost:8000)")
        print_info("Asegúrate de que el backend esté corriendo: /home/andy/weather_app/start.sh")
        return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

# ===== ENVIAR DATOS =====
def enviar_datos(station_id, temperature, humidity, wind_speed=0, wind_direction=180, rainfall=0):
    print_info(f"Enviando datos a estación: {station_id}")
    
    try:
        response = requests.post(
            f"{API_BASE}/stations/{station_id}/data",
            json={
                "temperature": temperature,
                "humidity": humidity,
                "wind_speed_ms": wind_speed,
                "wind_gust_ms": wind_speed * 1.2,
                "wind_direction_degrees": wind_direction,
                "total_rainfall": rainfall
            },
            timeout=5
        )
        
        if response.status_code == 201:
            data = response.json()
            print_ok("Datos enviados correctamente")
            print(f"   ID Registro: {data['id']}")
            print(f"   Temperatura: {data['temperature']}°C")
            print(f"   Humedad: {data['humidity']}%")
            print(f"   Timestamp: {data['created_at']}")
            return True
        elif response.status_code == 404:
            print_error("Estación no encontrada. Créala primero.")
            return False
        elif response.status_code == 400:
            print_error(f"Datos inválidos: {response.text}")
            return False
        else:
            print_error(f"Error {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print_error("No se puede conectar al servidor")
        return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

# ===== LISTAR ESTACIONES =====
def listar_estaciones():
    print_info("Obteniendo lista de estaciones...")
    
    try:
        response = requests.get(f"{API_BASE}/stations/", timeout=5)
        
        if response.status_code == 200:
            stations = response.json()
            if not stations:
                print_warning("No hay estaciones registradas")
                return stations
            
            print_ok(f"Se encontraron {len(stations)} estación(es):\n")
            for station in stations:
                status = "🟢 Activa" if station['active'] else "🔴 Inactiva"
                last_data = station.get('last_data_time', 'Nunca')
                print(f"  • {station['id']}")
                print(f"    Nombre: {station['name']}")
                print(f"    Ubicación: {station['location']}")
                print(f"    Coordenadas: {station['latitude']}, {station['longitude']}")
                print(f"    Estado: {status}")
                print(f"    Última actualización: {last_data}")
                print()
            
            return stations
        else:
            print_error(f"Error {response.status_code}")
            return None
            
    except requests.exceptions.ConnectionError:
        print_error("No se puede conectar al servidor")
        return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None

# ===== OBTENER DATOS DE ESTACIÓN =====
def obtener_datos(station_id, hours=24):
    print_info(f"Obteniendo datos de {station_id} (últimas {hours}h)...")
    
    try:
        response = requests.get(
            f"{API_BASE}/stations/{station_id}/data?hours={hours}&limit=10",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            if not data:
                print_warning("No hay datos registrados")
                return data
            
            print_ok(f"Se encontraron {len(data)} registro(s):\n")
            for record in data:
                print(f"  📍 {record['created_at']}")
                print(f"     Temperatura: {record['temperature']}°C")
                print(f"     Humedad: {record['humidity']}%")
                if record.get('wind_speed_ms'):
                    print(f"     Viento: {record['wind_speed_ms']} m/s")
                print()
            
            return data
        elif response.status_code == 404:
            print_error("Estación no encontrada")
            return None
        else:
            print_error(f"Error {response.status_code}")
            return None
            
    except requests.exceptions.ConnectionError:
        print_error("No se puede conectar al servidor")
        return None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return None

# ===== MENÚ PRINCIPAL =====
def menu():
    while True:
        print_header("🌤️ Weather Station - Test API")
        print("Opciones:")
        print("  1. Crear estación de prueba")
        print("  2. Listar estaciones")
        print("  3. Enviar datos a estación")
        print("  4. Obtener datos de estación")
        print("  5. Modo automático (test completo)")
        print("  6. Modo simulación (datos continuos)")
        print("  7. Salir")
        print()
        
        opcion = input("Selecciona opción (1-7): ").strip()
        
        if opcion == "1":
            print()
            station_id = input("ID de estación (ej: ESP32_TEST_001): ").strip() or "ESP32_TEST_001"
            name = input("Nombre (ej: Estación Prueba): ").strip() or "Estación Prueba"
            location = input("Ubicación (ej: Madrid): ").strip() or "Madrid"
            lat = float(input("Latitud (ej: 40.4168): ").strip() or "40.4168")
            lng = float(input("Longitud (ej: -3.7038): ").strip() or "-3.7038")
            
            crear_estacion(station_id, name, location, lat, lng)
            input("\nPresiona ENTER para continuar...")
        
        elif opcion == "2":
            print()
            listar_estaciones()
            input("\nPresiona ENTER para continuar...")
        
        elif opcion == "3":
            print()
            station_id = input("ID de estación: ").strip() or "ESP32_TEST_001"
            temp = float(input("Temperatura (°C): ").strip() or "22.5")
            humidity = float(input("Humedad (%): ").strip() or "65")
            wind = float(input("Viento (m/s): ").strip() or "0")
            
            enviar_datos(station_id, temp, humidity, wind)
            input("\nPresiona ENTER para continuar...")
        
        elif opcion == "4":
            print()
            station_id = input("ID de estación: ").strip() or "ESP32_TEST_001"
            hours = int(input("Últimas N horas (ej: 24): ").strip() or "24")
            
            obtener_datos(station_id, hours)
            input("\nPresiona ENTER para continuar...")
        
        elif opcion == "5":
            print()
            print_header("🔄 Modo Automático")
            
            # Crear estación
            station_id = "ESP32_AUTO_TEST"
            if crear_estacion(station_id, "Estación Automática", "Test Lab", 40.0, -3.0):
                # Enviar algunos datos
                print()
                for i in range(3):
                    temp = 20 + (i * 1.5)
                    humidity = 60 + (i * 2)
                    enviar_datos(station_id, temp, humidity, wind_speed=2.5)
                    time.sleep(1)
                
                # Listar datos
                print()
                obtener_datos(station_id, hours=1)
            
            input("\nPresiona ENTER para continuar...")
        
        elif opcion == "6":
            print()
            print_header("🔄 Modo Simulación")
            station_id = input("ID de estación (ej: ESP32_SIM): ").strip() or "ESP32_SIM"
            duration = int(input("Duración en segundos (ej: 60): ").strip() or "60")
            interval = int(input("Intervalo entre datos en segundos (ej: 10): ").strip() or "10")
            
            print()
            print_ok(f"Enviando datos a {station_id} durante {duration} segundos")
            print_ok(f"Intervalo: {interval} segundos\n")
            
            start_time = time.time()
            count = 0
            
            while time.time() - start_time < duration:
                # Simular valores realistas
                import random
                temp = 15 + random.uniform(-5, 15)
                humidity = 50 + random.uniform(-20, 30)
                wind = random.uniform(0, 10)
                
                if enviar_datos(station_id, temp, humidity, wind):
                    count += 1
                
                time.sleep(interval)
            
            print()
            print_ok(f"Simulación completada: {count} datos enviados")
            input("\nPresiona ENTER para continuar...")
        
        elif opcion == "7":
            print_ok("¡Hasta luego!")
            break
        
        else:
            print_error("Opción no válida")
            time.sleep(1)

if __name__ == "__main__":
    try:
        menu()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelado por el usuario")
        sys.exit(0)
