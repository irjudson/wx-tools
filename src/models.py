from sqlalchemy import Column, Integer, Float, DateTime, String
from src.database import Base
from datetime import datetime


class WeatherReading(Base):
    __tablename__ = "weather_readings"

    timestamp = Column(DateTime(timezone=True), primary_key=True)
    outdoor_temp_f = Column(Float, nullable=True)
    feels_like_f = Column(Float, nullable=True)
    dew_point_f = Column(Float, nullable=True)
    wind_speed_mph = Column(Float, nullable=True)
    wind_gust_mph = Column(Float, nullable=True)
    max_daily_gust_mph = Column(Float, nullable=True)
    wind_direction_deg = Column(Integer, nullable=True)
    rain_rate_in_hr = Column(Float, nullable=True)
    event_rain_in = Column(Float, nullable=True)
    daily_rain_in = Column(Float, nullable=True)
    weekly_rain_in = Column(Float, nullable=True)
    monthly_rain_in = Column(Float, nullable=True)
    yearly_rain_in = Column(Float, nullable=True)
    total_rain_in = Column(Float, nullable=True)
    relative_pressure_inhg = Column(Float, nullable=True)
    absolute_pressure_inhg = Column(Float, nullable=True)
    humidity_pct = Column(Integer, nullable=True)
    uv_index = Column(Float, nullable=True)
    solar_radiation_wm2 = Column(Float, nullable=True)
    indoor_temp_f = Column(Float, nullable=True)
    indoor_humidity_pct = Column(Integer, nullable=True)
    indoor_feels_like_f = Column(Float, nullable=True)
    indoor_dew_point_f = Column(Float, nullable=True)
    sensor1_temp_f = Column(Float, nullable=True)
    sensor1_humidity_pct = Column(Integer, nullable=True)
    sensor1_feels_like_f = Column(Float, nullable=True)
    sensor1_dew_point_f = Column(Float, nullable=True)
    outdoor_battery = Column(Integer, nullable=True)
    sensor1_battery = Column(Integer, nullable=True)


class Configuration(Base):
    __tablename__ = "configuration"

    key = Column(String(255), primary_key=True)
    value = Column(String(1024), nullable=False)
