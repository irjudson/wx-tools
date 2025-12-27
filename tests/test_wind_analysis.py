import pytest
from src.analysis.wind import WindAnalyzer


def test_wind_analyzer_config_schema():
    analyzer = WindAnalyzer()
    schema = analyzer.get_config_schema()

    assert "turbine_model" in schema["properties"]
    assert "hub_height_m" in schema["properties"]


def test_wind_speed_height_adjustment():
    """Test wind speed adjustment for hub height"""
    analyzer = WindAnalyzer()

    # Wind speed at 2m height is 5 mph
    # At 10m height should be higher
    adjusted = analyzer._adjust_wind_speed_for_height(5.0, 2, 10)

    assert adjusted > 5.0
