"""Sampling utilities for time-series data with database-agnostic aggregation"""

from datetime import datetime, timedelta, timezone
from typing import List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
import math

# Security: Whitelist for SQL injection prevention
ALLOWED_BUCKET_SIZES = {
    '1 minute', '2 minutes', '10 minutes', '30 minutes',
    '2 hours', '6 hours', '1 day'
}

# Map bucket sizes to seconds for SQLite
BUCKET_SECONDS = {
    '1 minute': 60,
    '2 minutes': 120,
    '10 minutes': 600,
    '30 minutes': 1800,
    '2 hours': 7200,
    '6 hours': 21600,
    '1 day': 86400
}

ALLOWED_ANGLE_COLUMNS = {'wind_direction_deg'}


def calculate_bucket_size(start: datetime, end: datetime) -> str:
    """Calculate appropriate time bucket size based on date range.

    Returns interval string for time bucketing.
    Target: ~1500-2000 data points regardless of range.

    Args:
        start: Start datetime
        end: End datetime

    Returns:
        Interval string (e.g., '1 minute', '10 minutes', '1 day')
    """
    duration = end - start
    hours = duration.total_seconds() / 3600
    days = duration.days

    if hours < 6:
        return '1 minute'
    elif hours < 24:
        return '2 minutes'
    elif days < 7:
        return '10 minutes'
    elif days < 30:
        return '30 minutes'
    elif days < 90:
        return '2 hours'
    elif days < 365:
        return '6 hours'
    else:
        return '1 day'


def calculate_circular_mean(angles: List[float]) -> float:
    """Calculate circular mean of angles in degrees.

    Used for wind direction to handle wraparound (e.g., 359° → 1° averages to 0°, not 180°).

    Args:
        angles: List of angles in degrees

    Returns:
        Circular mean in degrees (0-360 range), or None if no valid angles
    """
    if not angles:
        return None

    # Convert to radians
    radians = [math.radians(a) for a in angles if a is not None]
    if not radians:
        return None

    # Calculate mean of sin and cos components
    sin_sum = sum(math.sin(r) for r in radians)
    cos_sum = sum(math.cos(r) for r in radians)

    # Calculate angle
    mean_rad = math.atan2(sin_sum / len(radians), cos_sum / len(radians))
    mean_deg = math.degrees(mean_rad)

    # Normalize to 0-360
    if mean_deg < 0:
        mean_deg += 360

    return mean_deg


def get_sampled_readings(
    db: Session,
    start: datetime,
    end: datetime,
    max_points: int = 1500
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Get weather readings sampled using time bucketing.
    Works with both PostgreSQL/TimescaleDB and SQLite.

    Returns tuple of (readings list, metadata dict)

    Raises:
        ValueError: If date range is invalid or too large
    """
    # Ensure timezone-aware datetimes for comparison
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)

    # Validate inputs
    if start >= end:
        raise ValueError("Start date must be before end date")

    if (end - start).days > 1825:
        raise ValueError("Date range too large, maximum 5 years")

    # Check for future dates
    now = datetime.now(timezone.utc)
    if end > now:
        raise ValueError("End date cannot be in the future")

    bucket_size = calculate_bucket_size(start, end)

    # Validate bucket size against whitelist for SQL injection prevention
    if bucket_size not in ALLOWED_BUCKET_SIZES:
        raise ValueError(f"Invalid bucket size: {bucket_size}")

    bucket_seconds = BUCKET_SECONDS[bucket_size]

    # Build SQLite-compatible query using strftime for time bucketing
    # Note: SQLite stores timestamps as strings, so we group by truncated timestamp
    query = text(f"""
        SELECT
            datetime((strftime('%s', timestamp) / {bucket_seconds}) * {bucket_seconds}, 'unixepoch') AS bucket_time,
            AVG(outdoor_temp_f) AS outdoor_temp_f,
            AVG(feels_like_f) AS feels_like_f,
            AVG(dew_point_f) AS dew_point_f,
            AVG(humidity_pct) AS humidity_pct,
            AVG(wind_speed_mph) AS wind_speed_mph,
            MAX(wind_gust_mph) AS wind_gust_mph,
            MAX(max_daily_gust_mph) AS max_daily_gust_mph,
            AVG(wind_direction_deg) AS wind_direction_deg,
            MAX(rain_rate_in_hr) AS rain_rate_in_hr,
            MAX(event_rain_in) AS event_rain_in,
            MAX(daily_rain_in) AS daily_rain_in,
            MAX(weekly_rain_in) AS weekly_rain_in,
            MAX(monthly_rain_in) AS monthly_rain_in,
            MAX(yearly_rain_in) AS yearly_rain_in,
            MAX(total_rain_in) AS total_rain_in,
            AVG(relative_pressure_inhg) AS relative_pressure_inhg,
            AVG(absolute_pressure_inhg) AS absolute_pressure_inhg,
            AVG(uv_index) AS uv_index,
            AVG(solar_radiation_wm2) AS solar_radiation_wm2,
            AVG(indoor_temp_f) AS indoor_temp_f,
            AVG(indoor_humidity_pct) AS indoor_humidity_pct,
            AVG(indoor_feels_like_f) AS indoor_feels_like_f,
            AVG(indoor_dew_point_f) AS indoor_dew_point_f,
            AVG(sensor1_temp_f) AS sensor1_temp_f,
            AVG(sensor1_humidity_pct) AS sensor1_humidity_pct,
            AVG(sensor1_feels_like_f) AS sensor1_feels_like_f,
            AVG(sensor1_dew_point_f) AS sensor1_dew_point_f,
            MAX(outdoor_battery) AS outdoor_battery,
            MAX(sensor1_battery) AS sensor1_battery,
            COUNT(*) AS reading_count
        FROM weather_readings
        WHERE timestamp >= :start AND timestamp <= :end
        GROUP BY bucket_time
        ORDER BY bucket_time ASC
    """)

    # Execute query
    result = db.execute(
        query,
        {
            'start': start.replace(tzinfo=None),  # SQLite stores as naive datetime
            'end': end.replace(tzinfo=None)
        }
    )

    # Convert results to list of dicts
    readings = []
    for row in result:
        # Parse bucket_time (SQLite returns string)
        if isinstance(row.bucket_time, str):
            bucket_dt = datetime.fromisoformat(row.bucket_time.replace(' ', 'T'))
        else:
            bucket_dt = row.bucket_time

        reading = {
            'timestamp': bucket_dt.isoformat() if bucket_dt else None,
            'outdoor_temp_f': float(row.outdoor_temp_f) if row.outdoor_temp_f is not None else None,
            'feels_like_f': float(row.feels_like_f) if row.feels_like_f is not None else None,
            'dew_point_f': float(row.dew_point_f) if row.dew_point_f is not None else None,
            'humidity_pct': int(row.humidity_pct) if row.humidity_pct is not None else None,
            'wind_speed_mph': float(row.wind_speed_mph) if row.wind_speed_mph is not None else None,
            'wind_gust_mph': float(row.wind_gust_mph) if row.wind_gust_mph is not None else None,
            'max_daily_gust_mph': float(row.max_daily_gust_mph) if row.max_daily_gust_mph is not None else None,
            'wind_direction_deg': int(row.wind_direction_deg) if row.wind_direction_deg is not None else None,
            'rain_rate_in_hr': float(row.rain_rate_in_hr) if row.rain_rate_in_hr is not None else None,
            'event_rain_in': float(row.event_rain_in) if row.event_rain_in is not None else None,
            'daily_rain_in': float(row.daily_rain_in) if row.daily_rain_in is not None else None,
            'weekly_rain_in': float(row.weekly_rain_in) if row.weekly_rain_in is not None else None,
            'monthly_rain_in': float(row.monthly_rain_in) if row.monthly_rain_in is not None else None,
            'yearly_rain_in': float(row.yearly_rain_in) if row.yearly_rain_in is not None else None,
            'total_rain_in': float(row.total_rain_in) if row.total_rain_in is not None else None,
            'relative_pressure_inhg': float(row.relative_pressure_inhg) if row.relative_pressure_inhg is not None else None,
            'absolute_pressure_inhg': float(row.absolute_pressure_inhg) if row.absolute_pressure_inhg is not None else None,
            'uv_index': float(row.uv_index) if row.uv_index is not None else None,
            'solar_radiation_wm2': float(row.solar_radiation_wm2) if row.solar_radiation_wm2 is not None else None,
            'indoor_temp_f': float(row.indoor_temp_f) if row.indoor_temp_f is not None else None,
            'indoor_humidity_pct': int(row.indoor_humidity_pct) if row.indoor_humidity_pct is not None else None,
            'indoor_feels_like_f': float(row.indoor_feels_like_f) if row.indoor_feels_like_f is not None else None,
            'indoor_dew_point_f': float(row.indoor_dew_point_f) if row.indoor_dew_point_f is not None else None,
            'sensor1_temp_f': float(row.sensor1_temp_f) if row.sensor1_temp_f is not None else None,
            'sensor1_humidity_pct': int(row.sensor1_humidity_pct) if row.sensor1_humidity_pct is not None else None,
            'sensor1_feels_like_f': float(row.sensor1_feels_like_f) if row.sensor1_feels_like_f is not None else None,
            'sensor1_dew_point_f': float(row.sensor1_dew_point_f) if row.sensor1_dew_point_f is not None else None,
            'outdoor_battery': int(row.outdoor_battery) if row.outdoor_battery is not None else None,
            'sensor1_battery': int(row.sensor1_battery) if row.sensor1_battery is not None else None,
        }
        readings.append(reading)

    # Build metadata
    metadata = {
        'bucket_size': bucket_size,
        'total_points': len(readings),
        'start': start.isoformat(),
        'end': end.isoformat(),
        'max_points': max_points
    }

    return readings, metadata
