#!/usr/bin/env python3
"""Initialize database tables"""

import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError, ProgrammingError
from src.config import get_settings
from src.database import Base
from src.models import WeatherReading

def is_postgresql(engine):
    """Check if the database is PostgreSQL"""
    return engine.dialect.name == 'postgresql'

def check_timescaledb_available(engine):
    """Check if TimescaleDB extension is available (PostgreSQL only)"""
    if not is_postgresql(engine):
        return False

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
        print(f"Connecting to database: {settings.database_url.split('@')[1] if '@' in settings.database_url else 'SQLite'}...")

        engine = create_engine(settings.database_url)
        db_type = engine.dialect.name
        print(f"Database type: {db_type}")

        # Create all tables
        print("Creating tables...")
        Base.metadata.create_all(engine)

        # PostgreSQL-specific optimizations
        if is_postgresql(engine):
            # Check TimescaleDB availability
            print("Checking TimescaleDB availability...")
            if check_timescaledb_available(engine):
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

                    # Create PostgreSQL-specific indexes
                    print("Creating PostgreSQL indexes...")
                    conn.execute(text(
                        "CREATE INDEX IF NOT EXISTS idx_solar_radiation "
                        "ON weather_readings(timestamp, solar_radiation_wm2)"
                    ))
                    conn.execute(text(
                        "CREATE INDEX IF NOT EXISTS idx_wind_speed "
                        "ON weather_readings(timestamp, wind_speed_mph)"
                    ))
                    conn.commit()
            else:
                print("TimescaleDB not available, using standard PostgreSQL tables")
        else:
            print(f"Using {db_type} database (no TimescaleDB optimizations)")

        print("Database initialization complete!")

    except ImportError as e:
        print(f"ERROR: Failed to import required modules: {e}")
        print("Make sure you have installed all dependencies: pip install -r requirements.txt")
        sys.exit(1)
    except SQLAlchemyError as e:
        print(f"ERROR: Database error occurred: {e}")
        print("Please check:")
        print("  1. Database is accessible")
        print("  2. Database credentials are correct in .env file")
        print("  3. Required database exists or can be created")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_database()
