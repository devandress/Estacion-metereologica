from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from datetime import datetime, timedelta
from typing import Optional, List
import uuid
import secrets
import logging

from app.core.database import get_db
from app.models.station import WeatherStation, WeatherData
from app.models.external_data import PublicShareLink
from app.schemas.external_data import (
    PublicShareLinkCreate, PublicShareLinkResponse, PublicShareLinkUpdate, PublicStationData
)
from app.schemas.station import WeatherDataResponse

router = APIRouter(prefix="/api/public", tags=["public-access"])
logger = logging.getLogger(__name__)


def verify_share_token(token: str, db: Session) -> PublicShareLink:
    """Verify and return share link if valid"""
    link = db.query(PublicShareLink).filter(
        PublicShareLink.token == token,
        PublicShareLink.active == True
    ).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Invalid or expired share link")
    
    # Check expiration
    if link.expires_at and link.expires_at < datetime.utcnow():
        raise HTTPException(status_code=403, detail="Share link has expired")
    
    # Check access limit
    if link.max_accesses and link.access_count >= link.max_accesses:
        raise HTTPException(status_code=403, detail="Share link access limit reached")
    
    return link


def increment_access_count(link: PublicShareLink, db: Session):
    """Increment access count and update last accessed time"""
    link.access_count += 1
    link.last_accessed = datetime.utcnow()
    db.commit()


# ===== SHARE LINK MANAGEMENT (for station owners) =====

@router.post("/share-links", response_model=PublicShareLinkResponse, status_code=201)
def create_share_link(
    share: PublicShareLinkCreate,
    db: Session = Depends(get_db)
):
    """
    Create a public share link for a station.
    
    This generates a unique token that can be shared to allow public access
    to specific station data without exposing the full API.
    """
    
    # Verify station exists
    station = db.query(WeatherStation).filter(
        WeatherStation.id == share.station_id
    ).first()
    
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    
    # Generate unique token
    token = secrets.token_urlsafe(48)
    
    # Calculate expiration if provided
    expires_at = None
    if share.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=share.expires_in_days)
    
    link = PublicShareLink(
        id=str(uuid.uuid4()),
        station_id=share.station_id,
        token=token,
        description=share.description,
        can_view_data=share.can_view_data,
        can_view_current=share.can_view_current,
        can_view_history=share.can_view_history,
        can_download=share.can_download,
        expires_at=expires_at,
        max_accesses=share.max_accesses
    )
    
    db.add(link)
    db.commit()
    db.refresh(link)
    
    logger.info(f"Created share link {token} for station {share.station_id}")
    return link


@router.get("/share-links", response_model=List[PublicShareLinkResponse])
def list_share_links(
    station_id: str = Query(None),
    active: bool = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """List share links for stations"""
    query = db.query(PublicShareLink)
    
    if station_id:
        query = query.filter(PublicShareLink.station_id == station_id)
    
    if active is not None:
        query = query.filter(PublicShareLink.active == active)
    
    links = query.offset(skip).limit(limit).all()
    return links


@router.get("/share-links/{link_id}", response_model=PublicShareLinkResponse)
def get_share_link(link_id: str, db: Session = Depends(get_db)):
    """Get share link details"""
    link = db.query(PublicShareLink).filter(
        PublicShareLink.id == link_id
    ).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    return link


@router.put("/share-links/{link_id}", response_model=PublicShareLinkResponse)
def update_share_link(
    link_id: str,
    update: PublicShareLinkUpdate,
    db: Session = Depends(get_db)
):
    """Update share link configuration"""
    link = db.query(PublicShareLink).filter(
        PublicShareLink.id == link_id
    ).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    update_data = update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(link, field, value)
    
    db.commit()
    db.refresh(link)
    return link


@router.delete("/share-links/{link_id}", status_code=204)
def delete_share_link(link_id: str, db: Session = Depends(get_db)):
    """Delete share link"""
    link = db.query(PublicShareLink).filter(
        PublicShareLink.id == link_id
    ).first()
    
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    
    db.delete(link)
    db.commit()


# ===== PUBLIC DATA ACCESS (using share tokens) =====

@router.get("/station/{token}")
def get_public_station_info(token: str, db: Session = Depends(get_db)):
    """
    Get public station information using share token.
    
    Returns station metadata and permissions.
    """
    link = verify_share_token(token, db)
    increment_access_count(link, db)
    
    station = link.station
    
    return {
        "id": station.id,
        "name": station.name,
        "location": station.location,
        "latitude": station.latitude,
        "longitude": station.longitude,
        "description": station.description,
        "permissions": {
            "can_view_current": link.can_view_current,
            "can_view_history": link.can_view_history,
            "can_download": link.can_download
        }
    }


@router.get("/station/{token}/current")
def get_public_current_data(token: str, db: Session = Depends(get_db)):
    """Get current (latest) weather data for shared station"""
    link = verify_share_token(token, db)
    
    if not link.can_view_current:
        raise HTTPException(status_code=403, detail="Not allowed to view current data")
    
    increment_access_count(link, db)
    
    # Get latest data for station
    latest_data = db.query(WeatherData).filter(
        WeatherData.station_id == link.station_id
    ).order_by(desc(WeatherData.timestamp)).first()
    
    if not latest_data:
        raise HTTPException(status_code=404, detail="No data available")
    
    return {
        "station_id": link.station_id,
        "station_name": link.station.name,
        "timestamp": latest_data.timestamp,
        "data": {
            "temperature": latest_data.temperature,
            "humidity": latest_data.humidity,
            "wind_speed_ms": latest_data.wind_speed_ms,
            "wind_direction_degrees": latest_data.wind_direction_degrees,
            "total_rainfall": latest_data.total_rainfall,
            "dew_point": latest_data.dew_point
        }
    }


@router.get("/station/{token}/history")
def get_public_history(
    token: str,
    hours: int = Query(24, ge=1, le=720),
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db)
):
    """Get historical weather data for shared station"""
    link = verify_share_token(token, db)
    
    if not link.can_view_history:
        raise HTTPException(status_code=403, detail="Not allowed to view history")
    
    increment_access_count(link, db)
    
    # Calculate time range
    since = datetime.utcnow() - timedelta(hours=hours)
    
    # Get data
    records = db.query(WeatherData).filter(
        and_(
            WeatherData.station_id == link.station_id,
            WeatherData.timestamp >= since
        )
    ).order_by(desc(WeatherData.timestamp)).limit(limit).all()
    
    return {
        "station_id": link.station_id,
        "station_name": link.station.name,
        "period_hours": hours,
        "record_count": len(records),
        "data": [
            {
                "timestamp": record.timestamp,
                "temperature": record.temperature,
                "humidity": record.humidity,
                "wind_speed_ms": record.wind_speed_ms,
                "wind_direction_degrees": record.wind_direction_degrees,
                "total_rainfall": record.total_rainfall,
                "dew_point": record.dew_point
            }
            for record in records
        ]
    }


@router.get("/station/{token}/export")
def get_public_export(
    token: str,
    format: str = Query("json", regex="^(json|csv)$"),
    hours: int = Query(24, ge=1, le=720),
    db: Session = Depends(get_db)
):
    """Export station data in JSON or CSV format"""
    link = verify_share_token(token, db)
    
    if not link.can_download:
        raise HTTPException(status_code=403, detail="Not allowed to download data")
    
    increment_access_count(link, db)
    
    # Calculate time range
    since = datetime.utcnow() - timedelta(hours=hours)
    
    # Get data
    records = db.query(WeatherData).filter(
        and_(
            WeatherData.station_id == link.station_id,
            WeatherData.timestamp >= since
        )
    ).order_by(WeatherData.timestamp).all()
    
    if format == "json":
        return {
            "station": {
                "id": link.station_id,
                "name": link.station.name,
                "location": link.station.location,
                "latitude": link.station.latitude,
                "longitude": link.station.longitude
            },
            "export_date": datetime.utcnow().isoformat(),
            "period_hours": hours,
            "records": [
                {
                    "timestamp": record.timestamp.isoformat(),
                    "temperature": record.temperature,
                    "humidity": record.humidity,
                    "wind_speed_ms": record.wind_speed_ms,
                    "wind_direction_degrees": record.wind_direction_degrees,
                    "total_rainfall": record.total_rainfall,
                    "dew_point": record.dew_point
                }
                for record in records
            ]
        }
    
    # CSV format
    elif format == "csv":
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow([
            "timestamp", "temperature", "humidity", "wind_speed_ms",
            "wind_direction_degrees", "total_rainfall", "dew_point"
        ])
        
        # Data rows
        for record in records:
            writer.writerow([
                record.timestamp.isoformat(),
                record.temperature,
                record.humidity,
                record.wind_speed_ms,
                record.wind_direction_degrees,
                record.total_rainfall,
                record.dew_point
            ])
        
        return {
            "csv": output.getvalue(),
            "filename": f"{link.station.name.replace(' ', '_')}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        }
