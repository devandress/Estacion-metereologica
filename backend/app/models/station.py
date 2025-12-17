from sqlalchemy import Column, String, Float, DateTime, Boolean, Index, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class WeatherStation(Base):
    __tablename__ = "weather_stations"
    
    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    location = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Status
    active = Column(Boolean, default=True, index=True)
    last_data_time = Column(DateTime, nullable=True)
    
    # Metadata
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    data_points = relationship("WeatherData", back_populates="station", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index('idx_station_active_updated', 'active', 'updated_at'),
        Index('idx_station_name', 'name'),
    )

class WeatherData(Base):
    __tablename__ = "weather_data"
    
    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(String(36), ForeignKey("weather_stations.id"), index=True, nullable=False)
    
    # Temperature and humidity
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    dew_point = Column(Float, nullable=True)
    
    # Wind data
    wind_speed_ms = Column(Float, nullable=False)
    wind_speed_mph = Column(Float, nullable=True)
    wind_gust_ms = Column(Float, nullable=False)
    wind_gust_mph = Column(Float, nullable=True)
    wind_direction_degrees = Column(Float, nullable=False)
    wind_direction_name = Column(String(3), nullable=True)
    
    # Rain data
    total_rainfall = Column(Float, nullable=False, default=0.0)
    total_tips = Column(Integer, nullable=False, default=0)
    rain_rate_mm_per_hour = Column(Float, nullable=False, default=0.0)
    rain_rate_in_per_hour = Column(Float, nullable=True)
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    station = relationship("WeatherStation", back_populates="data_points")
    
    __table_args__ = (
        Index('idx_data_station_timestamp', 'station_id', 'timestamp'),
        Index('idx_data_timestamp', 'timestamp'),
    )
