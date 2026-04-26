# Sky / Astronomy Forecast Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Sky" page to wx-tools that shows tonight's astronomical observing forecast: overall suitability, Bortle/sky-quality, moon phase, and an hourly 12-hour forecast strip.

**Architecture:** A single `/api/astronomy/tonight` endpoint aggregates three pure-Python services (Open-Meteo forecast, lightpollutionmap.info Bortle, and a dep-free moon phase calculator). Lat/lon are added to the `.env` config. A new `Sky.vue` view fetches this endpoint and renders a dark-themed card layout.

**Tech Stack:** Python/FastAPI backend; Open-Meteo API (free, no key); lightpollutionmap.info API (free, no key, with coordinate-based fallback); pure-Python moon phase math (no new deps); Vue 3 + Tailwind frontend.

---

## Task 1: Add station location to config

**Files:**
- Modify: `src/config.py`
- Modify: `.env` (your local file — add two lines)
- Modify: `.env.example` if it exists (or create a note in README)

**Step 1: Add fields to Settings**

In `src/config.py` change:
```python
class Settings(BaseSettings):
    database_url: str
    station_passkey: str
    log_level: str = "INFO"
    station_latitude: float = 0.0
    station_longitude: float = 0.0

    model_config = ConfigDict(env_file=".env")
```

**Step 2: Add to your `.env` file**

Add two lines (use your actual coordinates):
```
STATION_LATITUDE=47.6062
STATION_LONGITUDE=-122.3321
```

**Step 3: Verify settings load**

```bash
PYTHONPATH=. python -c "from src.config import get_settings; s=get_settings(); print(s.station_latitude, s.station_longitude)"
```
Expected: prints your lat/lon (not 0.0 0.0).

**Step 4: Commit**
```bash
git add src/config.py
git commit -m "feat: add station_latitude and station_longitude to config"
```

---

## Task 2: Create astronomy services

**Files:**
- Create: `src/services/astronomy.py`

This single file contains three classes: `ForecastService`, `LightPollutionService`, `MoonService`.

**Step 1: Write `src/services/astronomy.py`**

```python
"""Astronomical observing forecast services.

Three service classes:
- ForecastService   — hourly cloud/transparency/seeing from Open-Meteo (free, no key)
- LightPollutionService — Bortle class from lightpollutionmap.info (fallback: estimate)
- MoonService       — phase name + illumination % (pure Python, no extra deps)
"""

import logging
import math
import requests
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel

log = logging.getLogger(__name__)


# ── Enums ──────────────────────────────────────────────────────────────────

class CloudCover(str, Enum):
    CLEAR = "CLEAR"
    MOSTLY_CLEAR = "MOSTLY_CLEAR"
    PARTLY_CLOUDY = "PARTLY_CLOUDY"
    MOSTLY_CLOUDY = "MOSTLY_CLOUDY"
    OVERCAST = "OVERCAST"


class Transparency(str, Enum):
    EXCELLENT = "EXCELLENT"
    ABOVE_AVERAGE = "ABOVE_AVERAGE"
    AVERAGE = "AVERAGE"
    BELOW_AVERAGE = "BELOW_AVERAGE"
    POOR = "POOR"


class Seeing(str, Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    AVERAGE = "AVERAGE"
    BELOW_AVERAGE = "BELOW_AVERAGE"
    POOR = "POOR"


# ── Pydantic models ────────────────────────────────────────────────────────

class HourlyForecast(BaseModel):
    hour: datetime
    cloud_cover: CloudCover
    transparency: Transparency
    seeing: Seeing
    score: float          # 0.0–1.0
    temperature_c: float
    wind_speed_kmh: float


class SkyQuality(BaseModel):
    bortle_class: int            # 1–9
    bortle_name: str
    sqm_estimate: float
    limiting_magnitude: float
    milky_way_visibility: str    # "spectacular", "visible", "barely visible", "not visible"
    source: str                  # "api" or "estimated"


class MoonInfo(BaseModel):
    phase: str
    illumination_pct: float
    interfering: bool            # True if illumination > 50 %


class TonightForecast(BaseModel):
    suitability: str             # "excellent", "good", "fair", "poor"
    score: float                 # 0.0–1.0 (best of next-12h scores)
    issues: List[str]
    moon: MoonInfo
    sky_quality: Optional[SkyQuality]
    forecast: List[HourlyForecast]   # next 12 hours


# ── Helpers ────────────────────────────────────────────────────────────────

def _cloud_cover_from_pct(pct: float) -> CloudCover:
    if pct <= 10:
        return CloudCover.CLEAR
    if pct <= 30:
        return CloudCover.MOSTLY_CLEAR
    if pct <= 70:
        return CloudCover.PARTLY_CLOUDY
    if pct <= 90:
        return CloudCover.MOSTLY_CLOUDY
    return CloudCover.OVERCAST


def _transparency_from_visibility(vis_m: float) -> Transparency:
    if vis_m >= 24_000:
        return Transparency.EXCELLENT
    if vis_m >= 16_000:
        return Transparency.ABOVE_AVERAGE
    if vis_m >= 8_000:
        return Transparency.AVERAGE
    if vis_m >= 4_000:
        return Transparency.BELOW_AVERAGE
    return Transparency.POOR


def _seeing_from_wind(wind_kmh: float) -> Seeing:
    if wind_kmh < 5:
        return Seeing.EXCELLENT
    if wind_kmh < 15:
        return Seeing.GOOD
    if wind_kmh < 25:
        return Seeing.AVERAGE
    if wind_kmh < 40:
        return Seeing.BELOW_AVERAGE
    return Seeing.POOR


def _hour_score(cloud_cover: CloudCover, transparency: Transparency, seeing: Seeing) -> float:
    cloud_weights = {
        CloudCover.CLEAR: 1.0,
        CloudCover.MOSTLY_CLEAR: 0.8,
        CloudCover.PARTLY_CLOUDY: 0.5,
        CloudCover.MOSTLY_CLOUDY: 0.2,
        CloudCover.OVERCAST: 0.0,
    }
    transp_weights = {
        Transparency.EXCELLENT: 1.0,
        Transparency.ABOVE_AVERAGE: 0.8,
        Transparency.AVERAGE: 0.6,
        Transparency.BELOW_AVERAGE: 0.4,
        Transparency.POOR: 0.2,
    }
    seeing_weights = {
        Seeing.EXCELLENT: 1.0,
        Seeing.GOOD: 0.8,
        Seeing.AVERAGE: 0.6,
        Seeing.BELOW_AVERAGE: 0.4,
        Seeing.POOR: 0.2,
    }
    return (
        cloud_weights[cloud_cover] * 0.5
        + transp_weights[transparency] * 0.3
        + seeing_weights[seeing] * 0.2
    )


_BORTLE_DESCRIPTIONS = {
    1: "Excellent dark-sky site",
    2: "Typical truly dark site",
    3: "Rural sky",
    4: "Rural/suburban transition",
    5: "Suburban sky",
    6: "Bright suburban sky",
    7: "Suburban/urban transition",
    8: "City sky",
    9: "Inner-city sky",
}

_BORTLE_LIMITING_MAG = {1: 7.6, 2: 7.1, 3: 6.6, 4: 6.1, 5: 5.6, 6: 5.1, 7: 4.6, 8: 4.1, 9: 3.5}

_BORTLE_MILKY_WAY = {
    1: "spectacular", 2: "spectacular",
    3: "visible", 4: "visible",
    5: "barely visible", 6: "barely visible",
    7: "not visible", 8: "not visible", 9: "not visible",
}

_SQM_MIDPOINTS = {1: 21.95, 2: 21.75, 3: 21.45, 4: 20.85, 5: 19.95, 6: 18.95, 7: 18.2, 8: 17.45, 9: 15.0}


def _bortle_from_sqm(sqm: float) -> int:
    if sqm >= 21.9:
        return 1
    if sqm >= 21.7:
        return 2
    if sqm >= 21.3:
        return 3
    if sqm >= 20.5:
        return 4
    if sqm >= 19.5:
        return 5
    if sqm >= 18.5:
        return 6
    if sqm >= 18.0:
        return 7
    if sqm >= 17.0:
        return 8
    return 9


# ── Services ───────────────────────────────────────────────────────────────

class ForecastService:
    """Hourly astronomy forecast from Open-Meteo (free, no API key)."""

    _API = "https://api.open-meteo.com/v1/forecast"
    _TIMEOUT = 10

    def get_forecast(self, latitude: float, longitude: float, hours: int = 12) -> List[HourlyForecast]:
        try:
            resp = requests.get(
                self._API,
                params={
                    "latitude": round(latitude, 4),
                    "longitude": round(longitude, 4),
                    "hourly": "cloud_cover,visibility,wind_speed_10m,temperature_2m",
                    "wind_speed_unit": "kmh",
                    "forecast_days": 2,
                    "timezone": "UTC",
                },
                timeout=self._TIMEOUT,
            )
            resp.raise_for_status()
        except Exception as exc:
            log.warning(f"Open-Meteo request failed: {exc}")
            return []

        data = resp.json().get("hourly", {})
        times = data.get("time", [])
        clouds = data.get("cloud_cover", [])
        vis = data.get("visibility", [])
        wind = data.get("wind_speed_10m", [])
        temp = data.get("temperature_2m", [])

        now_utc = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        results: List[HourlyForecast] = []

        for i, t_str in enumerate(times):
            if len(results) >= hours:
                break
            try:
                t = datetime.fromisoformat(t_str).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
            if t < now_utc:
                continue

            cc = _cloud_cover_from_pct(float(clouds[i] or 0))
            tr = _transparency_from_visibility(float(vis[i] or 0))
            se = _seeing_from_wind(float(wind[i] or 0))

            results.append(HourlyForecast(
                hour=t,
                cloud_cover=cc,
                transparency=tr,
                seeing=se,
                score=round(_hour_score(cc, tr, se), 2),
                temperature_c=float(temp[i] or 0),
                wind_speed_kmh=float(wind[i] or 0),
            ))

        return results


class LightPollutionService:
    """Bortle class and sky quality from lightpollutionmap.info (falls back to estimate)."""

    _TIMEOUT = 5

    def get_sky_quality(self, latitude: float, longitude: float) -> SkyQuality:
        try:
            resp = requests.get(
                f"https://api.lightpollutionmap.info/sqm/{latitude}/{longitude}",
                timeout=self._TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
            sqm = float(data["sqm"])
            bortle = int(data.get("bortle") or _bortle_from_sqm(sqm))
            return SkyQuality(
                bortle_class=bortle,
                bortle_name=_BORTLE_DESCRIPTIONS.get(bortle, "Unknown"),
                sqm_estimate=round(sqm, 2),
                limiting_magnitude=_BORTLE_LIMITING_MAG.get(bortle, 5.5),
                milky_way_visibility=_BORTLE_MILKY_WAY.get(bortle, "not visible"),
                source="api",
            )
        except Exception as exc:
            log.warning(f"lightpollutionmap.info request failed: {exc}")

        # Fallback: crude estimate (rural-ish by default)
        bortle = 4
        return SkyQuality(
            bortle_class=bortle,
            bortle_name=_BORTLE_DESCRIPTIONS[bortle],
            sqm_estimate=_SQM_MIDPOINTS[bortle],
            limiting_magnitude=_BORTLE_LIMITING_MAG[bortle],
            milky_way_visibility=_BORTLE_MILKY_WAY[bortle],
            source="estimated",
        )


class MoonService:
    """Moon phase and illumination (pure Python, no extra dependencies)."""

    # Known new moon reference: 2000-01-06 18:14 UTC
    _KNOWN_NEW_MOON = datetime(2000, 1, 6, 18, 14, tzinfo=timezone.utc)
    _SYNODIC_PERIOD = 29.53058867  # days

    def get_moon_info(self, at: Optional[datetime] = None) -> MoonInfo:
        if at is None:
            at = datetime.now(timezone.utc)
        if at.tzinfo is None:
            at = at.replace(tzinfo=timezone.utc)

        delta_days = (at - self._KNOWN_NEW_MOON).total_seconds() / 86400
        age = (delta_days % self._SYNODIC_PERIOD)  # days into current cycle

        illumination = round((1 - math.cos(2 * math.pi * age / self._SYNODIC_PERIOD)) / 2 * 100, 1)
        phase = self._phase_name(age)

        return MoonInfo(
            phase=phase,
            illumination_pct=illumination,
            interfering=illumination > 50,
        )

    def _phase_name(self, age: float) -> str:
        p = self._SYNODIC_PERIOD
        if age < p * 0.0625:
            return "New Moon"
        if age < p * 0.25:
            return "Waxing Crescent"
        if age < p * 0.3125:
            return "First Quarter"
        if age < p * 0.5:
            return "Waxing Gibbous"
        if age < p * 0.5625:
            return "Full Moon"
        if age < p * 0.75:
            return "Waning Gibbous"
        if age < p * 0.8125:
            return "Last Quarter"
        return "Waning Crescent"
```

**Step 2: Verify it imports cleanly**
```bash
PYTHONPATH=. python -c "from src.services.astronomy import ForecastService, LightPollutionService, MoonService; print('OK')"
```
Expected: `OK`

**Step 3: Commit**
```bash
git add src/services/astronomy.py
git commit -m "feat: add astronomy services (forecast, sky quality, moon phase)"
```

---

## Task 3: Tests for astronomy services

**Files:**
- Create: `tests/test_astronomy_services.py`

**Step 1: Write the tests**

```python
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
        first_q = new_moon + timedelta(days=7.38)
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
```

**Step 2: Run the tests and make sure they pass**

```bash
PYTHONPATH=. pytest tests/test_astronomy_services.py -v
```
Expected: all green.

**Step 3: Commit**
```bash
git add tests/test_astronomy_services.py
git commit -m "test: add astronomy services tests"
```

---

## Task 4: Add `/api/astronomy/tonight` endpoint

**Files:**
- Modify: `src/main.py`

**Step 1: Add the endpoint after the existing analysis endpoints (~line 745)**

First add the import near the top of `src/main.py` (after the existing service imports):
```python
from src.services.astronomy import ForecastService, LightPollutionService, MoonService, TonightForecast
```

Then add the endpoint:
```python
@app.get("/api/astronomy/tonight", response_model=TonightForecast)
async def astronomy_tonight():
    """Return tonight's astronomical observing forecast."""
    cfg = get_settings()
    lat, lon = cfg.station_latitude, cfg.station_longitude

    forecast_svc = ForecastService()
    light_svc = LightPollutionService()
    moon_svc = MoonService()

    forecast = forecast_svc.get_forecast(lat, lon, hours=12)
    sky_quality = light_svc.get_sky_quality(lat, lon)
    moon = moon_svc.get_moon_info()

    # Overall score: best hour in the next 12h
    score = max((h.score for h in forecast), default=0.0)

    # Suitability label
    if score >= 0.75:
        suitability = "excellent"
    elif score >= 0.5:
        suitability = "good"
    elif score >= 0.25:
        suitability = "fair"
    else:
        suitability = "poor"

    # Issues list
    issues = []
    if forecast:
        worst_cloud = max(forecast, key=lambda h: ["CLEAR","MOSTLY_CLEAR","PARTLY_CLOUDY","MOSTLY_CLOUDY","OVERCAST"].index(h.cloud_cover.value))
        if worst_cloud.cloud_cover.value in ("PARTLY_CLOUDY", "MOSTLY_CLOUDY", "OVERCAST"):
            issues.append(f"Cloud cover expected ({worst_cloud.cloud_cover.value.replace('_', ' ').title()})")
    if moon.interfering:
        issues.append(f"Bright moon ({moon.illumination_pct:.0f}% illuminated)")

    return TonightForecast(
        suitability=suitability,
        score=round(score, 2),
        issues=issues,
        moon=moon,
        sky_quality=sky_quality,
        forecast=forecast,
    )
```

**Step 2: Run the server locally and hit the endpoint**

```bash
PYTHONPATH=. uvicorn src.main:app --reload --port 8001
curl http://localhost:8001/api/astronomy/tonight | python3 -m json.tool | head -40
```
Expected: JSON with `suitability`, `score`, `moon`, `sky_quality`, `forecast` keys.

**Step 3: Commit**
```bash
git add src/main.py
git commit -m "feat: add /api/astronomy/tonight endpoint"
```

---

## Task 5: API endpoint test

**Files:**
- Create: `tests/test_astronomy_api.py`

**Step 1: Write the test**

```python
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
```

**Step 2: Run the tests**

```bash
PYTHONPATH=. pytest tests/test_astronomy_api.py -v
```
Expected: 2 tests pass.

**Step 3: Run full test suite to confirm no regressions**

```bash
PYTHONPATH=. pytest -v
```
Expected: all green.

**Step 4: Commit**
```bash
git add tests/test_astronomy_api.py
git commit -m "test: add /api/astronomy/tonight endpoint tests"
```

---

## Task 6: Add star icon to NavIcons

**Files:**
- Modify: `frontend/src/components/NavIcons.vue`

**Step 1: Add a `star` case before the final `</template>`**

Find the last `</template>` in the `<template>` block and add before it:
```html
    <template v-else-if="name === 'star'">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </template>
```

**Step 2: Commit**
```bash
git add frontend/src/components/NavIcons.vue
git commit -m "feat: add star icon to NavIcons"
```

---

## Task 7: Create Sky.vue

**Files:**
- Create: `frontend/src/views/Sky.vue`

**Step 1: Write the view**

```vue
<template>
  <div class="min-h-screen bg-gray-950 text-white p-4 md:p-6 space-y-5">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold tracking-tight">Tonight's Sky</h1>
      <span class="text-xs text-gray-500">{{ dateLabel }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16 text-gray-500">
      <span class="text-sm">Loading forecast…</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-900/30 border border-red-700/40 rounded-xl p-4 text-red-300 text-sm">
      {{ error }}
    </div>

    <template v-else-if="forecast">

      <!-- Suitability banner -->
      <div :class="['rounded-xl p-5 border', suitabilityStyle.bg, suitabilityStyle.border]">
        <div class="flex items-center justify-between mb-1">
          <span class="text-2xl font-extrabold capitalize">{{ forecast.suitability }}</span>
          <span class="text-3xl">{{ suitabilityStyle.icon }}</span>
        </div>
        <div class="text-sm opacity-70">Overall observing score: {{ Math.round(forecast.score * 100) }}%</div>
        <ul v-if="forecast.issues.length" class="mt-2 space-y-0.5">
          <li v-for="issue in forecast.issues" :key="issue" class="text-xs opacity-60">⚠ {{ issue }}</li>
        </ul>
      </div>

      <!-- Info cards row -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <!-- Moon card -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Moon</div>
          <div class="text-3xl mb-1">{{ moonEmoji }}</div>
          <div class="text-base font-semibold">{{ forecast.moon.phase }}</div>
          <div class="text-sm text-gray-400 mt-1">{{ forecast.moon.illumination_pct.toFixed(0) }}% illuminated</div>
          <div v-if="forecast.moon.interfering" class="mt-2 text-xs text-amber-400">
            Bright moon may wash out faint objects
          </div>
          <div v-else class="mt-2 text-xs text-green-400">Low moon interference</div>
        </div>

        <!-- Sky quality card -->
        <div v-if="forecast.sky_quality" class="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sky Quality</div>
          <div class="flex items-baseline gap-2 mb-1">
            <span class="text-3xl font-extrabold">{{ forecast.sky_quality.bortle_class }}</span>
            <span class="text-xs text-gray-400">/ 9 Bortle</span>
          </div>
          <div class="text-sm font-medium">{{ forecast.sky_quality.bortle_name }}</div>
          <div class="text-xs text-gray-400 mt-1">Limiting mag {{ forecast.sky_quality.limiting_magnitude.toFixed(1) }}</div>
          <div class="text-xs text-gray-400">Milky Way: {{ forecast.sky_quality.milky_way_visibility }}</div>
          <div v-if="forecast.sky_quality.source === 'estimated'" class="text-xs text-gray-600 mt-2">estimated</div>
        </div>

        <!-- Local conditions card -->
        <div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Local Conditions</div>
          <template v-if="weatherStore.latestReading">
            <div class="text-3xl font-extrabold mb-1">
              {{ Math.round(weatherStore.latestReading.outdoor_temp_f) }}<span class="text-lg font-semibold">°F</span>
            </div>
            <div class="text-sm text-gray-400">{{ weatherStore.latestReading.humidity_pct }}% humidity</div>
            <div class="text-sm text-gray-400">{{ weatherStore.latestReading.wind_speed_mph?.toFixed(1) }} mph wind</div>
            <div v-if="weatherStore.latestReading.uv_index != null" class="text-sm text-gray-400">
              UV {{ weatherStore.latestReading.uv_index }}
            </div>
          </template>
          <template v-else>
            <p class="text-sm text-gray-600">No station data</p>
          </template>
        </div>

      </div>

      <!-- Hourly forecast strip -->
      <div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">12-Hour Forecast</div>
        <div class="grid gap-2" :style="`grid-template-columns: repeat(${forecast.forecast.length}, minmax(0, 1fr))`">
          <div
            v-for="h in forecast.forecast"
            :key="h.hour"
            class="flex flex-col items-center gap-1"
          >
            <span class="text-xs text-gray-500">{{ hourLabel(h.hour) }}</span>
            <span class="text-lg">{{ cloudEmoji(h.cloud_cover) }}</span>
            <div class="w-full bg-gray-800 rounded-full h-1.5">
              <div
                class="h-1.5 rounded-full transition-all"
                :class="scoreBarColor(h.score)"
                :style="`width: ${h.score * 100}%`"
              ></div>
            </div>
            <span class="text-xs font-semibold" :class="scoreTextColor(h.score)">
              {{ Math.round(h.score * 100) }}%
            </span>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useWeatherStore } from '../stores/weather';

const weatherStore = useWeatherStore();

const loading = ref(true);
const error = ref<string | null>(null);
const forecast = ref<any>(null);

const dateLabel = computed(() =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
);

const suitabilityStyle = computed(() => {
  const s = forecast.value?.suitability;
  if (s === 'excellent') return { bg: 'bg-indigo-900/40', border: 'border-indigo-700/50', icon: '✨' };
  if (s === 'good')      return { bg: 'bg-green-900/40',  border: 'border-green-700/50',  icon: '🌟' };
  if (s === 'fair')      return { bg: 'bg-amber-900/40',  border: 'border-amber-700/50',  icon: '🌤' };
  return                        { bg: 'bg-gray-800/60',   border: 'border-gray-700/50',   icon: '☁️' };
});

const moonEmoji = computed(() => {
  const pct = forecast.value?.moon?.illumination_pct ?? 0;
  if (pct < 6)  return '🌑';
  if (pct < 25) return '🌒';
  if (pct < 45) return '🌓';
  if (pct < 55) return '🌔';
  if (pct < 75) return '🌕';
  if (pct < 90) return '🌖';
  if (pct < 98) return '🌗';
  return '🌘';
});

function hourLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }).replace(' ', '');
}

function cloudEmoji(cover: string): string {
  const map: Record<string, string> = {
    CLEAR: '⭐', MOSTLY_CLEAR: '🌙', PARTLY_CLOUDY: '⛅',
    MOSTLY_CLOUDY: '🌥', OVERCAST: '☁️',
  };
  return map[cover] ?? '?';
}

function scoreBarColor(score: number): string {
  if (score >= 0.75) return 'bg-indigo-500';
  if (score >= 0.5)  return 'bg-green-500';
  if (score >= 0.25) return 'bg-amber-500';
  return 'bg-gray-600';
}

function scoreTextColor(score: number): string {
  if (score >= 0.75) return 'text-indigo-400';
  if (score >= 0.5)  return 'text-green-400';
  if (score >= 0.25) return 'text-amber-400';
  return 'text-gray-500';
}

async function loadForecast() {
  loading.value = true;
  error.value = null;
  try {
    const resp = await fetch('/api/astronomy/tonight');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    forecast.value = await resp.json();
  } catch (e: any) {
    error.value = 'Could not load astronomy forecast. Check that station coordinates are configured.';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  weatherStore.fetchLatestReading();
  loadForecast();
});
</script>
```

**Step 2: Commit**
```bash
git add frontend/src/views/Sky.vue
git commit -m "feat: add Sky.vue astronomy forecast view"
```

---

## Task 8: Wire router and nav

**Files:**
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/src/App.vue`

**Step 1: Add route to router**

In `frontend/src/router/index.ts`, add the import and route:

```typescript
import Sky from '../views/Sky.vue';
```

Add to the routes array (after the Home route):
```typescript
  {
    path: '/sky',
    name: 'Sky',
    component: Sky,
    meta: { public: true },
  },
```

**Step 2: Add nav link in App.vue**

In `frontend/src/App.vue`, find `navLinks` and add after the Dashboard entry:
```typescript
  { to: '/sky',      label: 'Tonight\'s Sky',  icon: 'star' },
```

**Step 3: Commit**
```bash
git add frontend/src/router/index.ts frontend/src/App.vue
git commit -m "feat: wire /sky route and nav link"
```

---

## Task 9: Build frontend and deploy

**Step 1: Build**
```bash
cd /home/irjudson/Projects/wx-tools/frontend && npm run build
```
Expected: build succeeds, `dist/` created.

**Step 2: Copy to static**
```bash
cp -r dist/* ../static/
```

**Step 3: Verify the page loads in browser**

Navigate to `http://localhost:7000/sky` (or your production URL). Confirm:
- "Tonight's Sky" header renders
- Moon card shows phase and illumination
- Bortle card shows sky quality
- Hourly strip shows 12 bars with scores
- Local conditions card shows current temp/humidity/wind from station

**Step 4: Commit built assets**
```bash
cd /home/irjudson/Projects/wx-tools
git add static/
git commit -m "chore: rebuild frontend with Sky astronomy forecast view"
```

---

## Done

The Sky page is live. Future improvements to consider:
- Twilight times (astronomical/nautical) so you know when darkness actually begins
- Planet rise/set (requires ephemeris — would add ephem dep)
- Configurable lat/lon via Settings UI (currently env-var only)
