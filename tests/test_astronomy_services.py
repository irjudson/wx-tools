"""Tests for src/services/astronomy.py"""
import math
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

import pytest
from src.services.astronomy import (
    ForecastService,
    LightPollutionService,
    MoonService,
    CloudCover,
    Transparency,
    Seeing,
    _hour_score,
    _bortle_from_sqm,
)


# ── MoonService ────────────────────────────────────────────────────────────

class TestMoonService:
    def setup_method(self):
        self.svc = MoonService()

    def test_new_moon_illumination(self):
        # Known new moon: 2000-01-06 18:14 UTC — illumination should be ~0%
        new_moon = datetime(2000, 1, 6, 18, 14, tzinfo=timezone.utc)
        info = self.svc.get_moon_info(new_moon)
        assert info.illumination_pct < 2.0
        assert info.phase == "New Moon"
        assert info.interfering is False

    def test_full_moon_illumination(self):
        # Full moon is ~14.77 days after new moon
        new_moon = datetime(2000, 1, 6, 18, 14, tzinfo=timezone.utc)
        from datetime import timedelta
        full_moon = new_moon + timedelta(days=14.77)
        info = self.svc.get_moon_info(full_moon)
        assert info.illumination_pct > 98.0
        assert info.phase == "Full Moon"
        assert info.interfering is True

    def test_first_quarter(self):
        new_moon = datetime(2000, 1, 6, 18, 14, tzinfo=timezone.utc)
        from datetime import timedelta
        first_q = new_moon + timedelta(days=7.5)
        info = self.svc.get_moon_info(first_q)
        assert 40 < info.illumination_pct < 60
        assert info.phase == "First Quarter"

    def test_naive_datetime_handled(self):
        naive = datetime(2024, 1, 1, 12, 0)
        info = self.svc.get_moon_info(naive)
        assert 0 <= info.illumination_pct <= 100

    def test_default_uses_now(self):
        info = self.svc.get_moon_info()
        assert 0 <= info.illumination_pct <= 100
        assert info.phase in [
            "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
            "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent",
        ]


# ── _bortle_from_sqm ───────────────────────────────────────────────────────

def test_bortle_from_sqm_boundaries():
    assert _bortle_from_sqm(22.0) == 1
    assert _bortle_from_sqm(21.75) == 2
    assert _bortle_from_sqm(21.4) == 3
    assert _bortle_from_sqm(20.8) == 4
    assert _bortle_from_sqm(19.9) == 5
    assert _bortle_from_sqm(18.7) == 6
    assert _bortle_from_sqm(18.1) == 7
    assert _bortle_from_sqm(17.5) == 8
    assert _bortle_from_sqm(15.0) == 9


# ── _hour_score ────────────────────────────────────────────────────────────

def test_hour_score_perfect_conditions():
    score = _hour_score(CloudCover.CLEAR, Transparency.EXCELLENT, Seeing.EXCELLENT)
    assert score == pytest.approx(1.0)

def test_hour_score_worst_conditions():
    score = _hour_score(CloudCover.OVERCAST, Transparency.POOR, Seeing.POOR)
    assert score == pytest.approx(0.0 * 0.5 + 0.2 * 0.3 + 0.2 * 0.2)


# ── ForecastService ────────────────────────────────────────────────────────

OPEN_METEO_RESPONSE = {
    "hourly": {
        "time": [
            "2099-01-01T00:00", "2099-01-01T01:00", "2099-01-01T02:00",
        ],
        "cloud_cover": [5, 50, 95],
        "visibility": [30000, 10000, 2000],
        "wind_speed_10m": [3, 20, 45],
        "temperature_2m": [10.0, 11.0, 12.0],
    }
}


class TestForecastService:
    def setup_method(self):
        self.svc = ForecastService()

    @patch("src.services.astronomy.requests.get")
    def test_returns_hourly_forecasts(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = OPEN_METEO_RESPONSE
        mock_get.return_value = mock_resp

        results = self.svc.get_forecast(47.6, -122.3, hours=12)
        # All 3 mock hours are in the future (year 2099)
        assert len(results) == 3
        assert results[0].cloud_cover == CloudCover.CLEAR
        assert results[1].cloud_cover == CloudCover.PARTLY_CLOUDY
        assert results[2].cloud_cover == CloudCover.OVERCAST

    @patch("src.services.astronomy.requests.get")
    def test_returns_empty_on_network_error(self, mock_get):
        mock_get.side_effect = Exception("network error")
        results = self.svc.get_forecast(47.6, -122.3)
        assert results == []

    @patch("src.services.astronomy.requests.get")
    def test_score_in_range(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = OPEN_METEO_RESPONSE
        mock_get.return_value = mock_resp
        results = self.svc.get_forecast(47.6, -122.3, hours=12)
        for r in results:
            assert 0.0 <= r.score <= 1.0


# ── LightPollutionService ──────────────────────────────────────────────────

class TestLightPollutionService:
    def setup_method(self):
        self.svc = LightPollutionService()

    @patch("src.services.astronomy.requests.get")
    def test_returns_sky_quality_from_api(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"sqm": 20.8, "bortle": 4}
        mock_get.return_value = mock_resp

        sq = self.svc.get_sky_quality(47.6, -122.3)
        assert sq.bortle_class == 4
        assert sq.sqm_estimate == pytest.approx(20.8)
        assert sq.source == "api"

    @patch("src.services.astronomy.requests.get")
    def test_falls_back_to_estimate_on_error(self, mock_get):
        mock_get.side_effect = Exception("network error")
        sq = self.svc.get_sky_quality(47.6, -122.3)
        assert sq.source == "estimated"
        assert 1 <= sq.bortle_class <= 9

    @patch("src.services.astronomy.requests.get")
    def test_infers_bortle_from_sqm_when_missing(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"sqm": 21.5}  # no "bortle" key
        mock_get.return_value = mock_resp
        sq = self.svc.get_sky_quality(47.6, -122.3)
        assert sq.bortle_class == 3
