from fastapi import FastAPI, Depends, HTTPException, Form, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from datetime import datetime
from typing import Optional, List
from contextlib import asynccontextmanager
import tempfile
import shutil
import logging
import secrets
import asyncio
from urllib.parse import unquote, parse_qs
from src.config import get_settings
from src.database import get_db, SessionLocal
from src.schemas import StationUpload, ImportPathRequest, WeatherReadingResponse, AnalysisRequest, MQTTConfigRequest, StationConfigRequest, TimezoneUpdateRequest
from src.services.ingestion import store_weather_reading
from src.services.csv_import import import_csv_data
from src.services.query import get_latest_reading, get_readings, get_database_stats
from src.services.config import get_mqtt_config, set_mqtt_config
from src.services.mqtt_publisher import MQTTPublisher, MQTTConfig
from src.services.sampling import get_sampled_readings
from src.analysis.solar import SolarAnalyzer
from src.analysis.wind import WindAnalyzer

# Configure logging
settings = get_settings()
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

# Global MQTT publisher instance and monitoring task
mqtt_publisher: Optional[MQTTPublisher] = None
monitoring_task: Optional[asyncio.Task] = None


async def monitor_data_freshness():
    """Background task to monitor data freshness and log alerts"""
    from datetime import datetime, timezone, timedelta

    while True:
        try:
            await asyncio.sleep(300)  # Check every 5 minutes

            db = SessionLocal()
            try:
                latest = get_latest_reading(db)
                if latest:
                    now = datetime.now(timezone.utc)
                    latest_time = latest.timestamp

                    if latest_time.tzinfo is None:
                        latest_time = latest_time.replace(tzinfo=timezone.utc)

                    time_diff = now - latest_time

                    if time_diff > timedelta(hours=1):
                        hours_ago = time_diff.total_seconds() / 3600
                        logger.error(f"ALERT: Weather data collection has stopped! Last reading was {hours_ago:.1f} hours ago")
                    elif time_diff > timedelta(minutes=15):
                        minutes_ago = time_diff.total_seconds() / 60
                        logger.warning(f"WARNING: Weather data may be stale. Last reading was {minutes_ago:.1f} minutes ago")
                else:
                    logger.error("ALERT: No weather data found in database")
            finally:
                db.close()
        except asyncio.CancelledError:
            logger.info("Data freshness monitoring task cancelled")
            break
        except Exception as e:
            logger.error(f"Error in data freshness monitoring: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown"""
    global mqtt_publisher, monitoring_task

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

    # Start data freshness monitoring
    logger.info("Starting data freshness monitoring (checking every 5 minutes)")
    monitoring_task = asyncio.create_task(monitor_data_freshness())

    yield

    # Shutdown: Stop monitoring task
    if monitoring_task:
        logger.info("Stopping data freshness monitoring")
        monitoring_task.cancel()
        try:
            await monitoring_task
        except asyncio.CancelledError:
            pass

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

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Constants
MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB

# Mount static files
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

# Mount static files for old assets for now, will remove later
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint with data freshness monitoring"""
    from datetime import datetime, timezone, timedelta

    health_status = {
        "status": "healthy",
        "database": "connected",
        "mqtt": "not_configured" if mqtt_publisher is None else "connected",
        "data_freshness": "unknown"
    }

    try:
        # Check if we have recent data (within last 5 minutes)
        latest = get_latest_reading(db)
        if latest:
            now = datetime.now(timezone.utc)
            latest_time = latest.timestamp

            # Make timezone-aware if needed
            if latest_time.tzinfo is None:
                latest_time = latest_time.replace(tzinfo=timezone.utc)

            time_diff = now - latest_time

            if time_diff < timedelta(minutes=5):
                health_status["data_freshness"] = "current"
                health_status["last_reading_seconds_ago"] = int(time_diff.total_seconds())
            elif time_diff < timedelta(hours=1):
                health_status["data_freshness"] = "stale"
                health_status["last_reading_seconds_ago"] = int(time_diff.total_seconds())
                health_status["status"] = "degraded"
                logger.warning(f"Weather data is stale: last reading {time_diff.total_seconds():.0f} seconds ago")
            else:
                health_status["data_freshness"] = "very_stale"
                health_status["last_reading_seconds_ago"] = int(time_diff.total_seconds())
                health_status["status"] = "degraded"
                logger.error(f"Weather data is very stale: last reading {time_diff.total_seconds():.0f} seconds ago")
        else:
            health_status["data_freshness"] = "no_data"
            health_status["status"] = "degraded"
            logger.warning("No weather readings found in database")

    except Exception as e:
        logger.error(f"Health check database query failed: {e}")
        health_status["database"] = "error"
        health_status["status"] = "unhealthy"

    return health_status


async def _process_weather_upload(
    PASSKEY: str,
    dateutc: str,
    tempf: float = None,
    feelsLike: float = None,
    dewPoint: float = None,
    humidity: int = None,
    windspeedmph: float = None,
    windgustmph: float = None,
    maxdailygust: float = None,
    winddir: int = None,
    rainratein: float = None,
    eventrainin: float = None,
    dailyrainin: float = None,
    weeklyrainin: float = None,
    monthlyrainin: float = None,
    yearlyrainin: float = None,
    totalrainin: float = None,
    baromrelin: float = None,
    baromabsin: float = None,
    uv: float = None,
    solarradiation: float = None,
    tempinf: float = None,
    humidityin: int = None,
    feelsLikein: float = None,
    dewPointin: float = None,
    temp1f: float = None,
    humidity1: int = None,
    feelsLike1: float = None,
    dewPoint1: float = None,
    batt1: int = None,
    battout: int = None,
    hourlyrainin: float = None,
    stationtype: str = None,
    db: Session = None
):
    """Common processing for weather data uploads"""
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


@app.get("/api/weather/upload")
@app.get("/data/report")
@app.get("/weatherstation/updateweatherstation.php")
async def upload_weather_data_get(
    PASSKEY: str,
    dateutc: str,
    tempf: float = None,
    feelsLike: float = None,
    dewPoint: float = None,
    humidity: int = None,
    windspeedmph: float = None,
    windgustmph: float = None,
    maxdailygust: float = None,
    winddir: int = None,
    rainratein: float = None,
    eventrainin: float = None,
    dailyrainin: float = None,
    weeklyrainin: float = None,
    monthlyrainin: float = None,
    yearlyrainin: float = None,
    totalrainin: float = None,
    baromrelin: float = None,
    baromabsin: float = None,
    uv: float = None,
    solarradiation: float = None,
    tempinf: float = None,
    humidityin: int = None,
    feelsLikein: float = None,
    dewPointin: float = None,
    temp1f: float = None,
    humidity1: int = None,
    feelsLike1: float = None,
    dewPoint1: float = None,
    batt1: int = None,
    battout: int = None,
    hourlyrainin: float = None,
    stationtype: str = None,
    db: Session = Depends(get_db)
):
    """Receive weather data from WS-2902 station via GET (Ambient Weather protocol)"""
    return await _process_weather_upload(
        PASSKEY, dateutc, tempf, feelsLike, dewPoint, humidity,
        windspeedmph, windgustmph, maxdailygust, winddir,
        rainratein, eventrainin, dailyrainin, weeklyrainin,
        monthlyrainin, yearlyrainin, totalrainin, baromrelin,
        baromabsin, uv, solarradiation, tempinf, humidityin,
        feelsLikein, dewPointin, temp1f, humidity1, feelsLike1,
        dewPoint1, batt1, battout, hourlyrainin, stationtype, db
    )


@app.post("/api/weather/upload")
async def upload_weather_data_post(
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
    hourlyrainin: float = Form(None),
    stationtype: str = Form(None),
    db: Session = Depends(get_db)
):
    """Receive weather data from WS-2902 station via POST"""
    return await _process_weather_upload(
        PASSKEY, dateutc, tempf, feelsLike, dewPoint, humidity,
        windspeedmph, windgustmph, maxdailygust, winddir,
        rainratein, eventrainin, dailyrainin, weeklyrainin,
        monthlyrainin, yearlyrainin, totalrainin, baromrelin,
        baromabsin, uv, solarradiation, tempinf, humidityin,
        feelsLikein, dewPointin, temp1f, humidity1, feelsLike1,
        dewPoint1, batt1, battout, hourlyrainin, stationtype, db
    )


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


@app.get("/api/weather/readings/sampled")
async def query_sampled_readings(
    start: datetime,
    end: datetime,
    max_points: Optional[int] = 1500,
    db: Session = Depends(get_db)
):
    """Query time-bucketed weather readings using TimescaleDB aggregation.

    Returns intelligently sampled readings with ~1500-2000 points regardless of date range.
    Uses TimescaleDB time_bucket() for efficient aggregation.

    Args:
        start: Start datetime (required)
        end: End datetime (required)
        max_points: Target maximum points (default: 1500)

    Returns:
        JSON with 'readings' array and 'metadata' object
    """
    try:
        readings, metadata = get_sampled_readings(db, start, end, max_points)
        return {
            "readings": readings,
            "metadata": metadata
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Sampled readings query failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve sampled readings")


@app.get("/api/weather/stats")
async def database_stats(db: Session = Depends(get_db)):
    """Get database statistics"""
    return get_database_stats(db)


@app.get("/api/monitoring/data-freshness")
async def data_freshness_check(db: Session = Depends(get_db)):
    """Check data collection freshness and provide alerts"""
    from datetime import datetime, timezone, timedelta

    latest = get_latest_reading(db)
    if not latest:
        return {
            "status": "error",
            "message": "No data found in database",
            "alert_level": "critical"
        }

    now = datetime.now(timezone.utc)
    latest_time = latest.timestamp

    # Make timezone-aware if needed
    if latest_time.tzinfo is None:
        latest_time = latest_time.replace(tzinfo=timezone.utc)

    time_diff = now - latest_time
    seconds_ago = int(time_diff.total_seconds())

    # Determine alert level
    if time_diff < timedelta(minutes=5):
        alert_level = "ok"
        status = "healthy"
        message = "Data collection is current"
    elif time_diff < timedelta(minutes=15):
        alert_level = "warning"
        status = "stale"
        message = f"Data is {seconds_ago // 60} minutes old - possible collection issue"
    elif time_diff < timedelta(hours=1):
        alert_level = "error"
        status = "stale"
        message = f"Data is {seconds_ago // 60} minutes old - data collection may have stopped"
    else:
        alert_level = "critical"
        status = "very_stale"
        hours_ago = seconds_ago // 3600
        message = f"Data is {hours_ago} hours old - data collection has stopped"

    return {
        "status": status,
        "alert_level": alert_level,
        "message": message,
        "last_reading": latest.timestamp.isoformat(),
        "seconds_since_last_reading": seconds_ago,
        "current_temp_f": latest.outdoor_temp_f,
        "current_humidity_pct": latest.humidity_pct
    }


@app.get("/api/weather/export")
async def export_readings_csv(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: Optional[int] = 10000,
    db: Session = Depends(get_db)
):
    """Export weather readings to CSV"""
    import csv
    import io

    # Enforce maximum limit
    if limit is not None and limit > 100000:
        raise HTTPException(status_code=400, detail="Limit cannot exceed 100000")

    # Validate date range
    if start and end and start > end:
        raise HTTPException(status_code=400, detail="Start date must be before end date")

    # Get readings
    readings = get_readings(db, start, end, limit, 0)

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    if readings:
        # Get field names from first reading
        headers = [
            "Timestamp",
            "Outdoor Temperature (°F)",
            "Feels Like (°F)",
            "Dew Point (°F)",
            "Humidity (%)",
            "Wind Speed (mph)",
            "Wind Gust (mph)",
            "Max Daily Gust (mph)",
            "Wind Direction (°)",
            "Rain Rate (in/hr)",
            "Event Rain (in)",
            "Daily Rain (in)",
            "Weekly Rain (in)",
            "Monthly Rain (in)",
            "Yearly Rain (in)",
            "Total Rain (in)",
            "Relative Pressure (inHg)",
            "Absolute Pressure (inHg)",
            "UV Index",
            "Solar Radiation (W/m²)",
            "Indoor Temperature (°F)",
            "Indoor Humidity (%)",
            "Indoor Feels Like (°F)",
            "Indoor Dew Point (°F)",
            "Sensor 1 Temperature (°F)",
            "Sensor 1 Humidity (%)",
            "Sensor 1 Feels Like (°F)",
            "Sensor 1 Dew Point (°F)",
            "Outdoor Battery",
            "Sensor 1 Battery"
        ]
        writer.writerow(headers)

        # Write data rows
        for reading in readings:
            row = [
                reading.timestamp.isoformat() if reading.timestamp else "",
                reading.outdoor_temp_f,
                reading.feels_like_f,
                reading.dew_point_f,
                reading.humidity_pct,
                reading.wind_speed_mph,
                reading.wind_gust_mph,
                reading.max_daily_gust_mph,
                reading.wind_direction_deg,
                reading.rain_rate_in_hr,
                reading.event_rain_in,
                reading.daily_rain_in,
                reading.weekly_rain_in,
                reading.monthly_rain_in,
                reading.yearly_rain_in,
                reading.total_rain_in,
                reading.relative_pressure_inhg,
                reading.absolute_pressure_inhg,
                reading.uv_index,
                reading.solar_radiation_wm2,
                reading.indoor_temp_f,
                reading.indoor_humidity_pct,
                reading.indoor_feels_like_f,
                reading.indoor_dew_point_f,
                reading.sensor1_temp_f,
                reading.sensor1_humidity_pct,
                reading.sensor1_feels_like_f,
                reading.sensor1_dew_point_f,
                reading.outdoor_battery,
                reading.sensor1_battery
            ]
            writer.writerow(row)

    # Get CSV content
    csv_content = output.getvalue()
    output.close()

    # Generate filename with date range
    filename = "weather_data"
    if start:
        filename += f"_{start.strftime('%Y%m%d')}"
    if end:
        filename += f"_to_{end.strftime('%Y%m%d')}"
    filename += ".csv"

    # Return as downloadable file
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


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


@app.get("/api/config")
async def get_configuration(db: Session = Depends(get_db)):
    """Get all configuration settings"""
    from src.services.config import get_timezone

    mqtt_config = get_mqtt_config(db)

    return {
        "mqtt": mqtt_config,
        "station": {
            "passkey_configured": bool(get_settings().station_passkey)
        },
        "timezone": get_timezone(db)
    }


@app.get("/api/settings")
async def get_settings_endpoint(db: Session = Depends(get_db)):
    """Get user settings including timezone"""
    from src.services.config import get_timezone

    return {
        "timezone": get_timezone(db)
    }


@app.put("/api/settings/timezone")
async def update_timezone(
    request: TimezoneUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update timezone setting with validation"""
    from src.services.config import set_timezone

    try:
        set_timezone(db, request.timezone)
        return {"success": True, "timezone": request.timezone}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/config/mqtt")
async def update_mqtt_config(
    config: MQTTConfigRequest,
    db: Session = Depends(get_db)
):
    """Update MQTT broker settings"""
    global mqtt_publisher

    # Save to database
    set_mqtt_config(db, config.model_dump())

    # Reinitialize MQTT publisher
    mqtt_config = MQTTConfig(**config.model_dump())
    if mqtt_publisher:
        mqtt_publisher.disconnect()
    mqtt_publisher = MQTTPublisher(mqtt_config)

    return {"success": True}


@app.put("/api/config/station")
async def update_station_config(config: StationConfigRequest):
    """Update station settings"""
    # Note: This updates runtime config, not persisted .env
    settings = get_settings()
    settings.station_passkey = config.passkey

    return {"success": True}


@app.get("/", response_class=HTMLResponse)
async def serve_vue_app():
    """Serve the Vue application's index.html"""
    return FileResponse("frontend/dist/index.html")


@app.get("/graphs", response_class=HTMLResponse)
async def graphs_page(request: Request):
    """Serve graphs & analysis page"""
    return FileResponse("frontend/dist/index.html")


# Catch-all for Vue SPA
@app.get("/{path:path}", response_class=HTMLResponse)
async def serve_vue_spa(path: str):
    """Serve the Vue application for all other routes"""
    # This ensures that any path not matching an API route or static asset
    # will fall back to the Vue app's index.html, allowing Vue Router to handle it.
    return FileResponse("frontend/dist/index.html")


# Catch-all route MUST be last
@app.get("/{catchall:path}")
async def catch_weather_upload(catchall: str, request: Request, db: Session = Depends(get_db)):
    """Catch-all route for weather stations that encode parameters in the path"""
    # Check if this looks like a weather upload (contains PASSKEY)
    if "PASSKEY" not in catchall:
        raise HTTPException(status_code=404, detail="Not Found")

    # URL decode and parse the path
    decoded = unquote(catchall)

    # Extract query parameters from the path
    # Format: /path/&PASSKEY=xxx&tempf=yyy or /path/%26PASSKEY%3Dxxx...
    if "&" in decoded:
        # Strip leading path components
        param_string = decoded.split("&", 1)[1]
        params = {}
        for pair in param_string.split("&"):
            if "=" in pair:
                key, value = pair.split("=", 1)
                params[key] = value

        # Extract required and optional parameters
        if "PASSKEY" not in params or "dateutc" not in params:
            raise HTTPException(status_code=400, detail="Missing required parameters")

        # Convert numeric values
        def safe_float(v):
            try: return float(v) if v else None
            except: return None
        def safe_int(v):
            try: return int(float(v)) if v else None
            except: return None

        return await _process_weather_upload(
            PASSKEY=params.get("PASSKEY"),
            dateutc=params.get("dateutc"),
            tempf=safe_float(params.get("tempf")),
            humidity=safe_int(params.get("humidity")),
            windspeedmph=safe_float(params.get("windspeedmph")),
            windgustmph=safe_float(params.get("windgustmph")),
            maxdailygust=safe_float(params.get("maxdailygust")),
            winddir=safe_int(params.get("winddir")),
            rainratein=safe_float(params.get("rainratein")),
            eventrainin=safe_float(params.get("eventrainin")),
            dailyrainin=safe_float(params.get("dailyrainin")),
            weeklyrainin=safe_float(params.get("weeklyrainin")),
            monthlyrainin=safe_float(params.get("monthlyrainin")),
            yearlyrainin=safe_float(params.get("yearlyrainin")),
            totalrainin=safe_float(params.get("totalrainin")),
            baromrelin=safe_float(params.get("baromrelin")),
            baromabsin=safe_float(params.get("baromabsin")),
            uv=safe_float(params.get("uv")),
            solarradiation=safe_float(params.get("solarradiation")),
            tempinf=safe_float(params.get("tempinf")),
            humidityin=safe_int(params.get("humidityin")),
            temp1f=safe_float(params.get("temp1f")),
            humidity1=safe_int(params.get("humidity1")),
            batt1=safe_int(params.get("batt1")),
            battout=safe_int(params.get("battout")),
            hourlyrainin=safe_float(params.get("hourlyrainin")),
            stationtype=params.get("stationtype"),
            db=db
        )

    raise HTTPException(status_code=404, detail="Not Found")
