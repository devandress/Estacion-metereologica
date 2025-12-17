from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
import os
from pathlib import Path

from app.core.config import settings
from app.core.database import init_db
from app.api import stations, external_data, public_access

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(stations.router)
app.include_router(external_data.router)
app.include_router(public_access.router)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Weather Station API")
    init_db()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "weather-api"}

# Mount static files (frontend)
# In Heroku, the working directory is /app
# The frontend folder is at /app/frontend relative to /app
# When running from backend/main.py, we need to go up to parent, then to frontend
import sys
current_dir = Path(__file__).parent  # /app/backend/app
app_root = current_dir.parent.parent  # /app
frontend_dir = app_root / "frontend"

logger.info(f"App root: {app_root}")
logger.info(f"Frontend dir: {frontend_dir}")
logger.info(f"Frontend exists: {frontend_dir.exists()}")

if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir / "js")), name="js")
    logger.info(f"Static files mounted from {frontend_dir}")
else:
    logger.warning(f"Frontend directory not found at {frontend_dir}")

@app.get("/")
async def root():
    """Serve frontend index.html"""
    current_dir = Path(__file__).parent
    app_root = current_dir.parent.parent
    index_file = app_root / "frontend" / "index.html"
    
    logger.info(f"Attempting to serve: {index_file}")
    logger.info(f"File exists: {index_file.exists()}")
    
    if index_file.exists():
        logger.info(f"✅ Serving index.html from {index_file}")
        return FileResponse(str(index_file), media_type="text/html")
    
    # Fallback to API info
    logger.warning("index.html not found, serving API info")
    return {
        "message": "Weather Station API",
        "docs": "/docs",
        "version": settings.API_VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD
    )
