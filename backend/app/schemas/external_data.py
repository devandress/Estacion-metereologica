from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ExternalSourceTypeEnum(str, Enum):
    """Supported external data sources"""
    OPENWEATHERMAP = "openweathermap"
    AEMET = "aemet"
    WEATHERAPI = "weatherapi"
    IPMA = "ipma"
    SMHI = "smhi"
    CUSTOM = "custom"


# External Data Source Schemas
class ExternalDataSourceCreate(BaseModel):
    name: str
    source_type: ExternalSourceTypeEnum
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    field_mapping: Dict[str, str] = Field(default_factory=dict)
    sync_interval_minutes: int = 30
    active: bool = True


class ExternalDataSourceUpdate(BaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    field_mapping: Optional[Dict[str, str]] = None
    sync_interval_minutes: Optional[int] = None
    active: Optional[bool] = None


class ExternalDataSourceResponse(BaseModel):
    id: str
    name: str
    source_type: ExternalSourceTypeEnum
    api_url: Optional[str]
    active: bool
    last_sync: Optional[datetime]
    sync_interval_minutes: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# External Data Record Schemas
class ExternalDataRecordCreate(BaseModel):
    source_id: str
    station_id: Optional[str] = None
    raw_data: Dict[str, Any]
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source_timestamp: Optional[datetime] = None


class ExternalDataRecordResponse(BaseModel):
    id: int
    source_id: str
    station_id: Optional[str]
    location_name: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    normalized_data: Dict[str, Any]
    processed: bool
    received_at: datetime
    source_timestamp: Optional[datetime]
    error_message: Optional[str]
    
    class Config:
        from_attributes = True


class ExternalDataRecordListResponse(BaseModel):
    total: int
    records: list[ExternalDataRecordResponse]


# Public Share Link Schemas
class PublicShareLinkCreate(BaseModel):
    station_id: str
    description: Optional[str] = None
    can_view_data: bool = True
    can_view_current: bool = True
    can_view_history: bool = True
    can_download: bool = False
    expires_in_days: Optional[int] = None
    max_accesses: Optional[int] = None


class PublicShareLinkResponse(BaseModel):
    id: str
    token: str
    station_id: str
    description: Optional[str]
    active: bool
    created_at: datetime
    expires_at: Optional[datetime]
    access_count: int
    can_view_data: bool
    can_view_current: bool
    can_view_history: bool
    can_download: bool
    
    class Config:
        from_attributes = True


class PublicShareLinkUpdate(BaseModel):
    active: Optional[bool] = None
    expires_at: Optional[datetime] = None
    max_accesses: Optional[int] = None


# Data access via shared link
class PublicStationData(BaseModel):
    station_id: str
    name: str
    location: str
    latitude: float
    longitude: float
    last_update: Optional[datetime]
    current_data: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True
