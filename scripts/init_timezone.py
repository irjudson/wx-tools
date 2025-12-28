#!/usr/bin/env python3
"""Initialize default timezone setting in the database"""

from pathlib import Path
import sys

# Add parent directory to path for robust imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.exc import SQLAlchemyError
from src.database import SessionLocal
from src.services.config import get_timezone, set_timezone

def init_timezone():
    """Initialize the default timezone setting to UTC"""
    try:
        print("Initializing default timezone setting...")

        # Create database session
        db = SessionLocal()
        try:
            # Check if timezone is already configured
            existing = get_timezone(db)
            if existing != "UTC":
                # Already configured to non-default value
                print(f"Timezone already configured: {existing}")
            else:
                # Set default timezone to UTC
                set_timezone(db, "UTC")
                print("Initialized default timezone: UTC")
        finally:
            db.close()

    except ImportError as e:
        print(f"ERROR: Failed to import required modules: {e}")
        print("Make sure you have installed all dependencies: pip install -r requirements.txt")
        sys.exit(1)
    except SQLAlchemyError as e:
        print(f"ERROR: Database error occurred: {e}")
        print("Please check:")
        print("  1. PostgreSQL is running")
        print("  2. Database credentials are correct in .env file")
        print("  3. Database has been initialized (run scripts/init_db.py)")
        sys.exit(1)
    except ValueError as e:
        print(f"ERROR: Invalid timezone: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_timezone()
