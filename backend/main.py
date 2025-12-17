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
# Get the root directory: /app (in Heroku) or the project root (locally)
main_file_dir = Path(__file__).parent  # /app/backend/app or ./backend/app
backend_dir = main_file_dir.parent     # /app/backend or ./backend
app_root = backend_dir.parent          # /app or .
frontend_dir = app_root / "frontend"

logger.info(f"Main file: {Path(__file__)}")
logger.info(f"App root: {app_root}")
logger.info(f"Frontend dir: {frontend_dir}")
logger.info(f"Frontend exists: {frontend_dir.exists()}")

if frontend_dir.exists():
    js_dir = frontend_dir / "js"
    if js_dir.exists():
        app.mount("/static", StaticFiles(directory=str(js_dir)), name="js")
        logger.info(f"✅ Static JS files mounted")

@app.get("/")
async def root():
    """Serve frontend index.html"""
    main_file_dir = Path(__file__).parent
    backend_dir = main_file_dir.parent
    app_root = backend_dir.parent
    index_file = app_root / "frontend" / "index.html"
    
    logger.info(f"Serving root: {index_file}")
    logger.info(f"File exists: {index_file.exists()}")
    
    if index_file.exists():
        logger.info(f"✅ Serving index.html")
        return FileResponse(str(index_file), media_type="text/html")
    
    # Fallback to API info
    logger.warning("index.html not found")
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
