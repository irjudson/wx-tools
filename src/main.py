from fastapi import FastAPI, Depends, HTTPException, Form, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager
import tempfile
import shutil
import logging
import secrets
from src.config import get_settings
from src.database import get_db, SessionLocal
from src.schemas import StationUpload, ImportPathRequest, WeatherReadingResponse, AnalysisRequest
from src.services.ingestion import store_weather_reading
from src.services.csv_import import import_csv_data
from src.services.query import get_latest_reading, get_readings, get_database_stats
from src.services.config import get_mqtt_config
from src.services.mqtt_publisher import MQTTPublisher, MQTTConfig
from src.analysis.solar import SolarAnalyzer
from src.analysis.wind import WindAnalyzer

# Configure logging
settings = get_settings()
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

# Global MQTT publisher instance
mqtt_publisher: Optional[MQTTPublisher] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown"""
    global mqtt_publisher

    # Startup: Initialize MQTT publisher
    logger.info("Starting Weather Station Service v1.0.0")
    try:
        db = SessionLocal()
        try:
            mqtt_config_dict = get_mqtt_config(db)
            mqtt_config = MQTTConfig(**mqtt_config_dict)

            if mqtt_config.enabled:
                logger.info("MQTT is enabled, initializing publisher")
                mqtt_publisher = MQTTPublisher(mqtt_config)
            else:
                logger.info("MQTT is disabled")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to initialize MQTT publisher: {e}")
        mqtt_publisher = None

    yield

    # Shutdown: Disconnect MQTT publisher
    if mqtt_publisher:
        logger.info("Shutting down MQTT publisher")
        mqtt_publisher.disconnect()


app = FastAPI(
    title="Weather Station Service",
    description="Local weather data archival and analysis service",
    version="1.0.0",
    lifespan=lifespan
)

# Constants
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "not_checked",
        "mqtt": "not_configured"
    }


@app.post("/api/weather/upload")
async def upload_weather_data(
    PASSKEY: str = Form(...),
    dateutc: str = Form(...),
    tempf: float = Form(None),
    feelsLike: float = Form(None),
    dewPoint: float = Form(None),
    humidity: int = Form(None),
    windspeedmph: float = Form(None),
    windgustmph: float = Form(None),
    maxdailygust: float = Form(None),
    winddir: int = Form(None),
    rainratein: float = Form(None),
    eventrainin: float = Form(None),
    dailyrainin: float = Form(None),
    weeklyrainin: float = Form(None),
    monthlyrainin: float = Form(None),
    yearlyrainin: float = Form(None),
    totalrainin: float = Form(None),
    baromrelin: float = Form(None),
    baromabsin: float = Form(None),
    uv: float = Form(None),
    solarradiation: float = Form(None),
    tempinf: float = Form(None),
    humidityin: int = Form(None),
    feelsLikein: float = Form(None),
    dewPointin: float = Form(None),
    temp1f: float = Form(None),
    humidity1: int = Form(None),
    feelsLike1: float = Form(None),
    dewPoint1: float = Form(None),
    batt1: int = Form(None),
    battout: int = Form(None),
    db: Session = Depends(get_db)
):
    """Receive weather data from WS-2902 station"""
    # Validate PASSKEY using constant-time comparison to prevent timing attacks
    if not secrets.compare_digest(PASSKEY, get_settings().station_passkey):
        raise HTTPException(status_code=401, detail="Invalid PASSKEY")

    # Create upload object
    upload = StationUpload(
        PASSKEY=PASSKEY,
        dateutc=dateutc,
        tempf=tempf,
        feelsLike=feelsLike,
        dewPoint=dewPoint,
        humidity=humidity,
        windspeedmph=windspeedmph,
        windgustmph=windgustmph,
        maxdailygust=maxdailygust,
        winddir=winddir,
        rainratein=rainratein,
        eventrainin=eventrainin,
        dailyrainin=dailyrainin,
        weeklyrainin=weeklyrainin,
        monthlyrainin=monthlyrainin,
        yearlyrainin=yearlyrainin,
        totalrainin=totalrainin,
        baromrelin=baromrelin,
        baromabsin=baromabsin,
        uv=uv,
        solarradiation=solarradiation,
        tempinf=tempinf,
        humidityin=humidityin,
        feelsLikein=feelsLikein,
        dewPointin=dewPointin,
        temp1f=temp1f,
        humidity1=humidity1,
        feelsLike1=feelsLike1,
        dewPoint1=dewPoint1,
        batt1=batt1,
        battout=battout
    )

    # Store reading in database and publish to MQTT
    reading = store_weather_reading(db, upload, mqtt_publisher)

    return {"status": "success", "timestamp": reading.timestamp}


@app.post("/api/weather/import")
async def import_csv_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Import CSV file via upload"""
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large. Maximum size: {MAX_UPLOAD_SIZE} bytes")

    # Validate content type
    allowed_types = ["text/csv", "application/csv", "text/plain"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Expected CSV, got {file.content_type}"
        )

    # Validate file extension
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must have .csv extension")

    tmp_path = None
    try:
        # Save uploaded file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = Path(tmp.name)

        stats = import_csv_data(tmp_path, db)
        return stats
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="CSV file not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")
    except Exception as e:
        logger.error(f"Import failed: {e}")
        raise HTTPException(status_code=500, detail="Import failed. Please check CSV format and try again.")
    finally:
        if tmp_path and tmp_path.exists():
            tmp_path.unlink()


@app.post("/api/weather/import/path")
async def import_csv_from_path(
    request: ImportPathRequest,
    db: Session = Depends(get_db)
):
    """Import CSV from file path (for Docker volume mounts)"""
    csv_path = Path(request.path).resolve()  # Resolve to absolute path

    # Validate path is within allowed directories
    allowed_dirs = [Path("/data").resolve(), Path("tests/fixtures").resolve()]
    if not any(csv_path.is_relative_to(allowed_dir) for allowed_dir in allowed_dirs):
        raise HTTPException(status_code=403, detail="Access to this path is forbidden")

    if csv_path.suffix.lower() != '.csv':
        raise HTTPException(status_code=400, detail="File must have .csv extension")

    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="CSV file not found")

    if not csv_path.is_file():
        raise HTTPException(status_code=400, detail="Path is not a file")

    try:
        stats = import_csv_data(csv_path, db)
        return stats
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="CSV file not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")
    except Exception as e:
        logger.error(f"Import failed: {e}")
        raise HTTPException(status_code=500, detail="Import failed. Please check CSV format and try again.")


@app.get("/api/weather/latest", response_model=WeatherReadingResponse)
async def latest_reading(db: Session = Depends(get_db)):
    """Get most recent weather reading"""
    reading = get_latest_reading(db)
    if not reading:
        raise HTTPException(status_code=404, detail="No readings found")
    return reading


@app.get("/api/weather/readings", response_model=List[WeatherReadingResponse])
async def query_readings(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: Optional[int] = 1000,
    offset: Optional[int] = 0,
    db: Session = Depends(get_db)
):
    """Query weather readings with filters"""
    # Enforce maximum limit to prevent DoS
    if limit is not None and limit > 10000:
        raise HTTPException(status_code=400, detail="Limit cannot exceed 10000")
    if limit is not None and limit < 1:
        raise HTTPException(status_code=400, detail="Limit must be at least 1")

    # Validate offset
    if offset is not None and offset < 0:
        raise HTTPException(status_code=400, detail="Offset must be non-negative")

    # Validate date range
    if start and end and start > end:
        raise HTTPException(status_code=400, detail="Start date must be before end date")

    readings = get_readings(db, start, end, limit, offset)
    return readings


@app.get("/api/weather/stats")
async def database_stats(db: Session = Depends(get_db)):
    """Get database statistics"""
    return get_database_stats(db)


@app.post("/api/analysis/solar")
async def analyze_solar(
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):
    """Run solar energy analysis"""
    analyzer = SolarAnalyzer()

    try:
        result = analyzer.analyze(
            request.start,
            request.end,
            request.config,
            db
        )
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/analysis/wind")
async def analyze_wind(
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):
    """Run wind energy analysis"""
    analyzer = WindAnalyzer()

    try:
        result = analyzer.analyze(
            request.start,
            request.end,
            request.config,
            db
        )
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve main dashboard page"""
    return "<html><body><h1>Weather Station Service</h1></body></html>"
