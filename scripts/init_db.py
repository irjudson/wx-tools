#!/usr/bin/env python3
"""Initialize database with TimescaleDB hypertable"""

import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError, ProgrammingError
from src.config import get_settings
from src.database import Base
from src.models import WeatherReading

def check_timescaledb_available(engine):
    """Check if TimescaleDB extension is available"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text(
                "SELECT * FROM pg_available_extensions WHERE name = 'timescaledb'"
            ))
            if result.fetchone() is None:
                return False
            return True
    except SQLAlchemyError:
        return False

def init_database():
    try:
        settings = get_settings()
        print(f"Connecting to database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'database'}...")

        engine = create_engine(settings.database_url)

        # Check TimescaleDB availability
        print("Checking TimescaleDB availability...")
        if not check_timescaledb_available(engine):
            print("ERROR: TimescaleDB extension is not available in this PostgreSQL instance.")
            print("Please install TimescaleDB first:")
            print("  - Visit: https://docs.timescale.com/install/latest/")
            print("  - Or run: CREATE EXTENSION timescaledb; in your database")
            sys.exit(1)

        # Create all tables
        print("Creating tables...")
        Base.metadata.create_all(engine)

        # Convert to hypertable
        print("Converting weather_readings to TimescaleDB hypertable...")
        with engine.connect() as conn:
            try:
                conn.execute(text(
                    "SELECT create_hypertable('weather_readings', 'timestamp', "
                    "if_not_exists => TRUE)"
                ))
                conn.commit()
            except ProgrammingError as e:
                if "already a hypertable" in str(e):
                    print("  (table already configured as hypertable)")
                    conn.rollback()
                else:
                    raise

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

    except ImportError as e:
        print(f"ERROR: Failed to import required modules: {e}")
        print("Make sure you have installed all dependencies: pip install -r requirements.txt")
        sys.exit(1)
    except SQLAlchemyError as e:
        print(f"ERROR: Database error occurred: {e}")
        print("Please check:")
        print("  1. PostgreSQL is running")
        print("  2. Database credentials are correct in .env file")
        print("  3. Database 'weather_data' exists")
        print("  4. TimescaleDB extension is installed")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_database()
