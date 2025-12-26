from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.models import WeatherReading
from src.schemas import StationUpload
import logging

logger = logging.getLogger(__name__)


def parse_station_timestamp(dateutc: str) -> datetime:
    """Parse station timestamp to datetime with UTC timezone"""
    from dateutil import parser
    dt = parser.parse(dateutc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def normalize_station_data(upload: StationUpload) -> dict:
    """Normalize station field names to database column names"""
    return {
        "timestamp": parse_station_timestamp(upload.dateutc),
        "outdoor_temp_f": upload.tempf,
        "feels_like_f": upload.feelsLike,
        "dew_point_f": upload.dewPoint,
        "humidity_pct": upload.humidity,
        "wind_speed_mph": upload.windspeedmph,
        "wind_gust_mph": upload.windgustmph,
        "max_daily_gust_mph": upload.maxdailygust,
        "wind_direction_deg": upload.winddir,
        "rain_rate_in_hr": upload.rainratein,
        "event_rain_in": upload.eventrainin,
        "daily_rain_in": upload.dailyrainin,
        "weekly_rain_in": upload.weeklyrainin,
        "monthly_rain_in": upload.monthlyrainin,
        "yearly_rain_in": upload.yearlyrainin,
        "total_rain_in": upload.totalrainin,
        "relative_pressure_inhg": upload.baromrelin,
        "absolute_pressure_inhg": upload.baromabsin,
        "uv_index": upload.uv,
        "solar_radiation_wm2": upload.solarradiation,
        "indoor_temp_f": upload.tempinf,
        "indoor_humidity_pct": upload.humidityin,
        "indoor_feels_like_f": upload.feelsLikein,
        "indoor_dew_point_f": upload.dewPointin,
        "sensor1_temp_f": upload.temp1f,
        "sensor1_humidity_pct": upload.humidity1,
        "sensor1_feels_like_f": upload.feelsLike1,
        "sensor1_dew_point_f": upload.dewPoint1,
        "outdoor_battery": upload.battout,
        "sensor1_battery": upload.batt1,
    }


def store_weather_reading(db: Session, upload: StationUpload) -> WeatherReading:
    """Store weather reading in database with duplicate prevention"""
    normalized_data = normalize_station_data(upload)

    # Create new reading and attempt to insert
    # Rely on unique constraint to prevent duplicates (handles race conditions)
    reading = WeatherReading(**normalized_data)
    db.add(reading)

    try:
        db.commit()
        db.refresh(reading)
        logger.info(f"Stored reading at {normalized_data['timestamp']}")
    except IntegrityError:
        # Duplicate timestamp - fetch and return existing reading
        db.rollback()
        logger.info(f"Reading at {normalized_data['timestamp']} already exists, skipping")
        reading = db.query(WeatherReading).filter(
            WeatherReading.timestamp == normalized_data["timestamp"]
        ).first()
        if not reading:
            # Should not happen, but raise if we can't find the existing record
            raise

    return reading
