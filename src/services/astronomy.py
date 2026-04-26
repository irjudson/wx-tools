"""Astronomical observing forecast services.

Three service classes:
- ForecastService       — 3-hourly seeing/transparency/cloud from 7timer.info ASTRO (free, no key)
- LightPollutionService — Bortle class: config override → lightpollutionmap.info → estimate
- MoonService           — phase name + illumination % (pure Python, no extra deps)
"""

import logging
import math
import requests
from datetime import datetime, timedelta, timezone
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
    milky_way_visibility: str
    source: str                  # "configured", "api", or "estimated"


class MoonInfo(BaseModel):
    phase: str
    illumination_pct: float
    interfering: bool


class TonightForecast(BaseModel):
    suitability: str             # "excellent", "good", "fair", "poor"
    score: float                 # 0.0–1.0
    issues: List[str]
    moon: MoonInfo
    sky_quality: Optional[SkyQuality]
    forecast: List[HourlyForecast]


# ── Helpers ────────────────────────────────────────────────────────────────

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


def _sky_quality_for_bortle(bortle: int, source: str) -> "SkyQuality":
    return SkyQuality(
        bortle_class=bortle,
        bortle_name=_BORTLE_DESCRIPTIONS.get(bortle, "Unknown"),
        sqm_estimate=_SQM_MIDPOINTS.get(bortle, 20.0),
        limiting_magnitude=_BORTLE_LIMITING_MAG.get(bortle, 5.5),
        milky_way_visibility=_BORTLE_MILKY_WAY.get(bortle, "not visible"),
        source=source,
    )


# ── Services ───────────────────────────────────────────────────────────────

class ForecastService:
    """3-hourly astronomy forecast from 7timer.info ASTRO (free, no API key).

    7timer provides seeing index (1-8 arc-second scale), atmospheric
    transparency (extinction magnitudes), and cloud cover tuned specifically
    for amateur astronomy — far better than general weather visibility proxies.
    """

    _API = "http://www.7timer.info/bin/api.pl"
    _TIMEOUT = 15

    # Wind speed midpoints in km/h for 7timer scale 1-8
    _WIND_KMH = {1: 0.5, 2: 6.0, 3: 20.0, 4: 34.0, 5: 50.0, 6: 75.0, 7: 103.0, 8: 130.0}

    def get_forecast(self, latitude: float, longitude: float, hours: int = 12) -> List[HourlyForecast]:
        try:
            resp = requests.get(
                self._API,
                params={
                    "lon": round(longitude, 4),
                    "lat": round(latitude, 4),
                    "product": "astro",
                    "output": "json",
                },
                timeout=self._TIMEOUT,
            )
            resp.raise_for_status()
        except Exception as exc:
            log.warning(f"7timer request failed: {exc}")
            return []

        data = resp.json()
        init_str = data.get("init", "")
        try:
            init_dt = datetime.strptime(init_str, "%Y%m%d%H").replace(tzinfo=timezone.utc)
        except ValueError:
            log.warning(f"7timer invalid init time: {init_str!r}")
            return []

        now_utc = datetime.now(timezone.utc)
        cutoff = now_utc + timedelta(hours=hours)
        results: List[HourlyForecast] = []

        for entry in data.get("dataseries", []):
            tp = entry.get("timepoint", 0)
            slot_time = init_dt + timedelta(hours=tp)
            if slot_time < now_utc:
                continue
            if slot_time > cutoff:
                break

            cc = self._cloud_cover(entry.get("cloudcover", 1))
            se = self._seeing(entry.get("seeing", 4))
            tr = self._transparency(entry.get("transparency", 4))
            wind_kmh = self._WIND_KMH.get(entry.get("wind10m", {}).get("speed", 2), 10.0)
            temp_c = float(entry.get("temp2m", 0))

            results.append(HourlyForecast(
                hour=slot_time,
                cloud_cover=cc,
                transparency=tr,
                seeing=se,
                score=round(_hour_score(cc, tr, se), 2),
                temperature_c=temp_c,
                wind_speed_kmh=wind_kmh,
            ))

        return results

    @staticmethod
    def _cloud_cover(cc: int) -> CloudCover:
        # 7timer scale: 1=0-6%, 2=6-19%, 3=19-31%, 4=31-51%, 5=51-74%, 6=74-88%, 7+=overcast
        if cc <= 1:
            return CloudCover.CLEAR
        if cc == 2:
            return CloudCover.MOSTLY_CLEAR
        if cc <= 4:
            return CloudCover.PARTLY_CLOUDY
        if cc <= 6:
            return CloudCover.MOSTLY_CLOUDY
        return CloudCover.OVERCAST

    @staticmethod
    def _seeing(seeing: int) -> Seeing:
        # 7timer scale: 1=<0.5", 2=0.5-0.75", 3=0.75-1", 4=1-1.25", 5=1.25-1.5", 6=1.5-2", 7=2-2.5", 8=>2.5"
        if seeing <= 2:
            return Seeing.EXCELLENT
        if seeing <= 4:
            return Seeing.GOOD
        if seeing == 5:
            return Seeing.AVERAGE
        if seeing == 6:
            return Seeing.BELOW_AVERAGE
        return Seeing.POOR

    @staticmethod
    def _transparency(transp: int) -> Transparency:
        # 7timer scale: 1=<0.3 mag extinction (best), 8=>1 mag (worst)
        if transp <= 1:
            return Transparency.EXCELLENT
        if transp == 2:
            return Transparency.ABOVE_AVERAGE
        if transp <= 4:
            return Transparency.AVERAGE
        if transp <= 6:
            return Transparency.BELOW_AVERAGE
        return Transparency.POOR


class LightPollutionService:
    """Bortle class and sky quality.

    Priority:
    1. STATION_BORTLE_CLASS env var (user-configured ground truth)
    2. lightpollutionmap.info /sqm/ API (free, no key)
    3. Static fallback (Bortle 4)
    """

    _TIMEOUT = 5

    def get_sky_quality(self, latitude: float, longitude: float) -> SkyQuality:
        from src.config import get_settings as _get_settings
        cfg = _get_settings()

        # 1. Config override — user knows their site better than any API
        if cfg.station_bortle_class is not None:
            bortle = max(1, min(9, cfg.station_bortle_class))
            return _sky_quality_for_bortle(bortle, "configured")

        # 2. lightpollutionmap.info QueryRaster API (requires free key)
        if cfg.station_lightpoll_key:
            sq = self._query_raster(latitude, longitude, cfg.station_lightpoll_key)
            if sq:
                return sq

        # 3. lightpollutionmap.info legacy SQM endpoint (no key, may be unreliable)
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
            log.warning(f"lightpollutionmap.info SQM request failed: {exc}")

        # 4. Static fallback
        return _sky_quality_for_bortle(4, "estimated")

    def _query_raster(self, latitude: float, longitude: float, key: str) -> Optional[SkyQuality]:
        """lightpollutionmap.info QueryRaster API — returns World Atlas 2015 brightness."""
        try:
            resp = requests.get(
                "https://www.lightpollutionmap.info/QueryRaster/",
                params={
                    "ql": "wa_2015",
                    "qt": "point",
                    "qd": f"{longitude},{latitude}",
                    "key": key,
                },
                timeout=self._TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
            # Response is artificial brightness in mcd/m² on a unit sphere
            # Convert to SQM using Falchi et al. formula
            brightness_mcd = float(data.get("data", 0) or 0)
            if brightness_mcd <= 0:
                return None
            # Natural sky background ≈ 0.171 mcd/m²; total = natural + artificial
            total = brightness_mcd + 0.171
            sqm = round(-2.5 * math.log10(total / 108.0) + 12.58, 2)
            bortle = _bortle_from_sqm(sqm)
            return SkyQuality(
                bortle_class=bortle,
                bortle_name=_BORTLE_DESCRIPTIONS.get(bortle, "Unknown"),
                sqm_estimate=sqm,
                limiting_magnitude=_BORTLE_LIMITING_MAG.get(bortle, 5.5),
                milky_way_visibility=_BORTLE_MILKY_WAY.get(bortle, "not visible"),
                source="api",
            )
        except Exception as exc:
            log.warning(f"lightpollutionmap.info QueryRaster failed: {exc}")
            return None


class MoonService:
    """Moon phase and illumination (pure Python, no extra dependencies)."""

    _KNOWN_NEW_MOON = datetime(2000, 1, 6, 18, 14, tzinfo=timezone.utc)
    _SYNODIC_PERIOD = 29.53058867  # days

    def get_moon_info(self, at: Optional[datetime] = None) -> MoonInfo:
        if at is None:
            at = datetime.now(timezone.utc)
        if at.tzinfo is None:
            at = at.replace(tzinfo=timezone.utc)

        delta_days = (at - self._KNOWN_NEW_MOON).total_seconds() / 86400
        age = delta_days % self._SYNODIC_PERIOD

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
