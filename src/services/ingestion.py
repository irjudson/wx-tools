from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from src.models import WeatherReading
from src.schemas import StationUpload
import logging
import math

logger = logging.getLogger(__name__)


def parse_station_timestamp(dateutc: str) -> datetime:
    """Parse station timestamp to datetime with UTC timezone"""
    from dateutil import parser
    # Replace + with space (common in URL encoding)
    dateutc = dateutc.replace('+', ' ')
    dt = parser.parse(dateutc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def calculate_dew_point(temp_f: float, humidity: int) -> float:
    """Calculate dew point from temperature (°F) and humidity (%)

    Uses Magnus formula converted for Fahrenheit
    """
    if temp_f is None or humidity is None:
        return None

    # Convert F to C
    temp_c = (temp_f - 32) * 5/9

    # Magnus formula constants
    a = 17.27
    b = 237.7

    # Calculate alpha
    alpha = ((a * temp_c) / (b + temp_c)) + math.log(humidity / 100.0)

    # Calculate dew point in Celsius
    dew_point_c = (b * alpha) / (a - alpha)

    # Convert back to Fahrenheit
    dew_point_f = (dew_point_c * 9/5) + 32

    return round(dew_point_f, 1)


def calculate_heat_index(temp_f: float, humidity: int) -> float:
    """Calculate heat index from temperature (°F) and humidity (%)

    Uses NWS heat index formula
    """
    if temp_f is None or humidity is None:
        return None

    # Heat index only applies when temp >= 80°F
    if temp_f < 80:
        return temp_f

    # Rothfusz regression formula
    hi = -42.379 + 2.04901523 * temp_f + 10.14333127 * humidity
    hi += -0.22475541 * temp_f * humidity
    hi += -0.00683783 * temp_f * temp_f
    hi += -0.05481717 * humidity * humidity
    hi += 0.00122874 * temp_f * temp_f * humidity
    hi += 0.00085282 * temp_f * humidity * humidity
    hi += -0.00000199 * temp_f * temp_f * humidity * humidity

    return round(hi, 1)


def calculate_wind_chill(temp_f: float, wind_mph: float) -> float:
    """Calculate wind chill from temperature (°F) and wind speed (mph)

    Uses NWS wind chill formula
    """
    if temp_f is None or wind_mph is None:
        return None

    # Wind chill only applies when temp <= 50°F and wind >= 3 mph
    if temp_f > 50 or wind_mph < 3:
        return temp_f

    # NWS wind chill formula
    wc = 35.74 + (0.6215 * temp_f) - (35.75 * (wind_mph ** 0.16))
    wc += 0.4275 * temp_f * (wind_mph ** 0.16)

    return round(wc, 1)


def calculate_feels_like(temp_f: float, humidity: int, wind_mph: float) -> float:
    """Calculate feels like temperature

    Uses heat index when hot, wind chill when cold, or actual temp otherwise
    """
    if temp_f is None:
        return None

    if temp_f >= 80 and humidity is not None:
        return calculate_heat_index(temp_f, humidity)
    elif temp_f <= 50 and wind_mph is not None and wind_mph >= 3:
        return calculate_wind_chill(temp_f, wind_mph)
    else:
        return temp_f


def normalize_station_data(upload: StationUpload) -> dict:
    """Normalize station field names to database column names and calculate derived values"""

    # Calculate outdoor derived values if not provided
    outdoor_feels_like = upload.feelsLike or calculate_feels_like(
        upload.tempf, upload.humidity, upload.windspeedmph
    )
    outdoor_dew_point = upload.dewPoint or calculate_dew_point(
        upload.tempf, upload.humidity
    )

    # Calculate indoor derived values if not provided
    indoor_feels_like = upload.feelsLikein or calculate_feels_like(
        upload.tempinf, upload.humidityin, None  # No indoor wind speed
    )
    indoor_dew_point = upload.dewPointin or calculate_dew_point(
        upload.tempinf, upload.humidityin
    )

    # Calculate sensor1 derived values if not provided
    sensor1_feels_like = upload.feelsLike1 or calculate_feels_like(
        upload.temp1f, upload.humidity1, None  # No sensor1 wind speed
    )
    sensor1_dew_point = upload.dewPoint1 or calculate_dew_point(
        upload.temp1f, upload.humidity1
    )

    # Use hourlyrainin as rain_rate_in_hr if rainratein not provided
    rain_rate = upload.rainratein or upload.hourlyrainin

    return {
        "timestamp": parse_station_timestamp(upload.dateutc),
        "outdoor_temp_f": upload.tempf,
        "feels_like_f": outdoor_feels_like,
        "dew_point_f": outdoor_dew_point,
        "humidity_pct": upload.humidity,
        "wind_speed_mph": upload.windspeedmph,
        "wind_gust_mph": upload.windgustmph,
        "max_daily_gust_mph": upload.maxdailygust,
        "wind_direction_deg": upload.winddir,
        "rain_rate_in_hr": rain_rate,
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
        "indoor_feels_like_f": indoor_feels_like,
        "indoor_dew_point_f": indoor_dew_point,
        "sensor1_temp_f": upload.temp1f,
        "sensor1_humidity_pct": upload.humidity1,
        "sensor1_feels_like_f": sensor1_feels_like,
        "sensor1_dew_point_f": sensor1_dew_point,
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
