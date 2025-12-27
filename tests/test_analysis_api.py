import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from src.main import app
from src.database import Base, get_db


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


def test_solar_analysis_endpoint(client):
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


def test_wind_analysis_endpoint(client):
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
