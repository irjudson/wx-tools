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


# ── ForecastService (7timer.info ASTRO) ───────────────────────────────────

def _seven_timer_response() -> dict:
    """Build a 7timer ASTRO mock with an init time 1 hour ago so all timepoints are in-window."""
    init_dt = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    init_str = init_dt.strftime("%Y%m%d%H")
    return {
        "product": "astro",
        "init": init_str,
        "dataseries": _SEVEN_TIMER_DATASERIES,
    }

_SEVEN_TIMER_DATASERIES = [
        {
            "timepoint": 3,
            "cloudcover": 1,      # CLEAR (0-6%)
            "seeing": 2,          # EXCELLENT (<0.75")
            "transparency": 1,    # EXCELLENT (<0.3 mag)
            "lifted_index": 2,
            "rh2m": 3,
            "wind10m": {"direction": "W", "speed": 1},
            "temp2m": 10,
            "prec_type": "none",
        },
        {
            "timepoint": 6,
            "cloudcover": 3,      # PARTLY_CLOUDY (19-31%)
            "seeing": 5,          # AVERAGE (1.25-1.5")
            "transparency": 4,    # AVERAGE (0.5-0.6 mag)
            "lifted_index": 0,
            "rh2m": 6,
            "wind10m": {"direction": "SW", "speed": 3},
            "temp2m": 11,
            "prec_type": "none",
        },
        {
            "timepoint": 9,
            "cloudcover": 7,      # OVERCAST (88-100%)
            "seeing": 8,          # POOR (>2.5")
            "transparency": 8,    # POOR (>1 mag)
            "lifted_index": -4,
            "rh2m": 9,
            "wind10m": {"direction": "S", "speed": 5},
            "temp2m": 12,
            "prec_type": "rain",
        },
    ]


class TestForecastService:
    def setup_method(self):
        self.svc = ForecastService()

    @patch("src.services.astronomy.requests.get")
    def test_returns_forecasts_from_7timer(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = _seven_timer_response()
        mock_get.return_value = mock_resp

        results = self.svc.get_forecast(47.6, -122.3, hours=12)
        assert len(results) == 3
        assert results[0].cloud_cover == CloudCover.CLEAR
        assert results[1].cloud_cover == CloudCover.PARTLY_CLOUDY
        assert results[2].cloud_cover == CloudCover.OVERCAST

    @patch("src.services.astronomy.requests.get")
    def test_seeing_mapped_correctly(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = _seven_timer_response()
        mock_get.return_value = mock_resp

        results = self.svc.get_forecast(47.6, -122.3, hours=12)
        assert results[0].seeing == Seeing.EXCELLENT   # scale 2
        assert results[1].seeing == Seeing.AVERAGE     # scale 5
        assert results[2].seeing == Seeing.POOR        # scale 8

    @patch("src.services.astronomy.requests.get")
    def test_returns_empty_on_network_error(self, mock_get):
        mock_get.side_effect = Exception("network error")
        results = self.svc.get_forecast(47.6, -122.3)
        assert results == []

    @patch("src.services.astronomy.requests.get")
    def test_score_in_range(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = _seven_timer_response()
        mock_get.return_value = mock_resp
        results = self.svc.get_forecast(47.6, -122.3, hours=12)
        for r in results:
            assert 0.0 <= r.score <= 1.0


# ── LightPollutionService ──────────────────────────────────────────────────

def _no_override_settings():
    """Fake settings with no Bortle override so API-path tests reach the API branch."""
    s = MagicMock()
    s.station_bortle_class = None
    s.station_lightpoll_key = None
    return s


class TestLightPollutionService:
    def setup_method(self):
        self.svc = LightPollutionService()

    @patch("src.config.get_settings")
    @patch("src.services.astronomy.requests.get")
    def test_returns_sky_quality_from_api(self, mock_get, mock_settings):
        mock_settings.return_value = _no_override_settings()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"sqm": 20.8, "bortle": 4}
        mock_get.return_value = mock_resp

        sq = self.svc.get_sky_quality(47.6, -122.3)
        assert sq.bortle_class == 4
        assert sq.sqm_estimate == pytest.approx(20.8)
        assert sq.source == "api"

    @patch("src.config.get_settings")
    @patch("src.services.astronomy.requests.get")
    def test_falls_back_to_estimate_on_error(self, mock_get, mock_settings):
        mock_settings.return_value = _no_override_settings()
        mock_get.side_effect = Exception("network error")
        sq = self.svc.get_sky_quality(47.6, -122.3)
        assert sq.source == "estimated"
        assert 1 <= sq.bortle_class <= 9

    @patch("src.config.get_settings")
    @patch("src.services.astronomy.requests.get")
    def test_infers_bortle_from_sqm_when_missing(self, mock_get, mock_settings):
        mock_settings.return_value = _no_override_settings()
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"sqm": 21.5}  # no "bortle" key
        mock_get.return_value = mock_resp
        sq = self.svc.get_sky_quality(47.6, -122.3)
        assert sq.bortle_class == 3

    def test_config_override_skips_api(self):
        from unittest.mock import patch as mp
        fake = MagicMock(station_bortle_class=2, station_lightpoll_key=None)
        with mp("src.config.get_settings", return_value=fake), \
             mp("src.services.astronomy.requests.get") as mock_get:
            sq = self.svc.get_sky_quality(47.6, -122.3)
            mock_get.assert_not_called()
        assert sq.bortle_class == 2
        assert sq.source == "configured"

    def test_config_override_clamps_to_valid_range(self):
        from unittest.mock import patch as mp
        fake = MagicMock(station_bortle_class=0, station_lightpoll_key=None)  # invalid, clamp to 1
        with mp("src.config.get_settings", return_value=fake), \
             mp("src.services.astronomy.requests.get"):
            sq = self.svc.get_sky_quality(47.6, -122.3)
        assert sq.bortle_class == 1
