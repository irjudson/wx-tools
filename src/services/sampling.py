"""Sampling utilities for time-series data with TimescaleDB time_bucket aggregation"""

from datetime import datetime, timedelta, timezone
from typing import List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

# Security: Whitelist for SQL injection prevention
ALLOWED_BUCKET_SIZES = {
    '1 minute', '2 minutes', '10 minutes', '30 minutes',
    '2 hours', '6 hours', '1 day'
}

ALLOWED_ANGLE_COLUMNS = {'wind_direction_deg'}


def calculate_bucket_size(start: datetime, end: datetime) -> str:
    """Calculate appropriate time bucket size based on date range.

    Returns PostgreSQL interval string for TimescaleDB time_bucket().
    Target: ~1500-2000 data points regardless of range.

    Args:
        start: Start datetime
        end: End datetime

    Returns:
        PostgreSQL interval string (e.g., '1 minute', '10 minutes', '1 day')
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


def calculate_circular_mean_sql(column_name: str) -> str:
    """Generate SQL for circular mean calculation.

    Used for wind direction to handle wraparound (e.g., 359° → 1° averages to 0°, not 180°).
    Uses the formula: atan2(avg(sin(radians)), avg(cos(radians)))
    Normalizes result to 0-360 range.

    Args:
        column_name: Name of the column containing angles in degrees (must be from allowed list)

    Returns:
        SQL expression for circular mean in degrees (0-360 range)

    Raises:
        ValueError: If column_name not in whitelist
    """
    if column_name not in ALLOWED_ANGLE_COLUMNS:
        raise ValueError(f"Invalid column name for circular mean: {column_name}")
    return f"""
        CASE
            WHEN COUNT({column_name}) > 0 THEN
                CASE
                    WHEN DEGREES(
                        ATAN2(
                            AVG(SIN(RADIANS({column_name}))),
                            AVG(COS(RADIANS({column_name})))
                        )
                    ) < 0 THEN
                        DEGREES(
                            ATAN2(
                                AVG(SIN(RADIANS({column_name}))),
                                AVG(COS(RADIANS({column_name})))
                            )
                        ) + 360
                    ELSE
                        DEGREES(
                            ATAN2(
                                AVG(SIN(RADIANS({column_name}))),
                                AVG(COS(RADIANS({column_name})))
                            )
                        )
                END
            ELSE NULL
        END
    """


def get_sampled_readings(
    db: Session,
    start: datetime,
    end: datetime,
    max_points: int = 1500
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Get weather readings sampled using TimescaleDB time_bucket.

    Returns tuple of (readings list, metadata dict)

    Raises:
        ValueError: If date range is invalid or too large
    """
    # Validate inputs
    if start >= end:
        raise ValueError("Start date must be before end date")

    if (end - start).days > 730:
        raise ValueError("Date range too large, maximum 2 years")

    # Check for future dates
    if end > datetime.now(timezone.utc):
        raise ValueError("End date cannot be in the future")

    bucket_size = calculate_bucket_size(start, end)

    # Validate bucket size against whitelist for SQL injection prevention
    if bucket_size not in ALLOWED_BUCKET_SIZES:
        raise ValueError(f"Invalid bucket size: {bucket_size}")

    # Build SQL query with TimescaleDB time_bucket
    # Using circular mean for wind direction, AVG for temps/humidity/pressure,
    # MAX for gusts and rain totals
    # Note: bucket_size must be interpolated directly as it's an interval string
    wind_dir_sql = calculate_circular_mean_sql('wind_direction_deg')

    query = text(f"""
        SELECT
            time_bucket('{bucket_size}', timestamp) AS bucket_time,
            AVG(outdoor_temp_f) AS outdoor_temp_f,
            AVG(feels_like_f) AS feels_like_f,
            AVG(dew_point_f) AS dew_point_f,
            AVG(humidity_pct) AS humidity_pct,
            AVG(wind_speed_mph) AS wind_speed_mph,
            MAX(wind_gust_mph) AS wind_gust_mph,
            MAX(max_daily_gust_mph) AS max_daily_gust_mph,
            ({wind_dir_sql}) AS wind_direction_deg,
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
            'start': start,
            'end': end
        }
    )

    # Convert results to list of dicts
    readings = []
    for row in result:
        reading = {
            'timestamp': row.bucket_time.isoformat() if row.bucket_time else None,
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
