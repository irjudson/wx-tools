import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime
from src.main import app
from src.database import Base, get_db
from src.models import WeatherReading


@pytest.fixture(scope="function")
def test_engine():
    """Create test engine"""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def test_db(test_engine):
    """Create test database session"""
    TestSession = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)
    session = TestSession()
    yield session
    session.rollback()
    session.close()


@pytest.fixture(scope="function")
def client(test_db):
    """Create test client with test database"""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def test_get_latest_reading_empty_db(client):
    """Test getting latest reading when database is empty"""
    response = client.get("/api/weather/latest")
    assert response.status_code == 404


def test_get_latest_reading(client, test_db):
    """Test getting latest reading with data"""
    # Insert test data
    reading = WeatherReading(
        timestamp=datetime(2025, 12, 26, 12, 0, 0),
        outdoor_temp_f=72.5,
        humidity_pct=60
    )
    test_db.add(reading)
    test_db.commit()

    response = client.get("/api/weather/latest")
    assert response.status_code == 200
    data = response.json()
    assert data["outdoor_temp_f"] == 72.5


def test_get_readings_with_date_range(client, test_db):
    """Test querying readings with date range"""
    # Insert test data
    reading1 = WeatherReading(
        timestamp=datetime(2025, 12, 26, 10, 0, 0),
        outdoor_temp_f=70.0
    )
    reading2 = WeatherReading(
        timestamp=datetime(2025, 12, 26, 14, 0, 0),
        outdoor_temp_f=75.0
    )
    test_db.add(reading1)
    test_db.add(reading2)
    test_db.commit()

    response = client.get(
        "/api/weather/readings",
        params={
            "start": "2025-12-26T00:00:00",
            "end": "2025-12-26T23:59:59"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2


def test_get_stats_empty_db(client):
    """Test stats with empty database"""
    response = client.get("/api/weather/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_readings" in data
    assert data["total_readings"] == 0
    assert data["first_reading"] is None
    assert data["last_reading"] is None


def test_get_stats(client, test_db):
    """Test database statistics"""
    # Insert test data
    reading1 = WeatherReading(
        timestamp=datetime(2025, 12, 20, 10, 0, 0),
        outdoor_temp_f=70.0
    )
    reading2 = WeatherReading(
        timestamp=datetime(2025, 12, 26, 14, 0, 0),
        outdoor_temp_f=75.0
    )
    test_db.add(reading1)
    test_db.add(reading2)
    test_db.commit()

    response = client.get("/api/weather/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["total_readings"] == 2
    assert data["coverage_days"] == 6
    assert data["first_reading"] is not None
    assert data["last_reading"] is not None
