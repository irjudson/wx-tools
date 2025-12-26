from fastapi import FastAPI, Depends, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import logging
import secrets
from src.config import get_settings
from src.database import get_db
from src.schemas import StationUpload
from src.services.ingestion import store_weather_reading

# Configure logging
settings = get_settings()
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Weather Station Service",
    description="Local weather data archival and analysis service",
    version="1.0.0"
)

logger.info("Starting Weather Station Service v1.0.0")

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

    # Store reading in database
    reading = store_weather_reading(db, upload)

    return {"status": "success", "timestamp": reading.timestamp}


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve main dashboard page"""
    return "<html><body><h1>Weather Station Service</h1></body></html>"
