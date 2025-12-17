from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from typing import List
import uuid
import json
import logging

from app.core.database import get_db
from app.models.external_data import ExternalDataSourceModel, ExternalDataRecord
from app.models.station import WeatherStation, WeatherData
from app.schemas.external_data import (
    ExternalDataSourceCreate, ExternalDataSourceUpdate, ExternalDataSourceResponse,
    ExternalDataRecordCreate, ExternalDataRecordResponse, ExternalDataRecordListResponse
)

router = APIRouter(prefix="/api/external", tags=["external-data"])
logger = logging.getLogger(__name__)


def transform_external_data(raw_data: dict, field_mapping: dict) -> dict:
    """Transform external data using field mapping"""
    normalized = {}
    
    for target_field, source_field in field_mapping.items():
        # Support nested fields with dot notation
        value = raw_data
        for part in source_field.split('.'):
            if isinstance(value, dict) and part in value:
                value = value[part]
            else:
                value = None
                break
        
        if value is not None:
            normalized[target_field] = value
    
    return normalized


# ===== EXTERNAL SOURCES =====

@router.post("/sources", response_model=ExternalDataSourceResponse, status_code=201)
def create_external_source(
    source: ExternalDataSourceCreate,
    db: Session = Depends(get_db)
):
    """Create a new external data source"""
    db_source = ExternalDataSourceModel(
        id=str(uuid.uuid4()),
        name=source.name,
        source_type=source.source_type,
        api_key=source.api_key,
        api_url=source.api_url,
        field_mapping=source.field_mapping,
        sync_interval_minutes=source.sync_interval_minutes,
        active=source.active
    )
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    return db_source


@router.get("/sources", response_model=List[ExternalDataSourceResponse])
def list_external_sources(
    active: bool = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """List external data sources"""
    query = db.query(ExternalDataSourceModel)
    
    if active is not None:
        query = query.filter(ExternalDataSourceModel.active == active)
    
    sources = query.offset(skip).limit(limit).all()
    return sources


@router.get("/sources/{source_id}", response_model=ExternalDataSourceResponse)
def get_external_source(source_id: str, db: Session = Depends(get_db)):
    """Get external data source details"""
    source = db.query(ExternalDataSourceModel).filter(
        ExternalDataSourceModel.id == source_id
    ).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    return source


@router.put("/sources/{source_id}", response_model=ExternalDataSourceResponse)
def update_external_source(
    source_id: str,
    update: ExternalDataSourceUpdate,
    db: Session = Depends(get_db)
):
    """Update external data source"""
    source = db.query(ExternalDataSourceModel).filter(
        ExternalDataSourceModel.id == source_id
    ).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    update_data = update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(source, field, value)
    
    db.commit()
    db.refresh(source)
    return source


@router.delete("/sources/{source_id}", status_code=204)
def delete_external_source(source_id: str, db: Session = Depends(get_db)):
    """Delete external data source"""
    source = db.query(ExternalDataSourceModel).filter(
        ExternalDataSourceModel.id == source_id
    ).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    db.delete(source)
    db.commit()


# ===== EXTERNAL DATA RECORDS =====

@router.post("/data", response_model=ExternalDataRecordResponse, status_code=201)
def ingest_external_data(
    record: ExternalDataRecordCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Ingest external data from a source.
    
    This endpoint receives data from external providers,
    stores it, and processes it in the background.
    """
    
    # Verify source exists
    source = db.query(ExternalDataSourceModel).filter(
        ExternalDataSourceModel.id == record.source_id
    ).first()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    
    # Transform data using field mapping
    normalized_data = transform_external_data(record.raw_data, source.field_mapping)
    
    # Create record
    db_record = ExternalDataRecord(
        source_id=record.source_id,
        station_id=record.station_id,
        raw_data=record.raw_data,
        normalized_data=normalized_data,
        location_name=record.location_name,
        latitude=record.latitude,
        longitude=record.longitude,
        source_timestamp=record.source_timestamp or datetime.utcnow()
    )
    
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    
    # Process in background
    background_tasks.add_task(
        process_external_data,
        record_id=db_record.id,
        db_session=db
    )
    
    # Update source's last_sync time
    source.last_sync = datetime.utcnow()
    db.commit()
    
    return db_record


def process_external_data(record_id: int, db_session: Session):
    """Process external data record and store in WeatherData if applicable"""
    try:
        record = db_session.query(ExternalDataRecord).filter(
            ExternalDataRecord.id == record_id
        ).first()
        
        if not record or record.processed:
            return
        
        # If station is mapped, store as weather data
        if record.station_id:
            station = db_session.query(WeatherStation).filter(
                WeatherStation.id == record.station_id
            ).first()
            
            if station:
                data = record.normalized_data
                
                weather_data = WeatherData(
                    station_id=record.station_id,
                    temperature=data.get('temperature'),
                    humidity=data.get('humidity'),
                    dew_point=data.get('dew_point'),
                    wind_speed_ms=data.get('wind_speed_ms', 0),
                    wind_speed_mph=data.get('wind_speed_mph'),
                    wind_gust_ms=data.get('wind_gust_ms', 0),
                    wind_gust_mph=data.get('wind_gust_mph'),
                    wind_direction_degrees=data.get('wind_direction_degrees', 0),
                    wind_direction_name=data.get('wind_direction_name'),
                    total_rainfall=data.get('total_rainfall', 0),
                    total_tips=data.get('total_tips', 0),
                    rain_rate_mm_per_hour=data.get('rain_rate_mm_per_hour', 0),
                    rain_rate_in_per_hour=data.get('rain_rate_in_per_hour'),
                    timestamp=record.source_timestamp
                )
                
                db_session.add(weather_data)
                
                # Update station's last_data_time
                station.last_data_time = datetime.utcnow()
        
        record.processed = True
        db_session.commit()
        logger.info(f"Successfully processed external data record {record_id}")
        
    except Exception as e:
        logger.error(f"Error processing external data {record_id}: {str(e)}")
        record = db_session.query(ExternalDataRecord).filter(
            ExternalDataRecord.id == record_id
        ).first()
        if record:
            record.error_message = str(e)
            db_session.commit()


@router.get("/data", response_model=ExternalDataRecordListResponse)
def list_external_records(
    source_id: str = Query(None),
    station_id: str = Query(None),
    processed: bool = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List external data records"""
    query = db.query(ExternalDataRecord)
    
    if source_id:
        query = query.filter(ExternalDataRecord.source_id == source_id)
    
    if station_id:
        query = query.filter(ExternalDataRecord.station_id == station_id)
    
    if processed is not None:
        query = query.filter(ExternalDataRecord.processed == processed)
    
    total = query.count()
    records = query.order_by(desc(ExternalDataRecord.received_at)).offset(skip).limit(limit).all()
    
    return ExternalDataRecordListResponse(total=total, records=records)


@router.get("/data/{record_id}", response_model=ExternalDataRecordResponse)
def get_external_record(record_id: int, db: Session = Depends(get_db)):
    """Get external data record"""
    record = db.query(ExternalDataRecord).filter(
        ExternalDataRecord.id == record_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    return record


@router.delete("/data/{record_id}", status_code=204)
def delete_external_record(record_id: int, db: Session = Depends(get_db)):
    """Delete external data record"""
    record = db.query(ExternalDataRecord).filter(
        ExternalDataRecord.id == record_id
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    db.delete(record)
    db.commit()
