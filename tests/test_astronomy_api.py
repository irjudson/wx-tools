"""Tests for GET /api/astronomy/tonight"""
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from src.main import app
from src.services.astronomy import (
    TonightForecast, MoonInfo, SkyQuality, HourlyForecast,
    CloudCover, Transparency, Seeing,
)
from datetime import datetime, timezone

client = TestClient(app)

MOCK_TONIGHT = TonightForecast(
    suitability="good",
    score=0.72,
    issues=["Partly cloudy"],
    moon=MoonInfo(phase="Waxing Gibbous", illumination_pct=68.0, interfering=True),
    sky_quality=SkyQuality(
        bortle_class=4,
        bortle_name="Rural/suburban transition",
        sqm_estimate=20.8,
        limiting_magnitude=6.1,
        milky_way_visibility="visible",
        source="estimated",
    ),
    forecast=[
        HourlyForecast(
            hour=datetime(2099, 1, 1, 20, 0, tzinfo=timezone.utc),
            cloud_cover=CloudCover.PARTLY_CLOUDY,
            transparency=Transparency.AVERAGE,
            seeing=Seeing.GOOD,
            score=0.72,
            temperature_c=12.0,
            wind_speed_kmh=8.0,
        )
    ],
)


@patch("src.main.ForecastService")
@patch("src.main.LightPollutionService")
@patch("src.main.MoonService")
def test_astronomy_tonight_returns_200(MockMoon, MockLight, MockForecast):
    MockForecast.return_value.get_forecast.return_value = MOCK_TONIGHT.forecast
    MockLight.return_value.get_sky_quality.return_value = MOCK_TONIGHT.sky_quality
    MockMoon.return_value.get_moon_info.return_value = MOCK_TONIGHT.moon

    response = client.get("/api/astronomy/tonight")
    assert response.status_code == 200
    data = response.json()
    assert "suitability" in data
    assert "score" in data
    assert "moon" in data
    assert "sky_quality" in data
    assert "forecast" in data
    assert isinstance(data["forecast"], list)


@patch("src.main.ForecastService")
@patch("src.main.LightPollutionService")
@patch("src.main.MoonService")
def test_astronomy_tonight_handles_empty_forecast(MockMoon, MockLight, MockForecast):
    MockForecast.return_value.get_forecast.return_value = []
    MockLight.return_value.get_sky_quality.return_value = MOCK_TONIGHT.sky_quality
    MockMoon.return_value.get_moon_info.return_value = MOCK_TONIGHT.moon

    response = client.get("/api/astronomy/tonight")
    assert response.status_code == 200
    data = response.json()
    assert data["suitability"] == "poor"
    assert data["score"] == 0.0
