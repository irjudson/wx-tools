import pytest
from pathlib import Path
from src.services.csv_import import parse_csv_file, import_csv_data


def test_parse_csv_file():
    csv_path = Path("tests/fixtures/sample.csv")
    readings = parse_csv_file(csv_path)

    assert len(readings) == 2
    assert readings[0]["outdoor_temp_f"] == 41.2
    assert readings[0]["humidity_pct"] == 61
    assert readings[1]["outdoor_temp_f"] == 42.1


def test_import_csv_data_stats():
    csv_path = Path("tests/fixtures/sample.csv")
    stats = import_csv_data(csv_path, db=None)  # Mock db needed

    assert stats["total_rows"] == 2
