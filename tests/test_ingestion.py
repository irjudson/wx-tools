import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from src.main import app
from src.config import get_settings
from src.database import Base, get_db
from src.models import WeatherReading  # Import models to register with Base


@pytest.fixture(scope="function")
def test_engine():
    """Create test engine"""
    # Use StaticPool to ensure all connections use the same in-memory database
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    # Ensure all models are imported and create tables
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


def test_station_upload_valid_passkey(client):
    """Test station upload with valid PASSKEY"""
    settings = get_settings()
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
    assert response.json()["status"] == "success"


def test_station_upload_invalid_passkey(client):
    """Test station upload with invalid PASSKEY"""
    data = {
        "PASSKEY": "wrong_key",
        "dateutc": "2025-12-26 14:30:00"
    }
    response = client.post("/api/weather/upload", data=data)
    assert response.status_code == 401
