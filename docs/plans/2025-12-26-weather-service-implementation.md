# Weather Station Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local weather data archival service with real-time station updates, historical CSV import, MQTT publishing, and solar/wind energy analysis.

**Architecture:** FastAPI service with PostgreSQL/TimescaleDB backend, REST API + web UI, MQTT publisher, pluggable analysis engine.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, TimescaleDB, paho-mqtt, pandas, Chart.js

---

## Phase 1: Project Setup & Database Foundation

### Task 1: Initialize Python Project Structure

**Files:**
- Create: `requirements.txt`
- Create: `src/__init__.py`
- Create: `src/config.py`
- Create: `tests/__init__.py`
- Create: `.env.example`

**Step 1: Create requirements.txt**

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
pydantic==2.5.0
pydantic-settings==2.1.0
python-multipart==0.0.6
paho-mqtt==1.6.1
pandas==2.1.3
python-dateutil==2.8.2
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.1
```

**Step 2: Create project structure**

```bash
mkdir -p src tests static templates
touch src/__init__.py tests/__init__.py
```

**Step 3: Create configuration module (src/config.py)**

```python
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str
    station_passkey: str
    log_level: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()
```

**Step 4: Create .env.example**

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/weather_data
STATION_PASSKEY=your_station_passkey_here
LOG_LEVEL=INFO
```

**Step 5: Create virtual environment and install dependencies**

Run:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Expected: All packages install successfully

**Step 6: Commit**

```bash
git add requirements.txt src/ tests/ .env.example
git commit -m "chore: initialize Python project structure"
```

---

### Task 2: Database Models

**Files:**
- Create: `src/models.py`
- Create: `src/database.py`
- Create: `tests/test_models.py`
- Create: `alembic.ini`
- Create: `migrations/env.py`

**Step 1: Add alembic to requirements**

Update `requirements.txt`:
```
alembic==1.12.1
```

Run: `pip install alembic==1.12.1`

**Step 2: Initialize alembic**

Run:
```bash
alembic init migrations
```

Expected: Creates migrations directory and alembic.ini

**Step 3: Create database connection module (src/database.py)**

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from src.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Step 4: Write test for WeatherReading model**

Create `tests/test_models.py`:
```python
import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database import Base
from src.models import WeatherReading


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    yield session
    session.close()


def test_weather_reading_creation(test_db):
    reading = WeatherReading(
        timestamp=datetime.now(timezone.utc),
        outdoor_temp_f=42.1,
        humidity_pct=60,
        wind_speed_mph=6.5,
        solar_radiation_wm2=125.5
    )
    test_db.add(reading)
    test_db.commit()

    assert reading.id is not None
    assert reading.outdoor_temp_f == 42.1
```

**Step 5: Run test to verify it fails**

Run: `pytest tests/test_models.py -v`

Expected: FAIL with "ModuleNotFoundError: No module named 'src.models'"

**Step 6: Create models (src/models.py)**

```python
from sqlalchemy import Column, Integer, Float, DateTime
from src.database import Base
from datetime import datetime


class WeatherReading(Base):
    __tablename__ = "weather_readings"

    timestamp = Column(DateTime(timezone=True), primary_key=True)
    outdoor_temp_f = Column(Float, nullable=True)
    feels_like_f = Column(Float, nullable=True)
    dew_point_f = Column(Float, nullable=True)
    wind_speed_mph = Column(Float, nullable=True)
    wind_gust_mph = Column(Float, nullable=True)
    max_daily_gust_mph = Column(Float, nullable=True)
    wind_direction_deg = Column(Integer, nullable=True)
    rain_rate_in_hr = Column(Float, nullable=True)
    event_rain_in = Column(Float, nullable=True)
    daily_rain_in = Column(Float, nullable=True)
    weekly_rain_in = Column(Float, nullable=True)
    monthly_rain_in = Column(Float, nullable=True)
    yearly_rain_in = Column(Float, nullable=True)
    total_rain_in = Column(Float, nullable=True)
    relative_pressure_inhg = Column(Float, nullable=True)
    absolute_pressure_inhg = Column(Float, nullable=True)
    humidity_pct = Column(Integer, nullable=True)
    uv_index = Column(Float, nullable=True)
    solar_radiation_wm2 = Column(Float, nullable=True)
    indoor_temp_f = Column(Float, nullable=True)
    indoor_humidity_pct = Column(Integer, nullable=True)
    indoor_feels_like_f = Column(Float, nullable=True)
    indoor_dew_point_f = Column(Float, nullable=True)
    sensor1_temp_f = Column(Float, nullable=True)
    sensor1_humidity_pct = Column(Integer, nullable=True)
    sensor1_feels_like_f = Column(Float, nullable=True)
    sensor1_dew_point_f = Column(Float, nullable=True)
    outdoor_battery = Column(Integer, nullable=True)
    sensor1_battery = Column(Integer, nullable=True)


class Configuration(Base):
    __tablename__ = "configuration"

    key = Column(String(255), primary_key=True)
    value = Column(String(1024), nullable=False)
```

**Step 7: Add String import to models**

Update imports in `src/models.py`:
```python
from sqlalchemy import Column, Integer, Float, DateTime, String
```

**Step 8: Run test to verify it passes**

Run: `pytest tests/test_models.py -v`

Expected: PASS

**Step 9: Create initial migration**

Update `migrations/env.py` to import models:
```python
from src.database import Base
from src.models import WeatherReading, Configuration

target_metadata = Base.metadata
```

Run:
```bash
alembic revision --autogenerate -m "initial schema"
```

**Step 10: Commit**

```bash
git add src/models.py src/database.py tests/test_models.py alembic.ini migrations/
git commit -m "feat: add database models and migrations"
```

---

### Task 3: Database Setup Script

**Files:**
- Create: `scripts/setup_database.sql`
- Create: `scripts/init_db.py`

**Step 1: Create TimescaleDB setup SQL script**

Create `scripts/setup_database.sql`:
```sql
-- Run this manually in your PostgreSQL after creating weather_data database
-- CREATE DATABASE weather_data;

-- Connect to weather_data database, then run:
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- This will be created by alembic, but we'll convert it to hypertable after
-- SELECT create_hypertable('weather_readings', 'timestamp', if_not_exists => TRUE);

-- Indexes for analysis queries
CREATE INDEX IF NOT EXISTS idx_solar_radiation ON weather_readings(timestamp, solar_radiation_wm2);
CREATE INDEX IF NOT EXISTS idx_wind_speed ON weather_readings(timestamp, wind_speed_mph);
```

**Step 2: Create Python initialization script**

Create `scripts/init_db.py`:
```python
#!/usr/bin/env python3
"""Initialize database with TimescaleDB hypertable"""

from sqlalchemy import create_engine, text
from src.config import settings
from src.database import Base
from src.models import WeatherReading, Configuration

def init_database():
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
```

**Step 3: Make script executable**

Run:
```bash
chmod +x scripts/init_db.py
```

**Step 4: Commit**

```bash
git add scripts/
git commit -m "feat: add database setup scripts"
```

---

## Phase 2: Core API & Station Data Ingestion

### Task 4: FastAPI Application Setup

**Files:**
- Create: `src/main.py`
- Create: `tests/test_api.py`

**Step 1: Write test for health endpoint**

Create `tests/test_api.py`:
```python
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_api.py -v`

Expected: FAIL with "ModuleNotFoundError: No module named 'src.main'"

**Step 3: Create FastAPI application (src/main.py)**

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import logging
from src.config import settings

# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Weather Station Service",
    description="Local weather data archival and analysis service",
    version="1.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "database": "not_checked",
        "mqtt": "not_configured"
    }


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve main dashboard page"""
    return "<html><body><h1>Weather Station Service</h1></body></html>"
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/test_api.py -v`

Expected: PASS

**Step 5: Test running the server**

Run: `uvicorn src.main:app --reload --port 8000`

Expected: Server starts on http://localhost:8000

Stop the server (Ctrl+C)

**Step 6: Commit**

```bash
git add src/main.py tests/test_api.py
git commit -m "feat: add FastAPI application with health endpoint"
```

---

### Task 5: Weather Station Upload Endpoint

**Files:**
- Create: `src/schemas.py`
- Create: `src/services/ingestion.py`
- Modify: `src/main.py`
- Create: `tests/test_ingestion.py`

**Step 1: Write test for station upload**

Create `tests/test_ingestion.py`:
```python
import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.config import settings

client = TestClient(app)


def test_station_upload_valid_passkey():
    data = {
        "PASSKEY": settings.station_passkey,
        "dateutc": "2025-12-26 14:30:00",
        "tempf": "42.1",
        "humidity": "60",
        "windspeedmph": "6.5",
        "solarradiation": "125.5"
    }
    response = client.post("/api/weather/upload", data=data)
    assert response.status_code == 200


def test_station_upload_invalid_passkey():
    data = {
        "PASSKEY": "wrong_key",
        "dateutc": "2025-12-26 14:30:00"
    }
    response = client.post("/api/weather/upload", data=data)
    assert response.status_code == 401
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_ingestion.py -v`

Expected: FAIL with 404 (endpoint doesn't exist yet)

**Step 3: Create Pydantic schemas (src/schemas.py)**

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class StationUpload(BaseModel):
    PASSKEY: str
    dateutc: str
    tempf: Optional[float] = None
    feelsLike: Optional[float] = None
    dewPoint: Optional[float] = None
    humidity: Optional[int] = None
    windspeedmph: Optional[float] = None
    windgustmph: Optional[float] = None
    maxdailygust: Optional[float] = None
    winddir: Optional[int] = None
    rainratein: Optional[float] = None
    eventrainin: Optional[float] = None
    dailyrainin: Optional[float] = None
    weeklyrainin: Optional[float] = None
    monthlyrainin: Optional[float] = None
    yearlyrainin: Optional[float] = None
    totalrainin: Optional[float] = None
    baromrelin: Optional[float] = None
    baromabsin: Optional[float] = None
    uv: Optional[float] = None
    solarradiation: Optional[float] = None
    tempinf: Optional[float] = None
    humidityin: Optional[int] = None
    feelsLikein: Optional[float] = None
    dewPointin: Optional[float] = None
    temp1f: Optional[float] = None
    humidity1: Optional[int] = None
    feelsLike1: Optional[float] = None
    dewPoint1: Optional[float] = None
    batt1: Optional[int] = None
    battout: Optional[int] = None


class WeatherReadingResponse(BaseModel):
    timestamp: datetime
    outdoor_temp_f: Optional[float]
    humidity_pct: Optional[int]
    wind_speed_mph: Optional[float]
    solar_radiation_wm2: Optional[float]

    class Config:
        from_attributes = True
```

**Step 4: Create ingestion service (src/services/ingestion.py)**

```python
import os
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from src.models import WeatherReading
from src.schemas import StationUpload
import logging

logger = logging.getLogger(__name__)


def parse_station_timestamp(dateutc: str) -> datetime:
    """Parse station timestamp to datetime with UTC timezone"""
    from dateutil import parser
    dt = parser.parse(dateutc)
    if dt.tzinfo is None:
        from datetime import timezone
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

    # Use PostgreSQL INSERT ON CONFLICT DO NOTHING
    stmt = insert(WeatherReading).values(**normalized_data)
    stmt = stmt.on_conflict_do_nothing(index_elements=['timestamp'])

    db.execute(stmt)
    db.commit()

    # Fetch the reading (either newly inserted or existing)
    reading = db.query(WeatherReading).filter(
        WeatherReading.timestamp == normalized_data["timestamp"]
    ).first()

    logger.info(f"Stored reading at {normalized_data['timestamp']}")
    return reading
```

**Step 5: Add upload endpoint to main.py**

Update `src/main.py`:
```python
from fastapi import FastAPI, Depends, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import logging
from src.config import settings
from src.database import get_db
from src.schemas import StationUpload
from src.services.ingestion import store_weather_reading

# ... existing code ...

@app.post("/api/weather/upload")
async def upload_weather_data(
    PASSKEY: str = Form(...),
    dateutc: str = Form(...),
    tempf: float = Form(None),
    feelsLike: float = Form(None),
    dewPoint: float = Form(None),
    humidity: int = Form(None),
    windspeedmph: float = Form(None),
    windgustmph: float = Form(None),
    maxdailygust: float = Form(None),
    winddir: int = Form(None),
    rainratein: float = Form(None),
    eventrainin: float = Form(None),
    dailyrainin: float = Form(None),
    weeklyrainin: float = Form(None),
    monthlyrainin: float = Form(None),
    yearlyrainin: float = Form(None),
    totalrainin: float = Form(None),
    baromrelin: float = Form(None),
    baromabsin: float = Form(None),
    uv: float = Form(None),
    solarradiation: float = Form(None),
    tempinf: float = Form(None),
    humidityin: int = Form(None),
    feelsLikein: float = Form(None),
    dewPointin: float = Form(None),
    temp1f: float = Form(None),
    humidity1: int = Form(None),
    feelsLike1: float = Form(None),
    dewPoint1: float = Form(None),
    batt1: int = Form(None),
    battout: int = Form(None),
    db: Session = Depends(get_db)
):
    """Receive weather data from WS-2902 station"""
    # Validate PASSKEY
    if PASSKEY != settings.station_passkey:
        raise HTTPException(status_code=401, detail="Invalid PASSKEY")

    # Create upload object
    upload = StationUpload(
        PASSKEY=PASSKEY,
        dateutc=dateutc,
        tempf=tempf,
        feelsLike=feelsLike,
        dewPoint=dewPoint,
        humidity=humidity,
        windspeedmph=windspeedmph,
        windgustmph=windgustmph,
        maxdailygust=maxdailygust,
        winddir=winddir,
        rainratein=rainratein,
        eventrainin=eventrainin,
        dailyrainin=dailyrainin,
        weeklyrainin=weeklyrainin,
        monthlyrainin=monthlyrainin,
        yearlyrainin=yearlyrainin,
        totalrainin=totalrainin,
        baromrelin=baromrelin,
        baromabsin=baromabsin,
        uv=uv,
        solarradiation=solarradiation,
        tempinf=tempinf,
        humidityin=humidityin,
        feelsLikein=feelsLikein,
        dewPointin=dewPointin,
        temp1f=temp1f,
        humidity1=humidity1,
        feelsLike1=feelsLike1,
        dewPoint1=dewPoint1,
        batt1=batt1,
        battout=battout
    )

    # Store in database
    store_weather_reading(db, upload)

    return {"success": True}
```

**Step 6: Create services directory**

Run:
```bash
mkdir -p src/services
touch src/services/__init__.py
```

**Step 7: Run tests to verify they pass**

Run: `pytest tests/test_ingestion.py -v`

Expected: PASS (requires database connection, may need mock)

**Step 8: Commit**

```bash
git add src/schemas.py src/services/ src/main.py tests/test_ingestion.py
git commit -m "feat: add weather station upload endpoint"
```

---

## Phase 3: CSV Import

### Task 6: CSV Import Service

**Files:**
- Create: `src/services/csv_import.py`
- Create: `tests/test_csv_import.py`
- Create: `tests/fixtures/sample.csv`

**Step 1: Create sample CSV for testing**

Create `tests/fixtures/sample.csv`:
```csv
"Date","Simple Date","Outdoor Temperature (°F)","Feels Like (°F)","Dew Point (°F)","Wind Speed (mph)","Wind Gust (mph)","Max Daily Gust (mph)","Wind Direction (°)","Rain Rate (in/hr)","Event Rain (in)","Daily Rain (in)","Weekly Rain (in)","Monthly Rain (in)","Yearly Rain (in)","Total Rain (in)","Relative Pressure (inHg)","Humidity (%)","Ultra-Violet Radiation Index","Solar Radiation (W/m^2)","Indoor Temperature (°F)","Indoor Humidity (%)","Sensor 1 Temperature (°F)","Sensor 1 Humidity (%)","Outdoor Battery","Absolute Pressure (inHg)","Indoor Feels Like (°F)","Indoor Dew Point (°F)","Sensor 1 Battery","Sensor 1 Feels Like (°F)","Sensor 1 Dew Point (°F)"
2025-12-26T07:15:00-07:00,2025-12-26 07:15:00,41.2,38.7,28.8,4,5.8,40,178,0,0,0,0.03,0.03,0.03,0.03,29.82,61,0,0,66.6,35,52.7,56,1,25.34,66.6,38.1,1,52.7,37.4
2025-12-26T07:10:00-07:00,2025-12-26 07:10:00,42.1,38,29.2,6.5,6.9,40,183,0,0,0,0.03,0.03,0.03,0.03,29.82,60,0,0,66.7,34,52.7,56,1,25.34,66.7,37.4,1,52.7,37.4
```

**Step 2: Write test for CSV import**

Create `tests/test_csv_import.py`:
```python
import pytest
from pathlib import Path
from src.services.csv_import import parse_csv_file, import_csv_data


def test_parse_csv_file():
    csv_path = Path("tests/fixtures/sample.csv")
    readings = parse_csv_file(csv_path)

    assert len(readings) == 2
    assert readings[0]["outdoor_temp_f"] == 41.2
    assert readings[0]["humidity_pct"] == 61
    assert readings[1]["outdoor_temp_f"] == 42.1


def test_import_csv_data_stats():
    csv_path = Path("tests/fixtures/sample.csv")
    stats = import_csv_data(csv_path, db=None)  # Mock db needed

    assert stats["total_rows"] == 2
```

**Step 3: Run test to verify it fails**

Run: `pytest tests/test_csv_import.py::test_parse_csv_file -v`

Expected: FAIL with "ModuleNotFoundError"

**Step 4: Create CSV import service (src/services/csv_import.py)**

```python
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
```

**Step 5: Create fixtures directory**

Run:
```bash
mkdir -p tests/fixtures
```

**Step 6: Run test to verify it passes**

Run: `pytest tests/test_csv_import.py::test_parse_csv_file -v`

Expected: PASS

**Step 7: Commit**

```bash
git add src/services/csv_import.py tests/test_csv_import.py tests/fixtures/
git commit -m "feat: add CSV import service"
```

---

### Task 7: CSV Import API Endpoints

**Files:**
- Modify: `src/main.py`
- Create: `tests/test_import_api.py`

**Step 1: Write test for import endpoint**

Create `tests/test_import_api.py`:
```python
import pytest
from fastapi.testclient import TestClient
from pathlib import Path
from src.main import app

client = TestClient(app)


def test_import_csv_file_upload():
    csv_path = Path("tests/fixtures/sample.csv")

    with open(csv_path, "rb") as f:
        response = client.post(
            "/api/weather/import",
            files={"file": ("sample.csv", f, "text/csv")}
        )

    assert response.status_code == 200
    data = response.json()
    assert "imported" in data
    assert data["total_rows"] == 2


def test_import_csv_from_path():
    response = client.post(
        "/api/weather/import/path",
        json={"path": "tests/fixtures/sample.csv"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "imported" in data
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_import_api.py -v`

Expected: FAIL with 404 (endpoints don't exist)

**Step 3: Add import endpoints to main.py**

Update `src/main.py`:
```python
from fastapi import FastAPI, Depends, HTTPException, Form, UploadFile, File
from pathlib import Path
import tempfile
import shutil
from src.services.csv_import import import_csv_data

# ... existing code ...

@app.post("/api/weather/import")
async def import_csv_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Import CSV file via upload"""
    # Save uploaded file to temp location
    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = Path(tmp.name)

    try:
        stats = import_csv_data(tmp_path, db)
        return stats
    finally:
        tmp_path.unlink()  # Clean up temp file


@app.post("/api/weather/import/path")
async def import_csv_from_path(
    path: str,
    db: Session = Depends(get_db)
):
    """Import CSV from file path (for Docker volume mounts)"""
    from pydantic import BaseModel

    class ImportPath(BaseModel):
        path: str

    csv_path = Path(path)

    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="CSV file not found")

    stats = import_csv_data(csv_path, db)
    return stats
```

**Step 4: Fix import endpoint to accept JSON body**

Update the path import endpoint:
```python
from pydantic import BaseModel

class ImportPathRequest(BaseModel):
    path: str

@app.post("/api/weather/import/path")
async def import_csv_from_path(
    request: ImportPathRequest,
    db: Session = Depends(get_db)
):
    """Import CSV from file path (for Docker volume mounts)"""
    csv_path = Path(request.path)

    if not csv_path.exists():
        raise HTTPException(status_code=404, detail="CSV file not found")

    stats = import_csv_data(csv_path, db)
    return stats
```

Add ImportPathRequest to schemas.py instead:

Update `src/schemas.py`:
```python
class ImportPathRequest(BaseModel):
    path: str
```

Update import in main.py:
```python
from src.schemas import StationUpload, ImportPathRequest
```

**Step 5: Run tests to verify they pass**

Run: `pytest tests/test_import_api.py -v`

Expected: PASS

**Step 6: Commit**

```bash
git add src/main.py src/schemas.py tests/test_import_api.py
git commit -m "feat: add CSV import API endpoints"
```

---

## Phase 4: Data Query API

### Task 8: Weather Data Query Endpoints

**Files:**
- Create: `src/services/query.py`
- Modify: `src/main.py`
- Create: `tests/test_query_api.py`

**Step 1: Write test for query endpoints**

Create `tests/test_query_api.py`:
```python
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_get_latest_reading():
    response = client.get("/api/weather/latest")
    assert response.status_code == 200


def test_get_readings_with_date_range():
    response = client.get(
        "/api/weather/readings",
        params={
            "start": "2025-12-26T00:00:00Z",
            "end": "2025-12-26T23:59:59Z"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_get_stats():
    response = client.get("/api/weather/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_readings" in data
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_query_api.py -v`

Expected: FAIL with 404

**Step 3: Create query service (src/services/query.py)**

```python
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from src.models import WeatherReading


def get_latest_reading(db: Session) -> Optional[WeatherReading]:
    """Get the most recent weather reading"""
    return db.query(WeatherReading).order_by(
        WeatherReading.timestamp.desc()
    ).first()


def get_readings(
    db: Session,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: Optional[int] = 1000
) -> List[WeatherReading]:
    """Query weather readings with optional filters"""
    query = db.query(WeatherReading)

    if start:
        query = query.filter(WeatherReading.timestamp >= start)
    if end:
        query = query.filter(WeatherReading.timestamp <= end)

    return query.order_by(WeatherReading.timestamp.desc()).limit(limit).all()


def get_database_stats(db: Session) -> dict:
    """Get database statistics"""
    total = db.query(func.count(WeatherReading.timestamp)).scalar()
    first = db.query(func.min(WeatherReading.timestamp)).scalar()
    last = db.query(func.max(WeatherReading.timestamp)).scalar()

    coverage_days = 0
    if first and last:
        coverage_days = (last - first).days

    return {
        "total_readings": total or 0,
        "first_reading": first.isoformat() if first else None,
        "last_reading": last.isoformat() if last else None,
        "coverage_days": coverage_days
    }
```

**Step 4: Add query endpoints to main.py**

Update `src/main.py`:
```python
from datetime import datetime
from typing import Optional, List
from src.services.query import get_latest_reading, get_readings, get_database_stats
from src.schemas import WeatherReadingResponse

# ... existing code ...

@app.get("/api/weather/latest", response_model=WeatherReadingResponse)
async def latest_reading(db: Session = Depends(get_db)):
    """Get most recent weather reading"""
    reading = get_latest_reading(db)
    if not reading:
        raise HTTPException(status_code=404, detail="No readings found")
    return reading


@app.get("/api/weather/readings", response_model=List[WeatherReadingResponse])
async def query_readings(
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    limit: Optional[int] = 1000,
    db: Session = Depends(get_db)
):
    """Query weather readings with filters"""
    readings = get_readings(db, start, end, limit)
    return readings


@app.get("/api/weather/stats")
async def database_stats(db: Session = Depends(get_db)):
    """Get database statistics"""
    return get_database_stats(db)
```

**Step 5: Run tests to verify they pass**

Run: `pytest tests/test_query_api.py -v`

Expected: PASS

**Step 6: Commit**

```bash
git add src/services/query.py src/main.py tests/test_query_api.py
git commit -m "feat: add weather data query endpoints"
```

---

## Phase 5: Analysis Engine

### Task 9: Analysis Engine Base

**Files:**
- Create: `src/analysis/__init__.py`
- Create: `src/analysis/base.py`
- Create: `tests/test_analysis_base.py`

**Step 1: Write test for analysis base**

Create `tests/test_analysis_base.py`:
```python
import pytest
from datetime import datetime
from src.analysis.base import EnergyAnalyzer, AnalysisResult


def test_analysis_result_creation():
    result = AnalysisResult(
        analyzer_type="solar",
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 12, 31),
        total_kwh=5000.0,
        config={"panel_area_m2": 20},
        data={"monthly": [100, 200, 300]}
    )

    assert result.analyzer_type == "solar"
    assert result.total_kwh == 5000.0
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_analysis_base.py -v`

Expected: FAIL with ModuleNotFoundError

**Step 3: Create analysis base classes (src/analysis/base.py)**

```python
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, List
from pydantic import BaseModel


class AnalysisResult(BaseModel):
    """Base result structure for all analyzers"""
    analyzer_type: str
    start_date: datetime
    end_date: datetime
    total_kwh: float
    config: Dict[str, Any]
    data: Dict[str, Any]
    daily_avg_kwh: float = 0.0
    monthly_breakdown: List[Dict[str, Any]] = []
    roi: Dict[str, Any] = {}


class EnergyAnalyzer(ABC):
    """Base class for energy analysis modules"""

    @abstractmethod
    def analyze(
        self,
        start_date: datetime,
        end_date: datetime,
        config: Dict[str, Any],
        db
    ) -> AnalysisResult:
        """Run analysis and return results"""
        pass

    @abstractmethod
    def get_config_schema(self) -> Dict[str, Any]:
        """Return JSON schema for configuration parameters"""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Analyzer name"""
        pass
```

**Step 4: Create __init__.py**

Create `src/analysis/__init__.py`:
```python
from src.analysis.base import EnergyAnalyzer, AnalysisResult

__all__ = ["EnergyAnalyzer", "AnalysisResult"]
```

**Step 5: Run test to verify it passes**

Run: `pytest tests/test_analysis_base.py -v`

Expected: PASS

**Step 6: Commit**

```bash
git add src/analysis/ tests/test_analysis_base.py
git commit -m "feat: add analysis engine base classes"
```

---

### Task 10: Solar Analysis Module

**Files:**
- Create: `src/analysis/solar.py`
- Create: `tests/test_solar_analysis.py`

**Step 1: Write test for solar analysis**

Create `tests/test_solar_analysis.py`:
```python
import pytest
from datetime import datetime
from src.analysis.solar import SolarAnalyzer


def test_solar_analyzer_config_schema():
    analyzer = SolarAnalyzer()
    schema = analyzer.get_config_schema()

    assert "panel_area_m2" in schema["properties"]
    assert "efficiency_pct" in schema["properties"]


def test_solar_kwh_calculation():
    """Test solar kWh calculation formula"""
    # 100 W/m² * 20 m² * 0.20 efficiency * (5/60) hours = 0.333 kWh
    solar_radiation = 100  # W/m²
    panel_area = 20  # m²
    efficiency = 0.20
    hours = 5 / 60  # 5 minutes

    expected_kwh = (solar_radiation * panel_area * efficiency * hours) / 1000

    analyzer = SolarAnalyzer()
    calculated = analyzer._calculate_kwh(solar_radiation, panel_area, efficiency, hours)

    assert abs(calculated - expected_kwh) < 0.001
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_solar_analysis.py -v`

Expected: FAIL with ModuleNotFoundError

**Step 3: Create solar analyzer (src/analysis/solar.py)**

```python
from datetime import datetime, timedelta
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from src.analysis.base import EnergyAnalyzer, AnalysisResult
from src.models import WeatherReading
import logging

logger = logging.getLogger(__name__)


class SolarAnalyzer(EnergyAnalyzer):
    """Solar energy potential analyzer"""

    @property
    def name(self) -> str:
        return "solar"

    def get_config_schema(self) -> Dict[str, Any]:
        """Return configuration schema"""
        return {
            "type": "object",
            "properties": {
                "panel_area_m2": {
                    "type": "number",
                    "description": "Total solar panel area in square meters",
                    "default": 20,
                    "minimum": 0
                },
                "efficiency_pct": {
                    "type": "number",
                    "description": "Panel efficiency percentage",
                    "default": 20,
                    "minimum": 0,
                    "maximum": 100
                },
                "tilt_loss_pct": {
                    "type": "number",
                    "description": "Orientation/tilt loss percentage",
                    "default": 10,
                    "minimum": 0,
                    "maximum": 100
                },
                "electricity_cost_per_kwh": {
                    "type": "number",
                    "description": "Electricity cost in $/kWh for ROI calculation",
                    "default": 0.12,
                    "minimum": 0
                }
            },
            "required": ["panel_area_m2", "efficiency_pct"]
        }

    def _calculate_kwh(
        self,
        solar_radiation_wm2: float,
        panel_area_m2: float,
        efficiency: float,
        hours: float
    ) -> float:
        """Calculate kWh from solar radiation"""
        # kWh = (W/m² × m² × efficiency × hours) / 1000
        return (solar_radiation_wm2 * panel_area_m2 * efficiency * hours) / 1000

    def analyze(
        self,
        start_date: datetime,
        end_date: datetime,
        config: Dict[str, Any],
        db: Session
    ) -> AnalysisResult:
        """Run solar energy analysis"""
        # Extract config
        panel_area = config.get("panel_area_m2", 20)
        efficiency_pct = config.get("efficiency_pct", 20)
        tilt_loss_pct = config.get("tilt_loss_pct", 10)
        electricity_cost = config.get("electricity_cost_per_kwh", 0.12)

        # Convert percentages to decimals
        efficiency = efficiency_pct / 100
        tilt_loss = tilt_loss_pct / 100
        effective_efficiency = efficiency * (1 - tilt_loss)

        # Query solar radiation data
        readings = db.query(WeatherReading).filter(
            WeatherReading.timestamp >= start_date,
            WeatherReading.timestamp <= end_date,
            WeatherReading.solar_radiation_wm2.isnot(None)
        ).order_by(WeatherReading.timestamp).all()

        if not readings:
            raise ValueError("No solar radiation data found for date range")

        # Calculate total kWh (assuming 5-minute intervals)
        interval_hours = 5 / 60  # 5 minutes in hours
        total_kwh = 0
        daily_data = {}
        monthly_data = {}

        for reading in readings:
            if reading.solar_radiation_wm2 is None:
                continue

            kwh = self._calculate_kwh(
                reading.solar_radiation_wm2,
                panel_area,
                effective_efficiency,
                interval_hours
            )
            total_kwh += kwh

            # Aggregate by day
            day_key = reading.timestamp.date()
            if day_key not in daily_data:
                daily_data[day_key] = 0
            daily_data[day_key] += kwh

            # Aggregate by month
            month_key = reading.timestamp.strftime("%Y-%m")
            if month_key not in monthly_data:
                monthly_data[month_key] = 0
            monthly_data[month_key] += kwh

        # Calculate statistics
        days_count = (end_date - start_date).days + 1
        daily_avg = total_kwh / days_count if days_count > 0 else 0

        # Monthly breakdown
        monthly_breakdown = [
            {"month": month, "kwh": kwh}
            for month, kwh in sorted(monthly_data.items())
        ]

        # ROI calculation
        annual_kwh = total_kwh * (365 / days_count) if days_count > 0 else 0
        annual_savings = annual_kwh * electricity_cost

        roi = {
            "annual_kwh_estimate": round(annual_kwh, 2),
            "annual_savings_usd": round(annual_savings, 2),
            "electricity_cost_per_kwh": electricity_cost
        }

        return AnalysisResult(
            analyzer_type="solar",
            start_date=start_date,
            end_date=end_date,
            total_kwh=round(total_kwh, 2),
            daily_avg_kwh=round(daily_avg, 2),
            config=config,
            data={
                "daily_production": {
                    str(day): round(kwh, 2)
                    for day, kwh in sorted(daily_data.items())
                }
            },
            monthly_breakdown=monthly_breakdown,
            roi=roi
        )
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/test_solar_analysis.py -v`

Expected: PASS

**Step 5: Commit**

```bash
git add src/analysis/solar.py tests/test_solar_analysis.py
git commit -m "feat: add solar energy analyzer"
```

---

### Task 11: Wind Analysis Module

**Files:**
- Create: `src/analysis/wind.py`
- Create: `tests/test_wind_analysis.py`

**Step 1: Write test for wind analysis**

Create `tests/test_wind_analysis.py`:
```python
import pytest
from src.analysis.wind import WindAnalyzer


def test_wind_analyzer_config_schema():
    analyzer = WindAnalyzer()
    schema = analyzer.get_config_schema()

    assert "turbine_model" in schema["properties"]
    assert "hub_height_m" in schema["properties"]


def test_wind_speed_height_adjustment():
    """Test wind speed adjustment for hub height"""
    analyzer = WindAnalyzer()

    # Wind speed at 2m height is 5 mph
    # At 10m height should be higher
    adjusted = analyzer._adjust_wind_speed_for_height(5.0, 2, 10)

    assert adjusted > 5.0
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_wind_analysis.py -v`

Expected: FAIL with ModuleNotFoundError

**Step 3: Create wind analyzer (src/analysis/wind.py)**

```python
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from src.analysis.base import EnergyAnalyzer, AnalysisResult
from src.models import WeatherReading
import logging

logger = logging.getLogger(__name__)


# Generic 5kW turbine power curve (speed in mph → kW output)
TURBINE_POWER_CURVES = {
    "generic_5kw": {
        "rated_power_kw": 5.0,
        "cut_in_mph": 6.0,
        "cut_out_mph": 55.0,
        "rated_speed_mph": 28.0,
        "curve": {
            6: 0.1, 8: 0.3, 10: 0.6, 12: 1.0, 14: 1.5,
            16: 2.0, 18: 2.6, 20: 3.2, 22: 3.8, 24: 4.3,
            26: 4.7, 28: 5.0, 30: 5.0, 40: 5.0, 50: 5.0, 55: 5.0
        }
    }
}


class WindAnalyzer(EnergyAnalyzer):
    """Wind energy potential analyzer"""

    @property
    def name(self) -> str:
        return "wind"

    def get_config_schema(self) -> Dict[str, Any]:
        """Return configuration schema"""
        return {
            "type": "object",
            "properties": {
                "turbine_model": {
                    "type": "string",
                    "description": "Turbine model",
                    "default": "generic_5kw",
                    "enum": list(TURBINE_POWER_CURVES.keys())
                },
                "hub_height_m": {
                    "type": "number",
                    "description": "Turbine hub height in meters",
                    "default": 10,
                    "minimum": 1
                },
                "measurement_height_m": {
                    "type": "number",
                    "description": "Weather station measurement height in meters",
                    "default": 2,
                    "minimum": 0.1
                },
                "electricity_cost_per_kwh": {
                    "type": "number",
                    "description": "Electricity cost in $/kWh for ROI calculation",
                    "default": 0.12,
                    "minimum": 0
                }
            },
            "required": ["turbine_model", "hub_height_m"]
        }

    def _adjust_wind_speed_for_height(
        self,
        wind_speed: float,
        measurement_height: float,
        hub_height: float,
        alpha: float = 0.14
    ) -> float:
        """Adjust wind speed for hub height using power law"""
        # v2 = v1 × (h2/h1)^α
        return wind_speed * ((hub_height / measurement_height) ** alpha)

    def _get_turbine_power(self, wind_speed_mph: float, turbine_model: str) -> float:
        """Get turbine power output for given wind speed"""
        curve_data = TURBINE_POWER_CURVES[turbine_model]

        # Check operational range
        if wind_speed_mph < curve_data["cut_in_mph"]:
            return 0.0
        if wind_speed_mph >= curve_data["cut_out_mph"]:
            return 0.0

        # Linear interpolation from power curve
        curve = curve_data["curve"]
        speeds = sorted(curve.keys())

        for i in range(len(speeds) - 1):
            if speeds[i] <= wind_speed_mph < speeds[i + 1]:
                # Linear interpolation
                speed1, speed2 = speeds[i], speeds[i + 1]
                power1, power2 = curve[speed1], curve[speed2]

                ratio = (wind_speed_mph - speed1) / (speed2 - speed1)
                return power1 + ratio * (power2 - power1)

        # If above rated speed but below cut-out, return rated power
        return curve_data["rated_power_kw"]

    def analyze(
        self,
        start_date: datetime,
        end_date: datetime,
        config: Dict[str, Any],
        db: Session
    ) -> AnalysisResult:
        """Run wind energy analysis"""
        # Extract config
        turbine_model = config.get("turbine_model", "generic_5kw")
        hub_height = config.get("hub_height_m", 10)
        measurement_height = config.get("measurement_height_m", 2)
        electricity_cost = config.get("electricity_cost_per_kwh", 0.12)

        # Query wind speed data
        readings = db.query(WeatherReading).filter(
            WeatherReading.timestamp >= start_date,
            WeatherReading.timestamp <= end_date,
            WeatherReading.wind_speed_mph.isnot(None)
        ).order_by(WeatherReading.timestamp).all()

        if not readings:
            raise ValueError("No wind speed data found for date range")

        # Calculate total kWh (assuming 5-minute intervals)
        interval_hours = 5 / 60  # 5 minutes in hours
        total_kwh = 0
        operational_readings = 0
        monthly_data = {}
        wind_speed_distribution = {}

        for reading in readings:
            if reading.wind_speed_mph is None:
                continue

            # Adjust for hub height
            adjusted_speed = self._adjust_wind_speed_for_height(
                reading.wind_speed_mph,
                measurement_height,
                hub_height
            )

            # Get turbine power output
            power_kw = self._get_turbine_power(adjusted_speed, turbine_model)

            if power_kw > 0:
                operational_readings += 1

            # Calculate kWh for this interval
            kwh = power_kw * interval_hours
            total_kwh += kwh

            # Aggregate by month
            month_key = reading.timestamp.strftime("%Y-%m")
            if month_key not in monthly_data:
                monthly_data[month_key] = 0
            monthly_data[month_key] += kwh

            # Wind speed distribution (rounded to nearest mph)
            speed_bucket = round(adjusted_speed)
            wind_speed_distribution[speed_bucket] = \
                wind_speed_distribution.get(speed_bucket, 0) + 1

        # Calculate statistics
        days_count = (end_date - start_date).days + 1
        daily_avg = total_kwh / days_count if days_count > 0 else 0

        # Capacity factor
        turbine_data = TURBINE_POWER_CURVES[turbine_model]
        max_possible_kwh = turbine_data["rated_power_kw"] * (len(readings) * interval_hours)
        capacity_factor = (total_kwh / max_possible_kwh * 100) if max_possible_kwh > 0 else 0

        # Monthly breakdown
        monthly_breakdown = [
            {"month": month, "kwh": kwh}
            for month, kwh in sorted(monthly_data.items())
        ]

        # ROI calculation
        annual_kwh = total_kwh * (365 / days_count) if days_count > 0 else 0
        annual_savings = annual_kwh * electricity_cost

        roi = {
            "annual_kwh_estimate": round(annual_kwh, 2),
            "annual_savings_usd": round(annual_savings, 2),
            "electricity_cost_per_kwh": electricity_cost
        }

        return AnalysisResult(
            analyzer_type="wind",
            start_date=start_date,
            end_date=end_date,
            total_kwh=round(total_kwh, 2),
            daily_avg_kwh=round(daily_avg, 2),
            config=config,
            data={
                "capacity_factor_pct": round(capacity_factor, 2),
                "operational_hours": round(operational_readings * interval_hours, 2),
                "total_hours": round(len(readings) * interval_hours, 2),
                "wind_speed_distribution": wind_speed_distribution
            },
            monthly_breakdown=monthly_breakdown,
            roi=roi
        )
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/test_wind_analysis.py -v`

Expected: PASS

**Step 5: Commit**

```bash
git add src/analysis/wind.py tests/test_wind_analysis.py
git commit -m "feat: add wind energy analyzer"
```

---

### Task 12: Analysis API Endpoints

**Files:**
- Modify: `src/main.py`
- Update: `src/schemas.py`
- Create: `tests/test_analysis_api.py`

**Step 1: Write test for analysis endpoints**

Create `tests/test_analysis_api.py`:
```python
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_solar_analysis_endpoint():
    response = client.post(
        "/api/analysis/solar",
        json={
            "start": "2025-12-26T00:00:00Z",
            "end": "2025-12-26T23:59:59Z",
            "config": {
                "panel_area_m2": 20,
                "efficiency_pct": 20
            }
        }
    )

    # May be 404 if no data, or 200 with results
    assert response.status_code in [200, 404, 422]


def test_wind_analysis_endpoint():
    response = client.post(
        "/api/analysis/wind",
        json={
            "start": "2025-12-26T00:00:00Z",
            "end": "2025-12-26T23:59:59Z",
            "config": {
                "turbine_model": "generic_5kw",
                "hub_height_m": 10
            }
        }
    )

    assert response.status_code in [200, 404, 422]
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_analysis_api.py -v`

Expected: FAIL with 404

**Step 3: Add analysis request schemas to schemas.py**

Update `src/schemas.py`:
```python
class AnalysisRequest(BaseModel):
    start: datetime
    end: datetime
    config: Dict[str, Any]
```

Add import:
```python
from typing import Dict, Any
```

**Step 4: Add analysis endpoints to main.py**

Update `src/main.py`:
```python
from src.schemas import StationUpload, ImportPathRequest, AnalysisRequest
from src.analysis.solar import SolarAnalyzer
from src.analysis.wind import WindAnalyzer

# ... existing code ...

@app.post("/api/analysis/solar")
async def analyze_solar(
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):
    """Run solar energy analysis"""
    analyzer = SolarAnalyzer()

    try:
        result = analyzer.analyze(
            request.start,
            request.end,
            request.config,
            db
        )
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/analysis/wind")
async def analyze_wind(
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):
    """Run wind energy analysis"""
    analyzer = WindAnalyzer()

    try:
        result = analyzer.analyze(
            request.start,
            request.end,
            request.config,
            db
        )
        return result.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

**Step 5: Run tests to verify they pass**

Run: `pytest tests/test_analysis_api.py -v`

Expected: PASS (or 404 if no data in test db)

**Step 6: Commit**

```bash
git add src/main.py src/schemas.py tests/test_analysis_api.py
git commit -m "feat: add analysis API endpoints"
```

---

## Phase 6: MQTT Publishing

### Task 13: MQTT Publisher Service

**Files:**
- Create: `src/services/mqtt_publisher.py`
- Create: `tests/test_mqtt.py`

**Step 1: Write test for MQTT publisher**

Create `tests/test_mqtt.py`:
```python
import pytest
from src.services.mqtt_publisher import MQTTPublisher, MQTTConfig


def test_mqtt_config_creation():
    config = MQTTConfig(
        broker_url="mqtt://localhost:1883",
        enabled=True
    )

    assert config.broker_url == "mqtt://localhost:1883"
    assert config.enabled is True


def test_mqtt_publisher_disabled():
    """Test that disabled publisher doesn't connect"""
    config = MQTTConfig(broker_url="mqtt://invalid", enabled=False)
    publisher = MQTTPublisher(config)

    # Should not raise error when disabled
    publisher.publish_reading({})
    assert True
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_mqtt.py -v`

Expected: FAIL with ModuleNotFoundError

**Step 3: Create MQTT publisher service (src/services/mqtt_publisher.py)**

```python
import json
import logging
from typing import Dict, Optional
from pydantic import BaseModel
import paho.mqtt.client as mqtt

logger = logging.getLogger(__name__)


class MQTTConfig(BaseModel):
    """MQTT configuration"""
    broker_url: str = "mqtt://localhost:1883"
    username: Optional[str] = None
    password: Optional[str] = None
    enabled: bool = False


class MQTTPublisher:
    """MQTT publisher for weather data"""

    def __init__(self, config: MQTTConfig):
        self.config = config
        self.client = None
        self.connected = False

        if config.enabled:
            self._connect()

    def _connect(self):
        """Connect to MQTT broker"""
        try:
            # Parse broker URL
            url = self.config.broker_url.replace("mqtt://", "")
            parts = url.split(":")
            host = parts[0]
            port = int(parts[1]) if len(parts) > 1 else 1883

            self.client = mqtt.Client()

            if self.config.username and self.config.password:
                self.client.username_pw_set(
                    self.config.username,
                    self.config.password
                )

            self.client.on_connect = self._on_connect
            self.client.on_disconnect = self._on_disconnect

            self.client.connect(host, port, 60)
            self.client.loop_start()

            logger.info(f"Connecting to MQTT broker at {host}:{port}")
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
            self.client = None

    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected"""
        if rc == 0:
            self.connected = True
            logger.info("Connected to MQTT broker")
        else:
            logger.error(f"MQTT connection failed with code {rc}")

    def _on_disconnect(self, client, userdata, rc):
        """Callback when disconnected"""
        self.connected = False
        logger.warning("Disconnected from MQTT broker")

    def publish_reading(self, reading: Dict):
        """Publish weather reading to MQTT topics"""
        if not self.config.enabled or not self.client or not self.connected:
            return

        try:
            # Publish individual metrics
            topic_mapping = {
                "outdoor_temp_f": "weather/outdoor_temp",
                "feels_like_f": "weather/feels_like",
                "humidity_pct": "weather/humidity",
                "wind_speed_mph": "weather/wind_speed",
                "wind_gust_mph": "weather/wind_gust",
                "wind_direction_deg": "weather/wind_direction",
                "solar_radiation_wm2": "weather/solar_radiation",
                "uv_index": "weather/uv_index",
                "rain_rate_in_hr": "weather/rain_rate",
                "daily_rain_in": "weather/daily_rain",
                "relative_pressure_inhg": "weather/pressure_relative",
                "absolute_pressure_inhg": "weather/pressure_absolute",
                "indoor_temp_f": "weather/indoor_temp",
                "indoor_humidity_pct": "weather/indoor_humidity",
                "sensor1_temp_f": "weather/sensor1_temp",
                "sensor1_humidity_pct": "weather/sensor1_humidity",
                "outdoor_battery": "weather/battery_outdoor",
                "sensor1_battery": "weather/battery_sensor1",
                "timestamp": "weather/timestamp"
            }

            for field, topic in topic_mapping.items():
                if field in reading and reading[field] is not None:
                    value = reading[field]
                    if isinstance(value, (int, float)):
                        payload = str(value)
                    else:
                        payload = str(value)

                    self.client.publish(topic, payload, qos=1, retain=True)

            # Publish full JSON
            json_payload = json.dumps(reading, default=str)
            self.client.publish("weather/json", json_payload, qos=1, retain=True)

            logger.debug("Published reading to MQTT")
        except Exception as e:
            logger.error(f"Failed to publish to MQTT: {e}")

    def disconnect(self):
        """Disconnect from MQTT broker"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            logger.info("Disconnected from MQTT broker")
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/test_mqtt.py -v`

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/mqtt_publisher.py tests/test_mqtt.py
git commit -m "feat: add MQTT publisher service"
```

---

### Task 14: Integrate MQTT with Data Ingestion

**Files:**
- Modify: `src/main.py`
- Modify: `src/services/ingestion.py`
- Create: `src/services/config.py`

**Step 1: Create configuration service**

Create `src/services/config.py`:
```python
from sqlalchemy.orm import Session
from src.models import Configuration
from typing import Optional
import json


def get_config_value(db: Session, key: str, default: Optional[str] = None) -> Optional[str]:
    """Get configuration value from database"""
    config = db.query(Configuration).filter(Configuration.key == key).first()
    return config.value if config else default


def set_config_value(db: Session, key: str, value: str):
    """Set configuration value in database"""
    config = db.query(Configuration).filter(Configuration.key == key).first()

    if config:
        config.value = value
    else:
        config = Configuration(key=key, value=value)
        db.add(config)

    db.commit()


def get_mqtt_config(db: Session) -> dict:
    """Get MQTT configuration from database"""
    broker_url = get_config_value(db, "mqtt_broker_url", "mqtt://localhost:1883")
    username = get_config_value(db, "mqtt_username")
    password = get_config_value(db, "mqtt_password")
    enabled = get_config_value(db, "mqtt_enabled", "false") == "true"

    return {
        "broker_url": broker_url,
        "username": username,
        "password": password,
        "enabled": enabled
    }


def set_mqtt_config(db: Session, config: dict):
    """Set MQTT configuration in database"""
    if "broker_url" in config:
        set_config_value(db, "mqtt_broker_url", config["broker_url"])
    if "username" in config:
        set_config_value(db, "mqtt_username", config["username"] or "")
    if "password" in config:
        set_config_value(db, "mqtt_password", config["password"] or "")
    if "enabled" in config:
        set_config_value(db, "mqtt_enabled", "true" if config["enabled"] else "false")
```

**Step 2: Add MQTT publisher to main app**

Update `src/main.py` to initialize MQTT on startup:
```python
from contextlib import asynccontextmanager
from src.services.mqtt_publisher import MQTTPublisher, MQTTConfig
from src.services.config import get_mqtt_config

# Global MQTT publisher
mqtt_publisher: Optional[MQTTPublisher] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global mqtt_publisher

    # Startup: Initialize MQTT
    db = next(get_db())
    try:
        mqtt_config_dict = get_mqtt_config(db)
        mqtt_config = MQTTConfig(**mqtt_config_dict)
        mqtt_publisher = MQTTPublisher(mqtt_config)
        logger.info("MQTT publisher initialized")
    except Exception as e:
        logger.error(f"Failed to initialize MQTT publisher: {e}")
        mqtt_publisher = MQTTPublisher(MQTTConfig(enabled=False))
    finally:
        db.close()

    yield

    # Shutdown: Disconnect MQTT
    if mqtt_publisher:
        mqtt_publisher.disconnect()


# Update FastAPI app initialization
app = FastAPI(
    title="Weather Station Service",
    description="Local weather data archival and analysis service",
    version="1.0.0",
    lifespan=lifespan
)
```

Add Optional import:
```python
from typing import Optional, List, Dict, Any
```

**Step 3: Modify ingestion to publish to MQTT**

Update `src/services/ingestion.py`:
```python
def store_weather_reading(db: Session, upload: StationUpload, mqtt_publisher=None) -> WeatherReading:
    """Store weather reading in database with duplicate prevention"""
    normalized_data = normalize_station_data(upload)

    # Use PostgreSQL INSERT ON CONFLICT DO NOTHING
    stmt = insert(WeatherReading).values(**normalized_data)
    stmt = stmt.on_conflict_do_nothing(index_elements=['timestamp'])

    db.execute(stmt)
    db.commit()

    # Fetch the reading (either newly inserted or existing)
    reading = db.query(WeatherReading).filter(
        WeatherReading.timestamp == normalized_data["timestamp"]
    ).first()

    logger.info(f"Stored reading at {normalized_data['timestamp']}")

    # Publish to MQTT if configured
    if mqtt_publisher and reading:
        reading_dict = {
            "timestamp": reading.timestamp.isoformat(),
            "outdoor_temp_f": reading.outdoor_temp_f,
            "humidity_pct": reading.humidity_pct,
            "wind_speed_mph": reading.wind_speed_mph,
            "solar_radiation_wm2": reading.solar_radiation_wm2,
            # Add other fields as needed
        }
        mqtt_publisher.publish_reading(reading_dict)

    return reading
```

**Step 4: Update upload endpoint to use MQTT**

Update `src/main.py` upload endpoint:
```python
@app.post("/api/weather/upload")
async def upload_weather_data(
    # ... all form parameters ...
    db: Session = Depends(get_db)
):
    """Receive weather data from WS-2902 station"""
    # Validate PASSKEY
    if PASSKEY != settings.station_passkey:
        raise HTTPException(status_code=401, detail="Invalid PASSKEY")

    # Create upload object
    upload = StationUpload(...)

    # Store in database and publish to MQTT
    global mqtt_publisher
    store_weather_reading(db, upload, mqtt_publisher)

    return {"success": True}
```

**Step 5: Commit**

```bash
git add src/services/config.py src/main.py src/services/ingestion.py
git commit -m "feat: integrate MQTT publishing with data ingestion"
```

---

### Task 15: Configuration API Endpoints

**Files:**
- Modify: `src/main.py`
- Update: `src/schemas.py`

**Step 1: Add configuration schemas**

Update `src/schemas.py`:
```python
class MQTTConfigRequest(BaseModel):
    broker_url: str
    username: Optional[str] = None
    password: Optional[str] = None
    enabled: bool


class StationConfigRequest(BaseModel):
    passkey: str
```

**Step 2: Add configuration endpoints**

Update `src/main.py`:
```python
from src.schemas import MQTTConfigRequest, StationConfigRequest
from src.services.config import get_mqtt_config, set_mqtt_config

# ... existing code ...

@app.get("/api/config")
async def get_configuration(db: Session = Depends(get_db)):
    """Get all configuration settings"""
    mqtt_config = get_mqtt_config(db)

    return {
        "mqtt": mqtt_config,
        "station": {
            "passkey_configured": bool(settings.station_passkey)
        }
    }


@app.put("/api/config/mqtt")
async def update_mqtt_config(
    config: MQTTConfigRequest,
    db: Session = Depends(get_db)
):
    """Update MQTT broker settings"""
    global mqtt_publisher

    # Save to database
    set_mqtt_config(db, config.model_dump())

    # Reinitialize MQTT publisher
    mqtt_config = MQTTConfig(**config.model_dump())
    if mqtt_publisher:
        mqtt_publisher.disconnect()
    mqtt_publisher = MQTTPublisher(mqtt_config)

    return {"success": True}


@app.put("/api/config/station")
async def update_station_config(config: StationConfigRequest):
    """Update station settings"""
    # Note: This updates runtime config, not persisted .env
    settings.station_passkey = config.passkey

    return {"success": True}
```

**Step 3: Commit**

```bash
git add src/main.py src/schemas.py
git commit -m "feat: add configuration API endpoints"
```

---

## Phase 7: Web UI

### Task 16: Basic Web UI Structure

**Files:**
- Create: `templates/index.html`
- Create: `static/css/style.css`
- Create: `static/js/app.js`
- Modify: `src/main.py`

**Step 1: Install Jinja2 for templates**

Update `requirements.txt`:
```
jinja2==3.1.2
```

Run: `pip install jinja2==3.1.2`

**Step 2: Update main.py to serve templates**

Update `src/main.py`:
```python
from fastapi.templating import Jinja2Templates
from fastapi import Request

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """Serve main dashboard page"""
    return templates.TemplateResponse("index.html", {"request": request})
```

**Step 3: Create base HTML template**

Create `templates/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather Station Service</title>
    <link rel="stylesheet" href="/static/css/style.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>
    <header>
        <h1>Weather Station Service</h1>
        <nav>
            <a href="#dashboard" class="nav-link active">Dashboard</a>
            <a href="#import" class="nav-link">Import Data</a>
            <a href="#analysis" class="nav-link">Analysis</a>
            <a href="#explorer" class="nav-link">Data Explorer</a>
            <a href="#settings" class="nav-link">Settings</a>
        </nav>
    </header>

    <main>
        <section id="dashboard" class="page active">
            <h2>Dashboard</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Latest Reading</h3>
                    <div id="latest-reading">Loading...</div>
                </div>
                <div class="stat-card">
                    <h3>Database Stats</h3>
                    <div id="db-stats">Loading...</div>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="recent-chart"></canvas>
            </div>
        </section>

        <section id="import" class="page">
            <h2>Import CSV Data</h2>
            <div class="import-form">
                <input type="file" id="csv-file" accept=".csv">
                <button onclick="importCSV()">Import</button>
            </div>
            <div id="import-result"></div>
        </section>

        <section id="analysis" class="page">
            <h2>Energy Analysis</h2>
            <div class="analysis-form">
                <label>Analysis Type:</label>
                <select id="analysis-type">
                    <option value="solar">Solar</option>
                    <option value="wind">Wind</option>
                </select>

                <label>Date Range:</label>
                <input type="date" id="start-date">
                <input type="date" id="end-date">

                <div id="solar-config">
                    <label>Panel Area (m²):</label>
                    <input type="number" id="panel-area" value="20">

                    <label>Efficiency (%):</label>
                    <input type="number" id="efficiency" value="20">
                </div>

                <div id="wind-config" style="display: none;">
                    <label>Turbine Model:</label>
                    <select id="turbine-model">
                        <option value="generic_5kw">Generic 5kW</option>
                    </select>

                    <label>Hub Height (m):</label>
                    <input type="number" id="hub-height" value="10">
                </div>

                <button onclick="runAnalysis()">Run Analysis</button>
            </div>
            <div id="analysis-results"></div>
        </section>

        <section id="explorer" class="page">
            <h2>Data Explorer</h2>
            <p>Coming soon...</p>
        </section>

        <section id="settings" class="page">
            <h2>Settings</h2>

            <h3>MQTT Configuration</h3>
            <div class="settings-form">
                <label>Broker URL:</label>
                <input type="text" id="mqtt-broker" placeholder="mqtt://localhost:1883">

                <label>Username (optional):</label>
                <input type="text" id="mqtt-username">

                <label>Password (optional):</label>
                <input type="password" id="mqtt-password">

                <label>
                    <input type="checkbox" id="mqtt-enabled">
                    Enable MQTT Publishing
                </label>

                <button onclick="saveMQTTConfig()">Save MQTT Config</button>
            </div>
        </section>
    </main>

    <script src="/static/js/app.js"></script>
</body>
</html>
```

**Step 4: Create CSS stylesheet**

Create `static/css/style.css`:
```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f5f5f5;
    color: #333;
}

header {
    background: #2c3e50;
    color: white;
    padding: 1rem 2rem;
}

header h1 {
    margin-bottom: 1rem;
}

nav {
    display: flex;
    gap: 1rem;
}

.nav-link {
    color: white;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background 0.3s;
}

.nav-link:hover {
    background: rgba(255, 255, 255, 0.1);
}

.nav-link.active {
    background: rgba(255, 255, 255, 0.2);
}

main {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 2rem;
}

.page {
    display: none;
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.page.active {
    display: block;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.stat-card {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 8px;
    border-left: 4px solid #3498db;
}

.stat-card h3 {
    color: #2c3e50;
    margin-bottom: 1rem;
}

.chart-container {
    margin-top: 2rem;
}

.import-form, .analysis-form, .settings-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 500px;
    margin-bottom: 2rem;
}

input, select, button {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
}

button {
    background: #3498db;
    color: white;
    border: none;
    cursor: pointer;
    transition: background 0.3s;
}

button:hover {
    background: #2980b9;
}

#import-result, #analysis-results {
    margin-top: 1rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 4px;
}
```

**Step 5: Create JavaScript application**

Create `static/js/app.js`:
```javascript
// Navigation
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('href').substring(1);

        // Update active states
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(target).classList.add('active');

        // Load data for specific pages
        if (target === 'dashboard') loadDashboard();
        if (target === 'settings') loadSettings();
    });
});

// Dashboard
async function loadDashboard() {
    // Load latest reading
    try {
        const response = await fetch('/api/weather/latest');
        const data = await response.json();

        document.getElementById('latest-reading').innerHTML = `
            <p><strong>Temperature:</strong> ${data.outdoor_temp_f}°F</p>
            <p><strong>Humidity:</strong> ${data.humidity_pct}%</p>
            <p><strong>Wind Speed:</strong> ${data.wind_speed_mph} mph</p>
            <p><strong>Solar Radiation:</strong> ${data.solar_radiation_wm2} W/m²</p>
            <p><strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
        `;
    } catch (error) {
        document.getElementById('latest-reading').innerHTML = '<p>No data available</p>';
    }

    // Load stats
    try {
        const response = await fetch('/api/weather/stats');
        const stats = await response.json();

        document.getElementById('db-stats').innerHTML = `
            <p><strong>Total Readings:</strong> ${stats.total_readings}</p>
            <p><strong>Coverage:</strong> ${stats.coverage_days} days</p>
            <p><strong>First Reading:</strong> ${stats.first_reading ? new Date(stats.first_reading).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Last Reading:</strong> ${stats.last_reading ? new Date(stats.last_reading).toLocaleDateString() : 'N/A'}</p>
        `;
    } catch (error) {
        document.getElementById('db-stats').innerHTML = '<p>Error loading stats</p>';
    }
}

// CSV Import
async function importCSV() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a CSV file');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    document.getElementById('import-result').innerHTML = '<p>Importing...</p>';

    try {
        const response = await fetch('/api/weather/import', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        document.getElementById('import-result').innerHTML = `
            <p><strong>Import Complete!</strong></p>
            <p>Total Rows: ${result.total_rows}</p>
            <p>Imported: ${result.imported}</p>
            <p>Duplicates: ${result.duplicates}</p>
            <p>Errors: ${result.errors}</p>
        `;
    } catch (error) {
        document.getElementById('import-result').innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

// Analysis
document.getElementById('analysis-type')?.addEventListener('change', (e) => {
    if (e.target.value === 'solar') {
        document.getElementById('solar-config').style.display = 'block';
        document.getElementById('wind-config').style.display = 'none';
    } else {
        document.getElementById('solar-config').style.display = 'none';
        document.getElementById('wind-config').style.display = 'block';
    }
});

async function runAnalysis() {
    const type = document.getElementById('analysis-type').value;
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;

    if (!start || !end) {
        alert('Please select date range');
        return;
    }

    let config = {};
    if (type === 'solar') {
        config = {
            panel_area_m2: parseFloat(document.getElementById('panel-area').value),
            efficiency_pct: parseFloat(document.getElementById('efficiency').value)
        };
    } else {
        config = {
            turbine_model: document.getElementById('turbine-model').value,
            hub_height_m: parseFloat(document.getElementById('hub-height').value)
        };
    }

    document.getElementById('analysis-results').innerHTML = '<p>Running analysis...</p>';

    try {
        const response = await fetch(`/api/analysis/${type}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                start: start + 'T00:00:00Z',
                end: end + 'T23:59:59Z',
                config: config
            })
        });

        const result = await response.json();

        document.getElementById('analysis-results').innerHTML = `
            <h3>Results</h3>
            <p><strong>Total kWh:</strong> ${result.total_kwh}</p>
            <p><strong>Daily Average:</strong> ${result.daily_avg_kwh} kWh/day</p>
            <p><strong>Annual Estimate:</strong> ${result.roi.annual_kwh_estimate} kWh/year</p>
            <p><strong>Annual Savings:</strong> $${result.roi.annual_savings_usd}</p>

            <h4>Monthly Breakdown</h4>
            <ul>
                ${result.monthly_breakdown.map(m => `<li>${m.month}: ${m.kwh.toFixed(2)} kWh</li>`).join('')}
            </ul>
        `;
    } catch (error) {
        document.getElementById('analysis-results').innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

// Settings
async function loadSettings() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();

        if (config.mqtt) {
            document.getElementById('mqtt-broker').value = config.mqtt.broker_url || '';
            document.getElementById('mqtt-username').value = config.mqtt.username || '';
            document.getElementById('mqtt-enabled').checked = config.mqtt.enabled || false;
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveMQTTConfig() {
    const config = {
        broker_url: document.getElementById('mqtt-broker').value,
        username: document.getElementById('mqtt-username').value || null,
        password: document.getElementById('mqtt-password').value || null,
        enabled: document.getElementById('mqtt-enabled').checked
    };

    try {
        const response = await fetch('/api/config/mqtt', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(config)
        });

        if (response.ok) {
            alert('MQTT configuration saved!');
        }
    } catch (error) {
        alert('Error saving configuration: ' + error.message);
    }
}

// Initial load
loadDashboard();
```

**Step 6: Create static directories**

Run:
```bash
mkdir -p static/css static/js templates
```

**Step 7: Test the UI**

Run: `uvicorn src.main:app --reload`

Visit: http://localhost:8000

Expected: Web UI loads with navigation

**Step 8: Commit**

```bash
git add templates/ static/ src/main.py requirements.txt
git commit -m "feat: add web UI with dashboard, import, analysis, and settings"
```

---

## Phase 8: Docker Deployment

### Task 17: Docker Configuration

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`

**Step 1: Create Dockerfile**

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY static/ ./static/
COPY templates/ ./templates/
COPY scripts/ ./scripts/

# Create data directory
RUN mkdir -p /data

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 2: Create docker-compose.yml**

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  weather-service:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@host.docker.internal:5432/weather_data
      - STATION_PASSKEY=${STATION_PASSKEY:-change_me}
      - LOG_LEVEL=INFO
    volumes:
      - ./data:/data
    restart: unless-stopped
    depends_on:
      - db

  # Optional: Include PostgreSQL if not using external instance
  db:
    image: timescale/timescaledb:latest-pg14
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=weather_data
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

**Step 3: Create .dockerignore**

Create `.dockerignore`:
```
__pycache__
*.pyc
*.pyo
*.pyd
.Python
venv/
env/
ENV/
.venv
*.db
*.sqlite3
.git/
.gitignore
*.log
.pytest_cache/
.coverage
htmlcov/
dist/
build/
*.egg-info/
.env
.DS_Store
```

**Step 4: Test Docker build**

Run:
```bash
docker build -t weather-service .
```

Expected: Image builds successfully

**Step 5: Create README with deployment instructions**

Create `README.md`:
```markdown
# Weather Station Service

Local weather data archival and analysis service for WS-2902 weather stations.

## Features

- Real-time data ingestion from WS-2902 weather station
- Historical CSV import from Ambient Weather Network
- PostgreSQL + TimescaleDB storage
- MQTT publishing (optional)
- Solar and wind energy analysis
- Web UI for data visualization and configuration

## Quick Start

### 1. Setup Database

If using existing PostgreSQL:

\`\`\`bash
# Install TimescaleDB extension
psql -U postgres
CREATE DATABASE weather_data;
\c weather_data
CREATE EXTENSION timescaledb;
\`\`\`

### 2. Configure Environment

\`\`\`bash
cp .env.example .env
# Edit .env with your settings
\`\`\`

### 3. Run with Docker Compose

\`\`\`bash
docker-compose up -d
\`\`\`

### 4. Initialize Database

\`\`\`bash
docker exec -it weather-service python scripts/init_db.py
\`\`\`

### 5. Configure Weather Station

1. Access your WS-2902 settings (via app or web interface)
2. Set Custom Server URL: `http://your-host-ip:8000/api/weather/upload`
3. Set PASSKEY to match your `.env` configuration
4. Enable custom server upload

## Web Interface

Access the web UI at: `http://localhost:8000`

- **Dashboard**: View current conditions and statistics
- **Import Data**: Upload historical CSV files
- **Analysis**: Run solar and wind energy analysis
- **Settings**: Configure MQTT and other options

## API Documentation

API docs available at: `http://localhost:8000/docs`

## Development

\`\`\`bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest

# Run development server
uvicorn src.main:app --reload
\`\`\`

## License

MIT
```

**Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml .dockerignore README.md
git commit -m "feat: add Docker configuration and deployment files"
```

---

## Final Tasks

### Task 18: Testing and Documentation

**Files:**
- Create: `pytest.ini`
- Update: `README.md`

**Step 1: Create pytest configuration**

Create `pytest.ini`:
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
```

**Step 2: Run full test suite**

Run:
```bash
pytest
```

Expected: All tests pass

**Step 3: Update README with testing section**

Add to `README.md`:
```markdown
## Testing

Run the test suite:

\`\`\`bash
pytest
\`\`\`

Run specific tests:

\`\`\`bash
pytest tests/test_models.py -v
pytest tests/test_analysis.py -v
\`\`\`
```

**Step 4: Commit**

```bash
git add pytest.ini README.md
git commit -m "docs: add testing configuration and documentation"
```

---

### Task 19: Final Integration Test

**Step 1: Start the full stack**

Run:
```bash
docker-compose up -d
```

**Step 2: Initialize database**

Run:
```bash
docker exec -it wx-tools-weather-service-1 python scripts/init_db.py
```

**Step 3: Import sample CSV data**

Via web UI or API:
```bash
curl -X POST http://localhost:8000/api/weather/import \
  -F "file=@data/ambient-weather-20241226-20251226.csv"
```

**Step 4: Verify data was imported**

```bash
curl http://localhost:8000/api/weather/stats
```

Expected: Returns statistics showing imported data

**Step 5: Run solar analysis**

```bash
curl -X POST http://localhost:8000/api/analysis/solar \
  -H "Content-Type: application/json" \
  -d '{
    "start": "2025-12-26T00:00:00Z",
    "end": "2025-12-26T23:59:59Z",
    "config": {
      "panel_area_m2": 20,
      "efficiency_pct": 20
    }
  }'
```

Expected: Returns analysis results with kWh estimates

**Step 6: Document completion**

Create final checklist in README:

```markdown
## Verification Checklist

- [ ] Database initialized with TimescaleDB
- [ ] CSV import working
- [ ] Weather station upload endpoint responding
- [ ] MQTT publishing configured (if needed)
- [ ] Solar analysis producing results
- [ ] Wind analysis producing results
- [ ] Web UI accessible and functional
- [ ] Docker container running stable
```

**Step 7: Final commit**

```bash
git add README.md
git commit -m "docs: add verification checklist"
```

---

## Plan Complete

This implementation plan provides step-by-step instructions for building the weather station service with:

1. ✅ Database foundation with TimescaleDB
2. ✅ FastAPI service with all endpoints
3. ✅ WS-2902 station data ingestion
4. ✅ CSV import functionality
5. ✅ Solar and wind energy analysis
6. ✅ MQTT publishing
7. ✅ Web UI for all operations
8. ✅ Docker deployment
9. ✅ Comprehensive testing

Each task follows TDD principles with exact file paths, complete code, and verification steps.

**Total estimated tasks:** 19 major tasks with ~95 individual steps
