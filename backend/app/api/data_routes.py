from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta

from app.core.database import SessionLocal
from app.models.station import WeatherStation, WeatherData

bp = Blueprint('data', __name__, url_prefix='/api/data')

@bp.route('/submit', methods=['POST'])
def submit_data():
    """Submit weather data from ESP32 or sensor"""
    db = SessionLocal()
    try:
        data = request.get_json()
        
        # Validación
        if 'station_id' not in data or 'temperature' not in data:
            return jsonify({"detail": "Missing station_id or temperature"}), 400
        
        # Verificar que estación existe
        station = db.query(WeatherStation).filter(
            WeatherStation.id == data['station_id']
        ).first()
        
        if not station:
            return jsonify({"detail": "Station not found"}), 404
        
        # Crear registro de datos
        weather_data = WeatherData(
            station_id=data['station_id'],
            temperature=float(data['temperature']),
            humidity=float(data.get('humidity', 0)),
            wind_speed_ms=float(data.get('wind_speed_ms', 0)),
            wind_gust_ms=float(data.get('wind_gust_ms', 0)),
            wind_direction_degrees=float(data.get('wind_direction_degrees', 0)),
            total_rainfall=float(data.get('total_rainfall', 0)),
            total_tips=int(data.get('total_tips', 0)),
            rain_rate_mm_per_hour=float(data.get('rain_rate_mm_per_hour', 0))
        )
        
        db.add(weather_data)
        
        # Actualizar last_data_time de la estación
        station.last_data_time = datetime.utcnow()
        
        db.commit()
        db.refresh(weather_data)
        
        return jsonify({
            "id": weather_data.id,
            "status": "success",
            "timestamp": weather_data.timestamp.isoformat()
        }), 201
    except (ValueError, KeyError) as e:
        return jsonify({"detail": str(e)}), 400
    finally:
        db.close()

@bp.route('/station/<station_id>', methods=['GET'])
def get_station_data(station_id):
    """Get latest data from a station"""
    db = SessionLocal()
    try:
        hours = request.args.get('hours', 24, type=int)
        limit = request.args.get('limit', 100, type=int)
        
        since = datetime.utcnow() - timedelta(hours=hours)
        
        data = db.query(WeatherData).filter(
            WeatherData.station_id == station_id,
            WeatherData.timestamp >= since
        ).order_by(desc(WeatherData.timestamp)).limit(limit).all()
        
        return jsonify([{
            'temperature': d.temperature,
            'humidity': d.humidity,
            'wind_speed_ms': d.wind_speed_ms,
            'wind_direction_degrees': d.wind_direction_degrees,
            'total_rainfall': d.total_rainfall,
            'timestamp': d.timestamp.isoformat()
        } for d in data])
    finally:
        db.close()
