from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
import uuid
import os

from app.core.database import SessionLocal
from app.models.station import WeatherStation, WeatherData

bp = Blueprint('stations', __name__, url_prefix='/api/stations')

@bp.route('/', methods=['POST'])
def create_station():
    """Create a new weather station - Simplified"""
    db = SessionLocal()
    try:
        data = request.get_json()
        
        # Validación simple
        required = ['name', 'location', 'latitude', 'longitude']
        if not all(k in data for k in required):
            return jsonify({"detail": "Missing required fields"}), 400
        
        # Crear estación
        station = WeatherStation(
            id=data.get('id', str(uuid.uuid4())),
            name=data['name'],
            location=data['location'],
            latitude=float(data['latitude']),
            longitude=float(data['longitude']),
            description=data.get('description', '')
        )
        
        db.add(station)
        db.commit()
        db.refresh(station)
        
        return jsonify({
            'id': station.id,
            'name': station.name,
            'location': station.location,
            'latitude': station.latitude,
            'longitude': station.longitude,
            'active': station.active,
            'created_at': station.created_at.isoformat()
        }), 201
    except ValueError as e:
        return jsonify({"detail": str(e)}), 400
    finally:
        db.close()

@bp.route('/', methods=['GET'])
def list_stations():
    """List all weather stations"""
    db = SessionLocal()
    try:
        active = request.args.get('active', type=lambda x: x.lower() == 'true')
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 100, type=int)
        
        query = db.query(WeatherStation)
        
        if active is not None:
            query = query.filter(WeatherStation.active == active)
        
        stations = query.order_by(desc(WeatherStation.updated_at)).offset(skip).limit(limit).all()
        
        return jsonify([{
            'id': s.id,
            'name': s.name,
            'location': s.location,
            'latitude': s.latitude,
            'longitude': s.longitude,
            'active': s.active,
            'last_data_time': s.last_data_time.isoformat() if s.last_data_time else None,
            'created_at': s.created_at.isoformat()
        } for s in stations])
    finally:
        db.close()

@bp.route('/<station_id>', methods=['GET'])
def get_station(station_id):
    """Get station details with latest data"""
    db = SessionLocal()
    try:
        station = db.query(WeatherStation).filter(WeatherStation.id == station_id).first()
        
        if not station:
            return jsonify({"detail": "Station not found"}), 404
        
        latest_data = db.query(WeatherData).filter(
            WeatherData.station_id == station_id
        ).order_by(desc(WeatherData.timestamp)).first()
        
        result = {
            'id': station.id,
            'name': station.name,
            'location': station.location,
            'latitude': station.latitude,
            'longitude': station.longitude,
            'active': station.active,
            'created_at': station.created_at.isoformat(),
            'latest_data': None
        }
        
        if latest_data:
            result['latest_data'] = {
                'temperature': latest_data.temperature,
                'humidity': latest_data.humidity,
                'wind_speed_ms': latest_data.wind_speed_ms,
                'timestamp': latest_data.timestamp.isoformat()
            }
        
        return jsonify(result)
    finally:
        db.close()

@bp.route('/<station_id>', methods=['PUT'])
def update_station(station_id):
    """Update station information"""
    db = SessionLocal()
    try:
        station = db.query(WeatherStation).filter(WeatherStation.id == station_id).first()
        
        if not station:
            return jsonify({"detail": "Station not found"}), 404
        
        data = request.get_json()
        if 'name' in data:
            station.name = data['name']
        if 'location' in data:
            station.location = data['location']
        if 'description' in data:
            station.description = data['description']
        if 'active' in data:
            station.active = data['active']
        
        station.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(station)
        
        return jsonify({
            'id': station.id,
            'name': station.name,
            'updated_at': station.updated_at.isoformat()
        })
    finally:
        db.close()

@bp.route('/<station_id>', methods=['DELETE'])
def delete_station(station_id):
    """Delete a weather station"""
    db = SessionLocal()
    try:
        station = db.query(WeatherStation).filter(WeatherStation.id == station_id).first()
        
        if not station:
            return jsonify({"detail": "Station not found"}), 404
        
        db.delete(station)
        db.commit()
        
        return '', 204
    finally:
        db.close()
