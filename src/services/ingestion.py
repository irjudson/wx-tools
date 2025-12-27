from datetime import datetime, timezone
from typing import Optional
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


def store_weather_reading(db: Session, upload: StationUpload, mqtt_publisher=None) -> WeatherReading:
    """Store weather reading in database with duplicate prevention

    Args:
        db: Database session
        upload: Station upload data
        mqtt_publisher: Optional MQTT publisher to publish reading

    Returns:
        WeatherReading instance
    """
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

    # Publish to MQTT if publisher is provided
    if mqtt_publisher is not None:
        try:
            # Convert reading to dict with all fields
            reading_dict = {
                "timestamp": reading.timestamp.isoformat(),
                "outdoor_temp_f": reading.outdoor_temp_f,
                "feels_like_f": reading.feels_like_f,
                "dew_point_f": reading.dew_point_f,
                "humidity_pct": reading.humidity_pct,
                "wind_speed_mph": reading.wind_speed_mph,
                "wind_gust_mph": reading.wind_gust_mph,
                "max_daily_gust_mph": reading.max_daily_gust_mph,
                "wind_direction_deg": reading.wind_direction_deg,
                "rain_rate_in_hr": reading.rain_rate_in_hr,
                "event_rain_in": reading.event_rain_in,
                "daily_rain_in": reading.daily_rain_in,
                "weekly_rain_in": reading.weekly_rain_in,
                "monthly_rain_in": reading.monthly_rain_in,
                "yearly_rain_in": reading.yearly_rain_in,
                "total_rain_in": reading.total_rain_in,
                "relative_pressure_inhg": reading.relative_pressure_inhg,
                "absolute_pressure_inhg": reading.absolute_pressure_inhg,
                "uv_index": reading.uv_index,
                "solar_radiation_wm2": reading.solar_radiation_wm2,
                "indoor_temp_f": reading.indoor_temp_f,
                "indoor_humidity_pct": reading.indoor_humidity_pct,
                "indoor_feels_like_f": reading.indoor_feels_like_f,
                "indoor_dew_point_f": reading.indoor_dew_point_f,
                "sensor1_temp_f": reading.sensor1_temp_f,
                "sensor1_humidity_pct": reading.sensor1_humidity_pct,
                "sensor1_feels_like_f": reading.sensor1_feels_like_f,
                "sensor1_dew_point_f": reading.sensor1_dew_point_f,
                "outdoor_battery": reading.outdoor_battery,
                "sensor1_battery": reading.sensor1_battery,
            }
            mqtt_publisher.publish_reading(reading_dict)
        except Exception as e:
            logger.error(f"Failed to publish reading to MQTT: {e}")

    return reading
