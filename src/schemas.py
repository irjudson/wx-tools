from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class StationUpload(BaseModel):
    """Schema for weather station upload data (WS-2902 format)"""
    PASSKEY: str
    dateutc: str
    tempf: Optional[float] = None
    feelsLike: Optional[float] = None
    dewPoint: Optional[float] = None
    humidity: Optional[int] = None
    windspeedmph: Optional[float] = None
    windgustmph: Optional[float] = None
    maxdailygust: Optional[float] = None
    winddir: Optional[int] = None
    rainratein: Optional[float] = None
    eventrainin: Optional[float] = None
    dailyrainin: Optional[float] = None
    weeklyrainin: Optional[float] = None
    monthlyrainin: Optional[float] = None
    yearlyrainin: Optional[float] = None
    totalrainin: Optional[float] = None
    baromrelin: Optional[float] = None
    baromabsin: Optional[float] = None
    uv: Optional[float] = None
    solarradiation: Optional[float] = None
    tempinf: Optional[float] = None
    humidityin: Optional[int] = None
    feelsLikein: Optional[float] = None
    dewPointin: Optional[float] = None
    temp1f: Optional[float] = None
    humidity1: Optional[int] = None
    feelsLike1: Optional[float] = None
    dewPoint1: Optional[float] = None
    batt1: Optional[int] = None
    battout: Optional[int] = None


class WeatherReadingResponse(BaseModel):
    """Schema for weather reading response"""
    timestamp: datetime
    outdoor_temp_f: Optional[float]
    humidity_pct: Optional[int]
    wind_speed_mph: Optional[float]
    solar_radiation_wm2: Optional[float]

    model_config = ConfigDict(from_attributes=True)
