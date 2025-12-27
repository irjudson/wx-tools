import pytest
from datetime import datetime
from src.analysis.solar import SolarAnalyzer


def test_solar_analyzer_config_schema():
    analyzer = SolarAnalyzer()
    schema = analyzer.get_config_schema()

    assert "panel_area_m2" in schema["properties"]
    assert "efficiency_pct" in schema["properties"]


def test_solar_kwh_calculation():
    """Test solar kWh calculation formula"""
    # 100 W/m² * 20 m² * 0.20 efficiency * (5/60) hours = 0.333 kWh
    solar_radiation = 100  # W/m²
    panel_area = 20  # m²
    efficiency = 0.20
    hours = 5 / 60  # 5 minutes

    expected_kwh = (solar_radiation * panel_area * efficiency * hours) / 1000

    analyzer = SolarAnalyzer()
    calculated = analyzer._calculate_kwh(solar_radiation, panel_area, efficiency, hours)

    assert abs(calculated - expected_kwh) < 0.001
