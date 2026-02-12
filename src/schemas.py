from pydantic import BaseModel, ConfigDict, field_serializer
from datetime import datetime, timezone
from typing import Optional, Dict, Any


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
    hourlyrainin: Optional[float] = None
    stationtype: Optional[str] = None


class WeatherReadingResponse(BaseModel):
    """Weather reading response with all metrics"""
    timestamp: datetime
    # Outdoor conditions
    outdoor_temp_f: Optional[float]
    feels_like_f: Optional[float]
    dew_point_f: Optional[float]
    humidity_pct: Optional[int]
    # Wind
    wind_speed_mph: Optional[float]
    wind_gust_mph: Optional[float]
    max_daily_gust_mph: Optional[float]
    wind_direction_deg: Optional[int]
    # Precipitation
    rain_rate_in_hr: Optional[float]
    event_rain_in: Optional[float]
    daily_rain_in: Optional[float]
    weekly_rain_in: Optional[float]
    monthly_rain_in: Optional[float]
    yearly_rain_in: Optional[float]
    total_rain_in: Optional[float]
    # Atmospheric
    relative_pressure_inhg: Optional[float]
    absolute_pressure_inhg: Optional[float]
    # Solar & UV
    uv_index: Optional[float]
    solar_radiation_wm2: Optional[float]
    # Indoor
    indoor_temp_f: Optional[float]
    indoor_humidity_pct: Optional[int]
    indoor_feels_like_f: Optional[float]
    indoor_dew_point_f: Optional[float]
    # Sensor 1
    sensor1_temp_f: Optional[float]
    sensor1_humidity_pct: Optional[int]
    sensor1_feels_like_f: Optional[float]
    sensor1_dew_point_f: Optional[float]
    # Battery
    outdoor_battery: Optional[int]
    sensor1_battery: Optional[int]

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('timestamp')
    def serialize_timestamp(self, dt: datetime, _info):
        """Ensure timestamp is UTC-aware before serialization"""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt


class ImportPathRequest(BaseModel):
    """Schema for CSV import from file path"""
    path: str


class AnalysisRequest(BaseModel):
    """Schema for analysis API requests"""
    start: datetime
    end: datetime
    config: Dict[str, Any]


class MQTTConfigRequest(BaseModel):
    """Schema for MQTT configuration update requests"""
    broker_url: str
    username: Optional[str] = None
    password: Optional[str] = None
    enabled: bool


class StationConfigRequest(BaseModel):
    """Schema for station configuration update requests"""
    passkey: str


class TimezoneUpdateRequest(BaseModel):
    """Schema for timezone update requests"""
    timezone: str
