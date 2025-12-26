#!/usr/bin/env python3
"""Initialize database with TimescaleDB hypertable"""

from sqlalchemy import create_engine, text
from src.config import get_settings
from src.database import Base
from src.models import WeatherReading, Configuration

def init_database():
    settings = get_settings()
    engine = create_engine(settings.database_url)

    # Create all tables
    print("Creating tables...")
    Base.metadata.create_all(engine)

    # Convert to hypertable
    print("Converting weather_readings to TimescaleDB hypertable...")
    with engine.connect() as conn:
        conn.execute(text(
            "SELECT create_hypertable('weather_readings', 'timestamp', "
            "if_not_exists => TRUE)"
        ))
        conn.commit()

        # Create indexes
        print("Creating indexes...")
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_solar_radiation "
            "ON weather_readings(timestamp, solar_radiation_wm2)"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS idx_wind_speed "
            "ON weather_readings(timestamp, wind_speed_mph)"
        ))
        conn.commit()

    print("Database initialization complete!")

if __name__ == "__main__":
    init_database()
