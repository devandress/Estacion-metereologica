from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class StationCreate(BaseModel):
    id: str = Field(..., description="Unique station ID")
    name: str = Field(..., min_length=1, max_length=100)
    location: str = Field(..., min_length=1)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    description: Optional[str] = None

class StationUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    active: Optional[bool] = None

class StationResponse(BaseModel):
    id: str
    name: str
    location: str
    latitude: float
    longitude: float
    active: bool
    last_data_time: Optional[datetime]
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class WeatherDataCreate(BaseModel):
    temperature: float
    humidity: float = Field(..., ge=0, le=100)
    dew_point: Optional[float] = None
    wind_speed_ms: Optional[float] = 0.0
    wind_speed_mph: Optional[float] = None
    wind_gust_ms: Optional[float] = 0.0
    wind_gust_mph: Optional[float] = None
    wind_direction_degrees: Optional[float] = 0.0
    wind_direction_name: Optional[str] = None
    total_rainfall: Optional[float] = 0.0
    total_tips: Optional[int] = 0
    rain_rate_mm_per_hour: Optional[float] = 0.0
    rain_rate_in_per_hour: Optional[float] = None

class WeatherDataResponse(BaseModel):
    id: int
    station_id: str
    temperature: float
    humidity: float
    dew_point: Optional[float]
    wind_speed_ms: float
    wind_gust_ms: float
    wind_direction_degrees: float
    wind_direction_name: Optional[str]
    total_rainfall: float
    total_tips: int
    rain_rate_mm_per_hour: float
    timestamp: datetime
    
    class Config:
        from_attributes = True

class StationDetailResponse(StationResponse):
    latest_data: Optional[WeatherDataResponse] = None
