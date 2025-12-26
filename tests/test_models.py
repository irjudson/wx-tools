import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.database import Base
from src.models import WeatherReading


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    yield session
    session.close()


def test_weather_reading_creation(test_db):
    reading = WeatherReading(
        timestamp=datetime.now(timezone.utc),
        outdoor_temp_f=42.1,
        humidity_pct=60,
        wind_speed_mph=6.5,
        solar_radiation_wm2=125.5
    )
    test_db.add(reading)
    test_db.commit()

    assert reading.timestamp is not None
    assert reading.outdoor_temp_f == 42.1
