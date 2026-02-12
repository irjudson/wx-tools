import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Weather Station Dashboard" in response.text


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    # Expect "degraded" when database is empty (no readings)
    assert data["status"] == "degraded"
    assert "database" in data
    assert data["database"] == "connected"
    assert "data_freshness" in data
    assert data["data_freshness"] == "no_data"
    assert "mqtt" in data
    assert data["mqtt"] == "not_configured"
