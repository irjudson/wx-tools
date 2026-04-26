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
