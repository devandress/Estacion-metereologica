from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import logging
from pathlib import Path

from app.core.config import settings
from app.core.database import init_db
# Importar modelos para que Base.metadata los registre antes de init_db()
from app.models.station import WeatherStation, WeatherData  # noqa: F401
from app.api import stations_routes, data_routes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False
app.url_map.strict_slashes = False

CORS(app, resources={r"/api/*": {"origins": "*"}})

# Crear tablas al arrancar
init_db()

app.register_blueprint(stations_routes.bp)
app.register_blueprint(data_routes.bp)  


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "service": "weather-api"}), 200


# Detecta la carpeta frontend — prueba múltiples rutas
_here = Path(__file__).parent
FRONTEND_DIR = next(
    (p for p in [
        _here / "frontend",           # Docker: /app/frontend
        _here.parent / "frontend",    # Local dev: weather_app/frontend
        Path("/app/frontend"),        # Fallback absoluto Docker
    ] if p.exists()),
    None
)
logger.info(f"Frontend dir: {FRONTEND_DIR}")


@app.route("/", methods=["GET"])
def index():
    if FRONTEND_DIR and FRONTEND_DIR.exists():
        return send_from_directory(FRONTEND_DIR, "index.html")
    return jsonify({"message": "Weather Station API", "endpoints": "/api/stations", "frontend_dir": str(FRONTEND_DIR)})


@app.route("/js/<path:filename>", methods=["GET"])
def frontend_js(filename):
    if FRONTEND_DIR:
        return send_from_directory(FRONTEND_DIR / "js", filename)
    return jsonify({"detail": "Not found"}), 404


@app.errorhandler(404)
def not_found(e):
    return jsonify({"detail": "Not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal error: {e}")
    return jsonify({"detail": "Internal server error"}), 500


if __name__ == "__main__":
    app.run(host=settings.HOST, port=settings.PORT, debug=False)
