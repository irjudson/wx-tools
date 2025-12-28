import pytest
from fastapi.testclient import TestClient
from src.main import app
from src.database import Base, get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from src.models import Configuration


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


def test_get_settings_default(client):
    """Test GET /api/settings returns default timezone"""
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "timezone" in data
    assert data["timezone"] == "UTC"


def test_update_timezone_valid(client):
    """Test PUT /api/settings/timezone with valid timezone"""
    response = client.put(
        "/api/settings/timezone",
        json={"timezone": "America/Chicago"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["timezone"] == "America/Chicago"

    # Verify it was saved
    get_response = client.get("/api/settings")
    assert get_response.json()["timezone"] == "America/Chicago"


def test_update_timezone_invalid(client):
    """Test PUT /api/settings/timezone with invalid timezone returns 400"""
    response = client.put(
        "/api/settings/timezone",
        json={"timezone": "Invalid/Timezone"}
    )
    assert response.status_code == 400
    assert "Invalid timezone" in response.json()["detail"]
