import csv
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from src.models import WeatherReading
from dateutil import parser

logger = logging.getLogger(__name__)


# Map CSV column names to database fields
CSV_FIELD_MAPPING = {
    "Date": "timestamp",
    "Outdoor Temperature (°F)": "outdoor_temp_f",
    "Feels Like (°F)": "feels_like_f",
    "Dew Point (°F)": "dew_point_f",
    "Wind Speed (mph)": "wind_speed_mph",
    "Wind Gust (mph)": "wind_gust_mph",
    "Max Daily Gust (mph)": "max_daily_gust_mph",
    "Wind Direction (°)": "wind_direction_deg",
    "Rain Rate (in/hr)": "rain_rate_in_hr",
    "Event Rain (in)": "event_rain_in",
    "Daily Rain (in)": "daily_rain_in",
    "Weekly Rain (in)": "weekly_rain_in",
    "Monthly Rain (in)": "monthly_rain_in",
    "Yearly Rain (in)": "yearly_rain_in",
    "Total Rain (in)": "total_rain_in",
    "Relative Pressure (inHg)": "relative_pressure_inhg",
    "Absolute Pressure (inHg)": "absolute_pressure_inhg",
    "Humidity (%)": "humidity_pct",
    "Ultra-Violet Radiation Index": "uv_index",
    "Solar Radiation (W/m^2)": "solar_radiation_wm2",
    "Indoor Temperature (°F)": "indoor_temp_f",
    "Indoor Humidity (%)": "indoor_humidity_pct",
    "Indoor Feels Like (°F)": "indoor_feels_like_f",
    "Indoor Dew Point (°F)": "indoor_dew_point_f",
    "Sensor 1 Temperature (°F)": "sensor1_temp_f",
    "Sensor 1 Humidity (%)": "sensor1_humidity_pct",
    "Sensor 1 Feels Like (°F)": "sensor1_feels_like_f",
    "Sensor 1 Dew Point (°F)": "sensor1_dew_point_f",
    "Outdoor Battery": "outdoor_battery",
    "Sensor 1 Battery": "sensor1_battery",
}


def parse_csv_file(csv_path: Path) -> List[Dict]:
    """Parse CSV file and return list of normalized readings"""
    readings = []

    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)

        for row in reader:
            normalized = {}

            for csv_col, db_field in CSV_FIELD_MAPPING.items():
                if csv_col in row and row[csv_col]:
                    value = row[csv_col]

                    # Parse timestamp
                    if db_field == "timestamp":
                        normalized[db_field] = parser.parse(value)
                    # Parse integers
                    elif db_field in ["wind_direction_deg", "humidity_pct",
                                     "indoor_humidity_pct", "sensor1_humidity_pct",
                                     "outdoor_battery", "sensor1_battery"]:
                        try:
                            normalized[db_field] = int(float(value))
                        except (ValueError, TypeError):
                            normalized[db_field] = None
                    # Parse floats
                    else:
                        try:
                            normalized[db_field] = float(value)
                        except (ValueError, TypeError):
                            normalized[db_field] = None

            if "timestamp" in normalized:
                readings.append(normalized)

    return readings


def import_csv_data(csv_path: Path, db: Session) -> Dict[str, int]:
    """Import CSV data into database and return statistics"""
    readings = parse_csv_file(csv_path)

    if not db:
        # Return early for testing without db
        return {"total_rows": len(readings), "imported": 0, "duplicates": 0, "errors": 0}

    imported = 0
    duplicates = 0
    errors = 0

    # Batch insert with conflict handling
    for reading in readings:
        try:
            stmt = insert(WeatherReading).values(**reading)
            stmt = stmt.on_conflict_do_nothing(index_elements=['timestamp'])
            result = db.execute(stmt)

            if result.rowcount > 0:
                imported += 1
            else:
                duplicates += 1
        except Exception as e:
            logger.error(f"Error importing row: {e}")
            errors += 1

    db.commit()

    logger.info(f"Import complete: {imported} imported, {duplicates} duplicates, {errors} errors")

    return {
        "total_rows": len(readings),
        "imported": imported,
        "duplicates": duplicates,
        "errors": errors
    }
