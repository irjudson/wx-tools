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
