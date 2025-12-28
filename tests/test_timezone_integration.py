import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


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


def test_get_settings_returns_timezone(client):
    """Test GET /api/settings returns timezone"""
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "timezone" in data
    # Should return default UTC when not configured
    assert data["timezone"] == "UTC"


def test_update_timezone_workflow(client):
    """Test complete timezone update workflow"""
    # 1. Get current timezone (should be UTC by default)
    response = client.get("/api/settings")
    assert response.status_code == 200
    assert response.json()["timezone"] == "UTC"

    # 2. Update to America/Chicago
    update_response = client.put(
        "/api/settings/timezone",
        json={"timezone": "America/Chicago"}
    )
    assert update_response.status_code == 200
    update_data = update_response.json()
    assert update_data["success"] is True
    assert update_data["timezone"] == "America/Chicago"

    # 3. Verify update succeeded
    assert update_data["success"] is True

    # 4. Get timezone again
    get_response = client.get("/api/settings")
    assert get_response.status_code == 200

    # 5. Verify persistence
    assert get_response.json()["timezone"] == "America/Chicago"


def test_config_endpoint_includes_timezone(client):
    """Test GET /api/config includes timezone"""
    # Set a specific timezone first
    client.put(
        "/api/settings/timezone",
        json={"timezone": "Europe/London"}
    )

    # Get configuration
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()

    # Verify timezone is included in config response
    assert "timezone" in data
    assert data["timezone"] == "Europe/London"

    # Also verify other expected config keys exist
    assert "mqtt" in data
    assert "station" in data


def test_invalid_timezone_rejected(client):
    """Test PUT /api/settings/timezone with invalid timezone returns 400"""
    # Try to set "Invalid/Timezone"
    response = client.put(
        "/api/settings/timezone",
        json={"timezone": "Invalid/Timezone"}
    )

    # Should return 400 with error message
    assert response.status_code == 400
    assert "Invalid timezone" in response.json()["detail"]


def test_timezone_persistence_across_requests(client):
    """Test timezone persists across multiple requests"""
    # Set timezone to Europe/London
    update_response = client.put(
        "/api/settings/timezone",
        json={"timezone": "Europe/London"}
    )
    assert update_response.status_code == 200

    # Make multiple GET requests to /api/settings
    for _ in range(5):
        response = client.get("/api/settings")
        assert response.status_code == 200
        assert response.json()["timezone"] == "Europe/London"

    # Also verify via /api/config endpoint
    for _ in range(3):
        response = client.get("/api/config")
        assert response.status_code == 200
        assert response.json()["timezone"] == "Europe/London"


def test_timezone_update_multiple_times(client):
    """Test updating timezone multiple times"""
    timezones = [
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "Europe/London",
        "Asia/Tokyo"
    ]

    for tz in timezones:
        # Update timezone
        update_response = client.put(
            "/api/settings/timezone",
            json={"timezone": tz}
        )
        assert update_response.status_code == 200
        assert update_response.json()["timezone"] == tz

        # Verify it was saved
        get_response = client.get("/api/settings")
        assert get_response.json()["timezone"] == tz


def test_timezone_update_with_special_timezones(client):
    """Test timezone update with special timezone names"""
    special_timezones = [
        "UTC",
        "GMT",
        "US/Pacific",
        "US/Eastern",
        "America/Argentina/Buenos_Aires",
        "Pacific/Port_Moresby"
    ]

    for tz in special_timezones:
        response = client.put(
            "/api/settings/timezone",
            json={"timezone": tz}
        )
        assert response.status_code == 200
        assert response.json()["timezone"] == tz

        # Verify persistence
        get_response = client.get("/api/settings")
        assert get_response.json()["timezone"] == tz


def test_multiple_invalid_timezones(client):
    """Test multiple invalid timezone attempts"""
    invalid_timezones = [
        "Invalid/Timezone",
        "NotATimezone",
        "America/FakeCity",
        "Europe/NoSuchPlace",
        "Random/String",
        ""
    ]

    for invalid_tz in invalid_timezones:
        response = client.put(
            "/api/settings/timezone",
            json={"timezone": invalid_tz}
        )
        assert response.status_code == 400
        assert "Invalid timezone" in response.json()["detail"]

    # Verify the timezone wasn't changed (should still be UTC or last valid value)
    get_response = client.get("/api/settings")
    assert get_response.status_code == 200
    # Should be UTC since all attempts were invalid
    assert get_response.json()["timezone"] == "UTC"
