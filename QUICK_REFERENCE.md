# 🎯 Quick Reference - Weather Station App

## 🚀 Start
```bash
cd /home/andy/weather_app
./quickstart.sh
```

## 🌐 Access Points
| What | URL |
|------|-----|
| Web App | http://localhost:8080 |
| API Docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

## 📍 Features
```
✅ Dashboard          - See all stations
✅ Map               - Interactive Leaflet.js map
✅ External Data     - Connect OpenWeatherMap, AEMET, etc.
✅ Public Sharing    - Share data with unique tokens
✅ Statistics        - Temperature, humidity, wind
✅ Health Check      - Monitor station status
```

## 🔌 API Endpoints Cheat Sheet

### Stations
```
GET    /api/stations/                    List all
POST   /api/stations/                    Create
GET    /api/stations/{id}                Get one
PUT    /api/stations/{id}                Update
DELETE /api/stations/{id}                Delete
```

### Statistics
```
GET    /api/stations/stats/overview      System stats
GET    /api/stations/{id}/stats          Station stats
GET    /api/stations/{id}/health         Station health
GET    /api/stations/batch/health        All stations health
```

### External Data
```
POST   /api/external/sources             Create source
GET    /api/external/sources             List sources
POST   /api/external/data                Ingest data
GET    /api/external/data                List records
```

### Public Access
```
POST   /api/public/share-links           Create share link
GET    /api/public/share-links           List links
GET    /api/public/station/{token}       Get station info
GET    /api/public/station/{token}/current     Get current data
GET    /api/public/station/{token}/history    Get history
GET    /api/public/station/{token}/export     Export JSON/CSV
```

## 📝 Create External Source (Example)
```bash
curl -X POST http://localhost:8000/api/external/sources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenWeatherMap",
    "source_type": "openweathermap",
    "api_key": "your_key",
    "field_mapping": {
      "temperature": "main.temp",
      "humidity": "main.humidity"
    }
  }'
```

## 🔗 Create Public Share Link
```bash
curl -X POST http://localhost:8000/api/public/share-links \
  -H "Content-Type: application/json" \
  -d '{
    "station_id": "station_uuid",
    "expires_in_days": 30,
    "can_download": true
  }'
```

## 🧪 Test Everything
```bash
bash api_test.sh
```

## 📊 Models

### WeatherStation
```
id, name, location, latitude, longitude, 
active, last_data_time, description, created_at
```

### WeatherData
```
id, station_id, temperature, humidity,
wind_speed_ms, wind_direction_degrees,
total_rainfall, timestamp
```

### ExternalDataSource
```
id, name, source_type, api_key, api_url,
field_mapping (JSON), active, last_sync
```

### ExternalDataRecord
```
id, source_id, station_id, raw_data (JSON),
normalized_data (JSON), processed, error_message
```

### PublicShareLink
```
id, station_id, token, can_view_data,
can_view_current, can_view_history,
can_download, active, expires_at, access_count
```

## 🎨 Frontend Tabs
```
📊 Dashboard     - Cards with station data
📍 Mapa          - Interactive map
🏢 Estaciones    - Management table
+ Nueva          - Create station
📤 Exportar      - Export selected data
```

## 🔐 Permissions (Share Links)
```
can_view_data       - Allow viewing
can_view_current    - View latest reading
can_view_history    - View historical data
can_download        - Export as JSON/CSV
```

## 💻 Tech Stack
```
Backend:   FastAPI, SQLAlchemy, PostgreSQL
Frontend:  HTML5, JavaScript, Tailwind, Leaflet.js
DevOps:    Docker, Nginx, Systemd
```

## 🐛 Troubleshooting
```bash
# Check if API is running
curl http://localhost:8000/health

# Check database
psql -U weather_user -d weather_db

# View logs
tail -f /tmp/frontend.log

# Restart
killall python3
./quickstart.sh
```

## 📚 Documentation
- **NUEVAS_FUNCIONALIDADES.md** - Full feature guide
- **ARQUITECTURA_MEJORADA.md** - System design
- **IMPLEMENTACION_COMPLETADA.md** - Implementation summary
- **http://localhost:8000/docs** - Interactive Swagger

## 🚀 Deploy to Raspberry Pi
```bash
scp -r . pi@192.168.1.100:/home/pi/weather_app
ssh pi@192.168.1.100
cd weather_app
chmod +x setup_raspberry.sh
sudo ./setup_raspberry.sh
```

## 📊 Health Status Codes
```
healthy   ✅ Data < 1 hour
warning   ⚠️  Data 1-24 hours
stale     🔴 Data > 24 hours
no_data   ❌ Never reported
inactive  ⏸️  Disabled
```

## 🔄 Data Flow
```
External API → POST /external/data → Store in DB → 
Dashboard → Map → Export → Public Share
```

## 🎯 Common Tasks

### Add a new station
```bash
curl -X POST http://localhost:8000/api/stations/ \
  -d '{"name":"Station","location":"City","latitude":0,"longitude":0}'
```

### Get statistics
```bash
curl http://localhost:8000/api/stations/{id}/stats?hours=24
```

### Check health
```bash
curl http://localhost:8000/api/stations/batch/health | jq '.summary'
```

### Share data
```bash
# Create link
TOKEN=$(curl -X POST http://localhost:8000/api/public/share-links \
  -d '{"station_id":"xyz"}' | jq -r '.token')

# Access publicly
curl http://localhost:8000/api/public/station/$TOKEN/current
```

---

**Need more help?** Check documentation or run `bash api_test.sh`
