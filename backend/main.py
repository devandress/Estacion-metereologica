from flask import Flask, jsonify, request, render_template_string
from flask_cors import CORS
import logging
import os
from datetime import datetime
from pathlib import Path

from app.core.config import settings
from app.core.database import init_db, get_db
from app.models.station import WeatherStation, WeatherData
from app.api import stations_routes, data_routes

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Database init
init_db()

# Register blueprints
app.register_blueprint(stations_routes.bp)
app.register_blueprint(data_routes.bp)

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "service": "weather-api"}), 200

@app.route("/", methods=["GET"])
def index():
    """Serve dashboard"""
    frontend_path = Path(__file__).parent.parent / "frontend" / "index.html"
    if frontend_path.exists():
        with open(frontend_path) as f:
            return f.read()
    return jsonify({"message": "Weather Station API. Go to /api/stations"})

@app.errorhandler(404)
def not_found(e):
    return jsonify({"detail": "Not found"}), 404

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal error: {e}")
    return jsonify({"detail": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
main_file_dir = Path(__file__).parent          # /app/backend or ./backend  
app_root = main_file_dir.parent                # /app or .
frontend_dir = app_root / "frontend"

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
    app_root = main_file_dir.parent
    index_file = app_root / "frontend" / "index.html"
    
    if index_file.exists():
        logger.info(f"✅ Serving index.html")
        return FileResponse(str(index_file), media_type="text/html")
    
    # Fallback to API info
    logger.warning(f"index.html not found at {index_file}")
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
