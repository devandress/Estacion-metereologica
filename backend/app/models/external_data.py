from sqlalchemy import Column, String, Float, DateTime, Boolean, Index, Integer, JSON, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum
from app.core.database import Base


class ExternalSourceType(str, Enum):
    """Supported external data sources"""
    OPENWEATHERMAP = "openweathermap"
    AEMET = "aemet"
    WEATHERAPI = "weatherapi"
    IPMA = "ipma"  # Portugal
    SMHI = "smhi"  # Sweden
    CUSTOM = "custom"


class ExternalDataSourceModel(Base):
    """External data source configuration"""
    __tablename__ = "external_data_sources"
    
    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    source_type = Column(SQLEnum(ExternalSourceType), nullable=False, index=True)
    
    # API Configuration
    api_key = Column(String(255), nullable=True)
    api_url = Column(String(255), nullable=True)
    
    # Mapping and transformation
    field_mapping = Column(JSON, default={}, nullable=False)  # Maps external fields to our schema
    
    # Status and scheduling
    active = Column(Boolean, default=True, index=True)
    last_sync = Column(DateTime, nullable=True)
    sync_interval_minutes = Column(Integer, default=30, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    external_data_records = relationship("ExternalDataRecord", back_populates="source", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_source_type_active', 'source_type', 'active'),
    )


class ExternalDataRecord(Base):
    """Individual record from external data source"""
    __tablename__ = "external_data_records"
    
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(String(36), ForeignKey("external_data_sources.id"), index=True, nullable=False)
    
    # Link to station (if already mapped)
    station_id = Column(String(36), ForeignKey("weather_stations.id"), nullable=True, index=True)
    
    # Raw data (store original response)
    raw_data = Column(JSON, nullable=False)
    
    # Normalized/transformed data
    normalized_data = Column(JSON, nullable=False)
    
    # Location reference (if no station mapping yet)
    location_name = Column(String(200), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Timestamp from source
    source_timestamp = Column(DateTime, nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow, index=True)
    processed = Column(Boolean, default=False, index=True)
    
    # Error tracking
    error_message = Column(String(500), nullable=True)
    
    # Relationships
    source = relationship("ExternalDataSourceModel", back_populates="external_data_records")
    station = relationship("WeatherStation", backref="external_data_records")
    
    __table_args__ = (
        Index('idx_data_source_station', 'source_id', 'station_id'),
        Index('idx_data_processed_received', 'processed', 'received_at'),
    )


class PublicShareLink(Base):
    """Public share link for accessing stations/data without full API access"""
    __tablename__ = "public_share_links"
    
    id = Column(String(36), primary_key=True, index=True)
    station_id = Column(String(36), ForeignKey("weather_stations.id"), nullable=False, index=True)
    
    # Share configuration
    token = Column(String(64), unique=True, index=True, nullable=False)
    description = Column(String(200), nullable=True)
    
    # Permissions
    can_view_data = Column(Boolean, default=True)
    can_view_current = Column(Boolean, default=True)
    can_view_history = Column(Boolean, default=True)
    can_download = Column(Boolean, default=False)
    
    # Time-based access
    active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=True, index=True)
    last_accessed = Column(DateTime, nullable=True)
    access_count = Column(Integer, default=0)
    
    # Restrictions
    max_accesses = Column(Integer, nullable=True)  # None = unlimited
    
    # Relationships
    station = relationship("WeatherStation", backref="share_links")
    
    __table_args__ = (
        Index('idx_share_token_active', 'token', 'active'),
    )
