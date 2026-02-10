import os

class Settings:
    """Configuración simple (sin Pydantic)"""
    
    # Database - SQLite por defecto (muy ligero)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///weather.db"
    )
    
    # API
    API_TITLE: str = "Weather Station API"
    API_VERSION: str = "2.0"
    API_DESCRIPTION: str = "Estación Meteorológica - Sistema Ligero"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", 8000))
    
    # CORS
    CORS_ORIGINS: list = ["*"]
    
    # Retención de datos (días)
    DATA_RETENTION_DAYS: int = 30

settings = Settings()
