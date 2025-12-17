#!/usr/bin/env python3
"""
Script de mantenimiento para la webapp de estaciones meteorológicas
Incluye: limpieza de datos antiguos, estadísticas, backup
"""

import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import text

# Añadir ruta del backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.database import SessionLocal, engine
from app.models.station import WeatherStation, WeatherData
from app.core.config import settings

def cleanup_old_data(days=30):
    """Eliminar datos más antiguos que N días"""
    db = SessionLocal()
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        deleted = db.query(WeatherData).filter(
            WeatherData.timestamp < cutoff_date
        ).delete()
        
        db.commit()
        print(f"✅ Eliminados {deleted} registros de datos antiguos (> {days} días)")
        
        # Vacío y análisis
        db.execute(text("VACUUM ANALYZE weather_data"))
        db.commit()
        print("✅ Base de datos optimizada")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

def get_statistics():
    """Obtener estadísticas de la base de datos"""
    db = SessionLocal()
    try:
        total_stations = db.query(WeatherStation).count()
        active_stations = db.query(WeatherStation).filter(
            WeatherStation.active == True
        ).count()
        total_records = db.query(WeatherData).count()
        
        latest_record = db.query(WeatherData).order_by(
            WeatherData.timestamp.desc()
        ).first()
        
        print("\n📊 ESTADÍSTICAS DE LA BASE DE DATOS")
        print("=" * 50)
        print(f"Total de estaciones: {total_stations}")
        print(f"Estaciones activas: {active_stations}")
        print(f"Total de registros: {total_records}")
        if latest_record:
            print(f"Último registro: {latest_record.timestamp}")
        print("=" * 50)
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

def list_stations():
    """Listar todas las estaciones"""
    db = SessionLocal()
    try:
        stations = db.query(WeatherStation).all()
        
        print("\n📡 ESTACIONES REGISTRADAS")
        print("=" * 80)
        for station in stations:
            status = "✅ Activa" if station.active else "❌ Inactiva"
            last_data = station.last_data_time.strftime("%Y-%m-%d %H:%M:%S") if station.last_data_time else "Sin datos"
            print(f"ID: {station.id}")
            print(f"  Nombre: {station.name}")
            print(f"  Ubicación: {station.location}")
            print(f"  Estado: {status}")
            print(f"  Última actualización: {last_data}")
            print("-" * 80)
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

def backup_database(output_file=None):
    """Hacer backup de la base de datos"""
    if output_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = f"weather_backup_{timestamp}.sql"
    
    db_url = settings.DATABASE_URL
    if "postgresql" in db_url:
        # Extraer credenciales
        # postgresql://user:password@host/dbname
        parts = db_url.replace("postgresql://", "").split("@")
        credentials = parts[0].split(":")
        host_db = parts[1].split("/")
        
        user = credentials[0]
        password = credentials[1]
        host = host_db[0]
        dbname = host_db[1]
        
        os.system(f"PGPASSWORD={password} pg_dump -h {host} -U {user} {dbname} > {output_file}")
        print(f"✅ Backup creado: {output_file}")
    else:
        print("⚠️ Backup solo soportado para PostgreSQL")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Weather Station Maintenance")
    subparsers = parser.add_subparsers(dest="command", help="Comando a ejecutar")
    
    # Cleanup
    cleanup_parser = subparsers.add_parser("cleanup", help="Limpiar datos antiguos")
    cleanup_parser.add_argument("--days", type=int, default=30, help="Días de retención")
    
    # Stats
    subparsers.add_parser("stats", help="Mostrar estadísticas")
    
    # List
    subparsers.add_parser("list", help="Listar estaciones")
    
    # Backup
    backup_parser = subparsers.add_parser("backup", help="Hacer backup")
    backup_parser.add_argument("--output", help="Archivo de salida")
    
    args = parser.parse_args()
    
    if args.command == "cleanup":
        cleanup_old_data(args.days)
    elif args.command == "stats":
        get_statistics()
    elif args.command == "list":
        list_stations()
    elif args.command == "backup":
        backup_database(args.output)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
