import pytest
from datetime import datetime
from src.analysis.base import EnergyAnalyzer, AnalysisResult


def test_analysis_result_creation():
    result = AnalysisResult(
        analyzer_type="solar",
        start_date=datetime(2024, 1, 1),
        end_date=datetime(2024, 12, 31),
        total_kwh=5000.0,
        config={"panel_area_m2": 20},
        data={"monthly": [100, 200, 300]}
    )

    assert result.analyzer_type == "solar"
    assert result.total_kwh == 5000.0
