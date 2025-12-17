from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func
from datetime import datetime, timedelta
from typing import List
import uuid

from app.core.database import get_db
from app.models.station import WeatherStation, WeatherData
from app.schemas.station import (
    StationCreate, StationResponse, WeatherDataCreate, 
    WeatherDataResponse, StationUpdate, StationDetailResponse
)

router = APIRouter(prefix="/api/stations", tags=["stations"])

# ===== STATION ENDPOINTS =====

@router.post("/", response_model=StationResponse, status_code=201)
def create_station(station: StationCreate, db: Session = Depends(get_db)):
    """Create a new weather station"""
    db_station = WeatherStation(
        id=station.id or str(uuid.uuid4()),
        name=station.name,
        location=station.location,
        latitude=station.latitude,
        longitude=station.longitude,
        description=station.description
    )
    db.add(db_station)
    db.commit()
    db.refresh(db_station)
    return db_station

@router.get("/", response_model=List[StationResponse])
def list_stations(
    active: bool = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """List all weather stations with optional filtering"""
    query = db.query(WeatherStation)
    
    if active is not None:
        query = query.filter(WeatherStation.active == active)
    
    query = query.order_by(WeatherStation.updated_at.desc())
    stations = query.offset(skip).limit(limit).all()
    
    return stations

@router.get("/{station_id}", response_model=StationDetailResponse)
def get_station(station_id: str, db: Session = Depends(get_db)):
    """Get station details with latest data"""
    db_station = db.query(WeatherStation).filter(
        WeatherStation.id == station_id
    ).first()
    
    if not db_station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    latest_data = db.query(WeatherData).filter(
        WeatherData.station_id == station_id
    ).order_by(desc(WeatherData.timestamp)).first()
    
    station_dict = {**db_station.__dict__, "latest_data": latest_data}
    return station_dict

@router.put("/{station_id}", response_model=StationResponse)
def update_station(
    station_id: str,
    station: StationUpdate,
    db: Session = Depends(get_db)
):
    """Update station information"""
    db_station = db.query(WeatherStation).filter(
        WeatherStation.id == station_id
    ).first()
    
    if not db_station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    update_data = station.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_station, key, value)
    
    db_station.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_station)
    
    return db_station

@router.delete("/{station_id}", status_code=204)
def delete_station(station_id: str, db: Session = Depends(get_db)):
    """Delete a weather station"""
    db_station = db.query(WeatherStation).filter(
        WeatherStation.id == station_id
    ).first()
    
    if not db_station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    db.delete(db_station)
    db.commit()

# ===== DATA ENDPOINTS =====

@router.post("/{station_id}/data", response_model=WeatherDataResponse, status_code=201)
def add_weather_data(
    station_id: str,
    data: WeatherDataCreate,
    db: Session = Depends(get_db)
):
    """Add weather data for a station"""
    db_station = db.query(WeatherStation).filter(
        WeatherStation.id == station_id
    ).first()
    
    if not db_station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    db_data = WeatherData(
        station_id=station_id,
        temperature=data.temperature,
        humidity=data.humidity,
        dew_point=data.dew_point,
        wind_speed_ms=data.wind_speed_ms,
        wind_speed_mph=data.wind_speed_mph,
        wind_gust_ms=data.wind_gust_ms,
        wind_gust_mph=data.wind_gust_mph,
        wind_direction_degrees=data.wind_direction_degrees,
        wind_direction_name=data.wind_direction_name,
        total_rainfall=data.total_rainfall,
        total_tips=data.total_tips,
        rain_rate_mm_per_hour=data.rain_rate_mm_per_hour,
        rain_rate_in_per_hour=data.rain_rate_in_per_hour
    )
    
    db.add(db_data)
    
    # Update station's last_data_time
    db_station.last_data_time = datetime.utcnow()
    
    db.commit()
    db.refresh(db_data)
    
    return db_data

@router.get("/{station_id}/data", response_model=List[WeatherDataResponse])
def get_station_data(
    station_id: str,
    hours: int = Query(24, ge=1, le=720),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db)
):
    """Get weather data for a station (last N hours)"""
    db_station = db.query(WeatherStation).filter(
        WeatherStation.id == station_id
    ).first()
    
    if not db_station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    since = datetime.utcnow() - timedelta(hours=hours)
    
    data = db.query(WeatherData).filter(
        WeatherData.station_id == station_id,
        WeatherData.timestamp >= since
    ).order_by(desc(WeatherData.timestamp)).offset(skip).limit(limit).all()
    
    return data

# ===== BULK OPERATIONS =====

@router.post("/bulk/data", response_model=dict, status_code=201)
def add_bulk_data(
    data_list: List[WeatherDataCreate],
    db: Session = Depends(get_db)
):
    """Add weather data from multiple stations efficiently"""
    added_count = 0
    errors = []
    
    for data in data_list:
        try:
            db_station = db.query(WeatherStation).filter(
                WeatherStation.id == data.station_id
            ).first()
            
            if not db_station:
                errors.append(f"Station {data.station_id} not found")
                continue
            
            db_data = WeatherData(
                station_id=data.station_id,
                temperature=data.temperature,
                humidity=data.humidity,
                dew_point=data.dew_point,
                wind_speed_ms=data.wind_speed_ms,
                wind_speed_mph=data.wind_speed_mph,
                wind_gust_ms=data.wind_gust_ms,
                wind_gust_mph=data.wind_gust_mph,
                wind_direction_degrees=data.wind_direction_degrees,
                wind_direction_name=data.wind_direction_name,
                total_rainfall=data.total_rainfall,
                total_tips=data.total_tips,
                rain_rate_mm_per_hour=data.rain_rate_mm_per_hour,
                rain_rate_in_per_hour=data.rain_rate_in_per_hour
            )
            
            db.add(db_data)
            db_station.last_data_time = datetime.utcnow()
            added_count += 1
        except Exception as e:
            errors.append(f"Error processing {data.station_id}: {str(e)}")
    
    db.commit()
    
    return {
        "added": added_count,
        "errors": errors
    }

@router.get("/bulk/export", response_model=dict)
def export_selected_stations(
    station_ids: str = Query(..., description="Comma-separated station IDs"),
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db)
):
    """Export data from selected stations"""
    ids_list = [s.strip() for s in station_ids.split(",")]
    
    stations = db.query(WeatherStation).filter(
        WeatherStation.id.in_(ids_list)
    ).all()
    
    if not stations:
        raise HTTPException(status_code=404, detail="No stations found")
    
    since = datetime.utcnow() - timedelta(hours=hours)
    
    result = {}
    for station in stations:
        data = db.query(WeatherData).filter(
            WeatherData.station_id == station.id,
            WeatherData.timestamp >= since
        ).order_by(desc(WeatherData.timestamp)).all()
        
        
        result[station.id] = {
            "station": {
                "name": station.name,
                "location": station.location,
                "latitude": station.latitude,
                "longitude": station.longitude
            },
            "data": data
        }
    
    return result


# ===== STATISTICS & HEALTH =====

@router.get("/stats/overview", tags=["statistics"])
def get_stats_overview(db: Session = Depends(get_db)):
    """Get overall system statistics"""
    total_stations = db.query(WeatherStation).count()
    active_stations = db.query(WeatherStation).filter(WeatherStation.active == True).count()
    inactive_stations = total_stations - active_stations
    
    total_records = db.query(WeatherData).count()
    
    # Stations with recent data (last 24 hours)
    since_24h = datetime.utcnow() - timedelta(hours=24)
    recent_stations = db.query(WeatherStation).filter(
        WeatherStation.last_data_time >= since_24h
    ).count()
    
    # Average temperature across all stations
    latest_temps = db.query(func.avg(WeatherData.temperature)).filter(
        WeatherData.timestamp >= since_24h
    ).scalar()
    
    return {
        "total_stations": total_stations,
        "active_stations": active_stations,
        "inactive_stations": inactive_stations,
        "total_records": total_records,
        "recent_stations": recent_stations,
        "avg_temperature_24h": latest_temps,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/{station_id}/stats", tags=["statistics"])
def get_station_stats(
    station_id: str,
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db)
):
    """Get statistics for a specific station"""
    station = db.query(WeatherStation).filter(
        WeatherStation.id == station_id
    ).first()
    
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    since = datetime.utcnow() - timedelta(hours=hours)
    
    data = db.query(WeatherData).filter(
        and_(
            WeatherData.station_id == station_id,
            WeatherData.timestamp >= since
        )
    ).all()
    
    if not data:
        return {
            "station_id": station_id,
            "station_name": station.name,
            "period_hours": hours,
            "record_count": 0,
            "error": "No data available for this period"
        }
    
    temperatures = [d.temperature for d in data if d.temperature is not None]
    humidities = [d.humidity for d in data if d.humidity is not None]
    wind_speeds = [d.wind_speed_ms for d in data if d.wind_speed_ms is not None]
    rainfall = sum(d.total_rainfall or 0 for d in data)
    
    import statistics
    
    return {
        "station_id": station_id,
        "station_name": station.name,
        "period_hours": hours,
        "record_count": len(data),
        "temperature": {
            "avg": sum(temperatures) / len(temperatures) if temperatures else None,
            "min": min(temperatures) if temperatures else None,
            "max": max(temperatures) if temperatures else None,
            "std_dev": statistics.stdev(temperatures) if len(temperatures) > 1 else None
        } if temperatures else None,
        "humidity": {
            "avg": sum(humidities) / len(humidities) if humidities else None,
            "min": min(humidities) if humidities else None,
            "max": max(humidities) if humidities else None
        } if humidities else None,
        "wind": {
            "avg_speed": sum(wind_speeds) / len(wind_speeds) if wind_speeds else None,
            "max_speed": max(wind_speeds) if wind_speeds else None
        } if wind_speeds else None,
        "total_rainfall": rainfall
    }


@router.get("/{station_id}/health", tags=["health"])
def check_station_health(station_id: str, db: Session = Depends(get_db)):
    """Check health status of a station (data freshness, etc)"""
    station = db.query(WeatherStation).filter(
        WeatherStation.id == station_id
    ).first()
    
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    # Check if we have recent data
    now = datetime.utcnow()
    last_hour = now - timedelta(hours=1)
    last_24h = now - timedelta(hours=24)
    
    recent_data = db.query(WeatherData).filter(
        and_(
            WeatherData.station_id == station_id,
            WeatherData.timestamp >= last_hour
        )
    ).count()
    
    daily_data = db.query(WeatherData).filter(
        and_(
            WeatherData.station_id == station_id,
            WeatherData.timestamp >= last_24h
        )
    ).count()
    
    # Determine health status
    if not station.active:
        status = "inactive"
    elif station.last_data_time is None:
        status = "no_data"
    elif station.last_data_time < (now - timedelta(hours=24)):
        status = "stale"
    elif station.last_data_time < (now - timedelta(hours=1)):
        status = "warning"
    else:
        status = "healthy"
    
    time_since_last_data = None
    if station.last_data_time:
        time_since_last_data = (now - station.last_data_time).total_seconds()
    
    return {
        "station_id": station_id,
        "station_name": station.name,
        "status": status,
        "active": station.active,
        "last_data_time": station.last_data_time,
        "time_since_last_data_seconds": time_since_last_data,
        "records_last_hour": recent_data,
        "records_last_24h": daily_data,
        "timestamp": now.isoformat()
    }


@router.get("/batch/health", tags=["health"])
def check_all_stations_health(db: Session = Depends(get_db)):
    """Check health status of all stations"""
    stations_list = db.query(WeatherStation).all()
    
    health_status = []
    for station in stations_list:
        now = datetime.utcnow()
        
        if not station.active:
            status = "inactive"
        elif station.last_data_time is None:
            status = "no_data"
        elif station.last_data_time < (now - timedelta(hours=24)):
            status = "stale"
        elif station.last_data_time < (now - timedelta(hours=1)):
            status = "warning"
        else:
            status = "healthy"
        
        time_since_last_data = None
        if station.last_data_time:
            time_since_last_data = (now - station.last_data_time).total_seconds()
        
        health_status.append({
            "station_id": station.id,
            "station_name": station.name,
            "status": status,
            "last_data_time": station.last_data_time,
            "time_since_last_data_seconds": time_since_last_data
        })
    
    # Group by status
    status_summary = {
        "healthy": len([s for s in health_status if s["status"] == "healthy"]),
        "warning": len([s for s in health_status if s["status"] == "warning"]),
        "stale": len([s for s in health_status if s["status"] == "stale"]),
        "no_data": len([s for s in health_status if s["status"] == "no_data"]),
        "inactive": len([s for s in health_status if s["status"] == "inactive"])
    }
    
    return {
        "summary": status_summary,
        "timestamp": now.isoformat(),
        "stations": health_status
    }
