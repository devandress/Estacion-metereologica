#!/usr/bin/env python3

"""
🌤️ SIMULADOR DE ESTACIÓN METEOROLÓGICA
Terminal que genera datos meteorológicos aleatorios y los envía a la API
Útil para probar la comunicación sin hardware real (ESP32)
"""

import requests
import json
import time
import random
import sys
from datetime import datetime
from pathlib import Path

# Colors
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
CYAN = '\033[96m'
WHITE = '\033[97m'
RESET = '\033[0m'
BOLD = '\033[1m'

class FakeWeatherStation:
    def __init__(self, api_url, station_id="FAKE_STATION_001"):
        self.api_url = api_url.rstrip('/')
        self.station_id = station_id
        self.session = requests.Session()
        
        # Valores base para generar datos realistas
        self.base_temp = 20  # °C
        self.base_humidity = 60  # %
        self.base_wind_speed = 5  # m/s
        
        # Límites
        self.temp_range = (-10, 40)  # °C
        self.humidity_range = (20, 95)  # %
        self.wind_range = (0, 20)  # m/s
        self.pressure_range = (970, 1030)  # hPa
        
    def print_header(self):
        """Imprimir encabezado"""
        print(f"\n{CYAN}{'='*70}{RESET}")
        print(f"{BOLD}{CYAN}🌤️  SIMULADOR DE ESTACIÓN METEOROLÓGICA{RESET}")
        print(f"{CYAN}{'='*70}{RESET}")
        print(f"  API URL:     {BLUE}{self.api_url}{RESET}")
        print(f"  Station ID:  {YELLOW}{self.station_id}{RESET}")
        print(f"  Inicio:      {BLUE}{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{RESET}")
        print(f"{CYAN}{'='*70}{RESET}\n")
    
    def generate_weather_data(self):
        """Generar datos meteorológicos realistas"""
        # Variación suave de temperatura (±2°C)
        temp = self.base_temp + random.uniform(-2, 2)
        temp = max(self.temp_range[0], min(self.temp_range[1], temp))
        
        # Variación de humedad
        humidity = self.base_humidity + random.uniform(-10, 10)
        humidity = max(self.humidity_range[0], min(self.humidity_range[1], humidity))
        
        # Punto de rocío (aproximado)
        dew_point = temp - ((100 - humidity) / 5)
        
        # Velocidad del viento
        wind_speed = self.base_wind_speed + random.uniform(-2, 3)
        wind_speed = max(0, wind_speed)
        
        # Ráfaga de viento
        wind_gust = wind_speed + random.uniform(0, 5)
        
        # Dirección del viento
        wind_direction = random.uniform(0, 360)
        
        # Presión
        pressure = random.uniform(*self.pressure_range)
        
        # Lluvia (mm)
        rain_mm = random.uniform(0, 2) if random.random() > 0.7 else 0
        
        return {
            "temperature": round(temp, 2),
            "humidity": round(humidity, 2),
            "dew_point": round(dew_point, 2),
            "wind_speed_ms": round(wind_speed, 2),
            "wind_gust_ms": round(wind_gust, 2),
            "wind_direction_degrees": round(wind_direction, 1),
            "pressure_hpa": round(pressure, 2),
            "rain_mm": round(rain_mm, 2),
        }
    
    def check_station_exists(self):
        """Verificar si la estación existe"""
        try:
            resp = self.session.get(f"{self.api_url}/api/stations", timeout=5)
            if resp.status_code == 200:
                stations = resp.json()
                for station in stations:
                    if station.get('id') == self.station_id:
                        return True
            return False
        except Exception as e:
            print(f"{RED}❌ Error al verificar estación: {e}{RESET}")
            return False
    
    def create_station(self):
        """Crear la estación en la API"""
        try:
            data = {
                "id": self.station_id,
                "name": "Estación Simulada",
                "description": "Estación meteorológica simulada para pruebas",
                "latitude": 40.4168,
                "longitude": -3.7038,
                "altitude": 500,
            }
            
            resp = self.session.post(
                f"{self.api_url}/api/stations",
                json=data,
                timeout=5
            )
            
            if resp.status_code in [200, 201]:
                print(f"{GREEN}✅ Estación creada: {self.station_id}{RESET}")
                return True
            else:
                print(f"{YELLOW}⚠️  Estación podría ya existir (código {resp.status_code}){RESET}")
                return True  # Continuar de todos modos
        except Exception as e:
            print(f"{RED}❌ Error al crear estación: {e}{RESET}")
            return False
    
    def send_weather_data(self, data):
        """Enviar datos meteorológicos a la API"""
        try:
            resp = self.session.post(
                f"{self.api_url}/api/stations/{self.station_id}/data",
                json=data,
                timeout=5
            )
            
            timestamp = datetime.now().strftime("%H:%M:%S")
            
            if resp.status_code in [200, 201]:
                print(f"{GREEN}✅ {timestamp}{RESET} | Temp: {BLUE}{data['temperature']:.1f}°C{RESET} | " +
                      f"Hum: {BLUE}{data['humidity']:.1f}%{RESET} | " +
                      f"Viento: {BLUE}{data['wind_speed_ms']:.1f}m/s{RESET} | " +
                      f"Presión: {BLUE}{data['pressure_hpa']:.1f}hPa{RESET}")
                return True
            else:
                print(f"{RED}❌ {timestamp} | Error {resp.status_code}: {resp.text[:50]}{RESET}")
                return False
        except requests.exceptions.Timeout:
            print(f"{RED}❌ Timeout al conectar{RESET}")
            return False
        except Exception as e:
            print(f"{RED}❌ Error: {e}{RESET}")
            return False
    
    def test_api_connection(self):
        """Probar conexión a la API"""
        try:
            print(f"\n{BLUE}🔌 Probando conexión a API...{RESET}")
            resp = self.session.get(f"{self.api_url}/", timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                print(f"{GREEN}✅ API respondiendo:{RESET}")
                print(f"   Mensaje: {data.get('message')}")
                print(f"   Versión: {data.get('version')}")
                return True
            else:
                print(f"{RED}❌ API no respondiendo (código {resp.status_code}){RESET}")
                return False
        except Exception as e:
            print(f"{RED}❌ No se puede conectar: {e}{RESET}")
            return False
    
    def run_once(self):
        """Enviar un solo dato"""
        if not self.test_api_connection():
            return False
        
        if not self.check_station_exists():
            print(f"{YELLOW}⚠️  Estación no existe, creando...{RESET}")
            if not self.create_station():
                return False
        
        data = self.generate_weather_data()
        return self.send_weather_data(data)
    
    def run_continuous(self, interval=60, max_readings=None):
        """Enviar datos continuamente"""
        self.print_header()
        
        if not self.test_api_connection():
            print(f"{RED}❌ No se puede conectar a la API{RESET}")
            return
        
        print(f"\n{YELLOW}⚠️  Creando estación si no existe...{RESET}")
        if not self.check_station_exists():
            if not self.create_station():
                print(f"{RED}❌ No se pudo crear la estación{RESET}")
                return
        
        print(f"\n{GREEN}📤 Iniciando envío de datos cada {interval} segundos...{RESET}")
        print(f"{YELLOW}Presiona Ctrl+C para detener{RESET}\n")
        
        count = 0
        try:
            while True:
                count += 1
                if max_readings and count > max_readings:
                    break
                
                data = self.generate_weather_data()
                self.send_weather_data(data)
                
                time.sleep(interval)
        except KeyboardInterrupt:
            print(f"\n\n{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
            print(f"{GREEN}✅ Simulación detenida{RESET}")
            print(f"   Lecturas enviadas: {YELLOW}{count}{RESET}")
            print(f"   Hora final: {BLUE}{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{RESET}")
            print(f"{CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}\n")

def print_menu():
    """Mostrar menú"""
    print(f"\n{CYAN}╔════════════════════════════════════════════╗{RESET}")
    print(f"{CYAN}║{RESET}  {BOLD}SIMULADOR ESTACIÓN METEOROLÓGICA{RESET}{CYAN}        ║{RESET}")
    print(f"{CYAN}╚════════════════════════════════════════════╝{RESET}")
    print(f"\n{BLUE}Opciones:{RESET}")
    print(f"  {GREEN}1{RESET} - Enviar un solo dato")
    print(f"  {GREEN}2{RESET} - Enviar continuamente (cada 60s)")
    print(f"  {GREEN}3{RESET} - Enviar continuamente (cada 5s) - Prueba rápida")
    print(f"  {GREEN}4{RESET} - Cambiar URL de API")
    print(f"  {GREEN}5{RESET} - Salir")
    print()

def main():
    """Función principal"""
    # URL por defecto
    api_url = "http://localhost:8080"
    
    # Intentar leer desde variable de entorno
    import os
    if 'API_URL' in os.environ:
        api_url = os.environ['API_URL']
    
    # Si hay argumentos, usar como URL
    if len(sys.argv) > 1:
        api_url = sys.argv[1]
    
    station = FakeWeatherStation(api_url)
    
    while True:
        print_menu()
        choice = input(f"{BLUE}Selecciona opción: {RESET}").strip()
        
        if choice == '1':
            print()
            station.run_once()
        
        elif choice == '2':
            station.run_continuous(interval=60)
        
        elif choice == '3':
            station.run_continuous(interval=5, max_readings=12)
        
        elif choice == '4':
            new_url = input(f"{BLUE}Nueva URL (ej: http://localhost:8080): {RESET}").strip()
            if new_url:
                station.api_url = new_url
                print(f"{GREEN}✅ URL actualizada: {new_url}{RESET}")
        
        elif choice == '5':
            print(f"{GREEN}👋 ¡Adiós!{RESET}\n")
            break
        
        else:
            print(f"{RED}❌ Opción no válida{RESET}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{GREEN}✅ Programa terminado{RESET}\n")
        sys.exit(0)
