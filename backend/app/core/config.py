import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://user:password@localhost/weather_db"
    
    # API
    API_TITLE: str = "Weather Station API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "Real-time weather station management system"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False
    
    # Security
    CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:8080", "*"]
    
    # Data retention (days)
    DATA_RETENTION_DAYS: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
