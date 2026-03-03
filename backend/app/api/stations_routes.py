from flask import Blueprint, request, jsonify
from sqlalchemy import desc, func
from datetime import datetime, timedelta, timezone

def _now():
    """UTC now as naive datetime (compatible with SQLite)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
import uuid
import statistics as stats_module

from app.core.database import SessionLocal
from app.models.station import WeatherStation, WeatherData

bp = Blueprint('stations', __name__, url_prefix='/api/stations')


# ── Helpers ────────────────────────────────────────────────────────────────────

def _station_to_dict(s):
    return {
        'id': s.id,
        'name': s.name,
        'location': s.location,
        'latitude': s.latitude,
        'longitude': s.longitude,
        'active': s.active,
        'description': s.description,
        'last_data_time': s.last_data_time.isoformat() if s.last_data_time else None,
        'created_at': s.created_at.isoformat(),
        'updated_at': s.updated_at.isoformat() if s.updated_at else None,
    }


def _data_to_dict(d):
    return {
        'id': d.id,
        'temperature': d.temperature,
        'humidity': d.humidity,
        'dew_point': d.dew_point,
        'wind_speed_ms': d.wind_speed_ms,
        'wind_gust_ms': d.wind_gust_ms,
        'wind_direction_degrees': d.wind_direction_degrees,
        'wind_direction_name': d.wind_direction_name,
        'total_rainfall': d.total_rainfall,
        'rain_rate_mm_per_hour': d.rain_rate_mm_per_hour,
        'timestamp': d.timestamp.isoformat(),
    }


# ── Stations CRUD ───────────────────────────────────────────────────────────────

@bp.route('/', methods=['POST'])
def create_station():
    """Create a new weather station"""
    db = SessionLocal()
    try:
        data = request.get_json()
        if not data:
            return jsonify({"detail": "JSON body required"}), 400

        required = ['name', 'location', 'latitude', 'longitude']
        missing = [k for k in required if k not in data]
        if missing:
            return jsonify({"detail": f"Missing fields: {missing}"}), 400

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
        return jsonify(_station_to_dict(station)), 201
    except ValueError as e:
        return jsonify({"detail": str(e)}), 400
    finally:
        db.close()


@bp.route('/', methods=['GET'])
def list_stations():
    """List all weather stations with latest_data included"""
    db = SessionLocal()
    try:
        active_param = request.args.get('active')
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', 100, type=int)

        query = db.query(WeatherStation)

        if active_param is not None:
            query = query.filter(WeatherStation.active == (active_param.lower() == 'true'))

        stations = query.order_by(desc(WeatherStation.updated_at)).offset(skip).limit(limit).all()

        results = []
        for s in stations:
            d = _station_to_dict(s)
            latest = db.query(WeatherData).filter(
                WeatherData.station_id == s.id
            ).order_by(desc(WeatherData.timestamp)).first()
            d['latest_data'] = _data_to_dict(latest) if latest else None
            results.append(d)

        return jsonify(results)
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

        result = _station_to_dict(station)
        result['latest_data'] = _data_to_dict(latest_data) if latest_data else None
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

        data = request.get_json() or {}
        for field in ('name', 'location', 'description', 'active'):
            if field in data:
                setattr(station, field, data[field])
        if 'latitude' in data:
            station.latitude = float(data['latitude'])
        if 'longitude' in data:
            station.longitude = float(data['longitude'])

        station.updated_at = _now()
        db.commit()
        db.refresh(station)
        return jsonify(_station_to_dict(station))
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


# ── Data (frontend usa /api/stations/<id>/data) ────────────────────────────────

@bp.route('/<station_id>/data', methods=['GET'])
def get_station_data(station_id):
    """Get historical weather data for a station.
    Supports either date range (start_date/end_date) or relative hours."""
    db = SessionLocal()
    try:
        station = db.query(WeatherStation).filter(WeatherStation.id == station_id).first()
        if not station:
            return jsonify({"detail": "Station not found"}), 404

        limit = request.args.get('limit', 2000, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        query = db.query(WeatherData).filter(WeatherData.station_id == station_id)

        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date)
                end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
            except ValueError:
                return jsonify({"detail": "Formato de fecha inválido. Usa YYYY-MM-DD"}), 400
            query = query.filter(WeatherData.timestamp >= start, WeatherData.timestamp <= end)
        else:
            hours = request.args.get('hours', 24, type=int)
            since = _now() - timedelta(hours=hours)
            query = query.filter(WeatherData.timestamp >= since)

        data = query.order_by(desc(WeatherData.timestamp)).limit(limit).all()
        return jsonify([_data_to_dict(d) for d in data])
    finally:
        db.close()


# ── Stats ───────────────────────────────────────────────────────────────────────

@bp.route('/stats/overview', methods=['GET'])
def get_stats_overview():
    """System-wide statistics"""
    db = SessionLocal()
    try:
        total = db.query(WeatherStation).count()
        active = db.query(WeatherStation).filter(WeatherStation.active == True).count()
        total_records = db.query(WeatherData).count()

        since_24h = _now() - timedelta(hours=24)
        recent_stations = db.query(WeatherStation).filter(
            WeatherStation.last_data_time >= since_24h
        ).count()

        avg_temp = db.query(func.avg(WeatherData.temperature)).filter(
            WeatherData.timestamp >= since_24h
        ).scalar()

        return jsonify({
            "total_stations": total,
            "active_stations": active,
            "inactive_stations": total - active,
            "total_records": total_records,
            "recent_stations": recent_stations,
            "avg_temperature_24h": round(avg_temp, 2) if avg_temp else None,
            "timestamp": _now().isoformat()
        })
    finally:
        db.close()


@bp.route('/<station_id>/stats', methods=['GET'])
def get_station_stats(station_id):
    """Statistics for a station over N hours"""
    db = SessionLocal()
    try:
        station = db.query(WeatherStation).filter(WeatherStation.id == station_id).first()
        if not station:
            return jsonify({"detail": "Station not found"}), 404

        hours = request.args.get('hours', 24, type=int)
        since = _now() - timedelta(hours=hours)

        data = db.query(WeatherData).filter(
            WeatherData.station_id == station_id,
            WeatherData.timestamp >= since
        ).all()

        if not data:
            return jsonify({
                "station_id": station_id,
                "station_name": station.name,
                "period_hours": hours,
                "record_count": 0
            })

        temps = [d.temperature for d in data if d.temperature is not None]
        humids = [d.humidity for d in data if d.humidity is not None]
        winds = [d.wind_speed_ms for d in data if d.wind_speed_ms is not None]
        rainfall = sum(d.total_rainfall or 0 for d in data)

        def agg(values):
            if not values:
                return None
            return {
                "avg": round(sum(values) / len(values), 2),
                "min": round(min(values), 2),
                "max": round(max(values), 2),
                "std_dev": round(stats_module.stdev(values), 2) if len(values) > 1 else 0
            }

        return jsonify({
            "station_id": station_id,
            "station_name": station.name,
            "period_hours": hours,
            "record_count": len(data),
            "temperature": agg(temps),
            "humidity": agg(humids),
            "wind": {
                "avg_speed": round(sum(winds) / len(winds), 2) if winds else None,
                "max_speed": round(max(winds), 2) if winds else None
            },
            "total_rainfall": round(rainfall, 2)
        })
    finally:
        db.close()


# ── Bulk export ─────────────────────────────────────────────────────────────────

@bp.route('/bulk/export', methods=['GET'])
def bulk_export():
    """Export data from selected stations.
    Supports date range (start_date/end_date) or relative hours."""
    db = SessionLocal()
    try:
        ids_param = request.args.get('station_ids', '')
        if not ids_param:
            return jsonify({"detail": "station_ids parameter required"}), 400

        ids = [s.strip() for s in ids_param.split(',') if s.strip()]
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        stations = db.query(WeatherStation).filter(WeatherStation.id.in_(ids)).all()
        if not stations:
            return jsonify({"detail": "No stations found"}), 404

        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date)
                end = datetime.fromisoformat(end_date).replace(hour=23, minute=59, second=59)
            except ValueError:
                return jsonify({"detail": "Formato de fecha inválido. Usa YYYY-MM-DD"}), 400
            time_filter = lambda sid: (WeatherData.station_id == sid,
                                       WeatherData.timestamp >= start,
                                       WeatherData.timestamp <= end)
        else:
            hours = request.args.get('hours', 24, type=int)
            since = _now() - timedelta(hours=hours)
            time_filter = lambda sid: (WeatherData.station_id == sid,
                                       WeatherData.timestamp >= since)

        result = {}
        for station in stations:
            data = db.query(WeatherData).filter(
                *time_filter(station.id)
            ).order_by(WeatherData.timestamp).all()

            result[station.id] = {
                "station": _station_to_dict(station),
                "data": [_data_to_dict(d) for d in data]
            }

        return jsonify(result)
    finally:
        db.close()
