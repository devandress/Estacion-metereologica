from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path

# SQLite por defecto (ligero), soporta PostgreSQL si se desea
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{Path(__file__).parent.parent.parent}/weather.db"
)

# Para PostgreSQL descomentar:
# DATABASE_URL = "postgresql://user:password@localhost/weather_db"

# Fix para Heroku
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    pool_pre_ping=True if "postgresql" in DATABASE_URL else False,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency for getting DB session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)

def init_db():
    """Create all database tables - safely handles existing tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.warning(f"Database initialization warning: {str(e)}")
        # This is ok - tables might already exist
        pass
