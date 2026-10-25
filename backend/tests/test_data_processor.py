import pytest
import pandas as pd
from app.data_processor import (
    clean_actuals,
    clean_forecasts,
    validate_january_coverage,
    parse_iso_utc,
)

def test_parse_iso_utc():
    assert parse_iso_utc("2026-01-01T00:00:00Z") == "2026-01-01T00:00:00Z"
    assert parse_iso_utc("2026-01-01 00:30:00+00:00") == "2026-01-01T00:30:00Z"
    assert parse_iso_utc("invalid-date") is None
    assert parse_iso_utc("") is None

def test_clean_actuals_filtering_and_deduplication():
    raw = [
        {"fuelType": "CCGT", "startTime": "2026-01-01T00:00:00Z", "generation": 5000},
        {"fuelType": "WIND", "startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "generation": 12000, "settlementDate": "2026-01-01", "settlementPeriod": 1},
        # Duplicate with newer publishTime
        {"fuelType": "WIND", "startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:35:00Z", "generation": 12100, "settlementDate": "2026-01-01", "settlementPeriod": 1},
        # Invalid generation
        {"fuelType": "WIND", "startTime": "2026-01-01T00:30:00Z", "generation": None},
        {"fuelType": "WIND", "startTime": "2026-01-01T01:00:00Z", "generation": -10},
    ]

    cleaned, stats = clean_actuals(raw)
    assert stats["wind_filtered"] == 4
    assert stats["duplicates_removed"] == 1
    assert stats["invalid"] == 2
    assert len(cleaned) == 1
    assert cleaned[0]["start_time"] == "2026-01-01T00:00:00Z"
    assert cleaned[0]["actual_generation"] == 12100.0

def test_clean_forecasts_preserves_versions():
    raw = [
        {"publishTime": "2025-12-31T09:30:00Z", "startTime": "2026-01-01T12:00:00Z", "generation": 15000},
        {"publishTime": "2025-12-31T11:30:00Z", "startTime": "2026-01-01T12:00:00Z", "generation": 15500},
        # Duplicate pair
        {"publishTime": "2025-12-31T11:30:00Z", "startTime": "2026-01-01T12:00:00Z", "generation": 15500},
    ]

    cleaned, stats = clean_forecasts(raw)
    assert len(cleaned) == 2
    assert stats["duplicates_removed"] == 1

def test_validate_january_coverage_complete():
    # 1488 half-hours in Jan 2026
    rng = pd.date_range("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z", freq="30min", inclusive="left")
    df = pd.DataFrame({"start_time": [dt.strftime("%Y-%m-%dT%H:%M:%SZ") for dt in rng]})

    summary = validate_january_coverage(df, forecasts_count=5000, unique_pubs=250)
    assert summary.expected_intervals == 1488
    assert summary.actual_intervals_found == 1488
    assert summary.missing_intervals_count == 0
    assert summary.coverage_pct == 100.0

def test_validate_january_coverage_with_gaps():
    rng = pd.date_range("2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z", freq="30min", inclusive="left")
    # Drop first 5 intervals
    df = pd.DataFrame({"start_time": [dt.strftime("%Y-%m-%dT%H:%M:%SZ") for dt in rng[5:]]})

    summary = validate_january_coverage(df)
    assert summary.expected_intervals == 1488
    assert summary.actual_intervals_found == 1483
    assert summary.missing_intervals_count == 5
    assert len(summary.missing_intervals) == 5
    assert summary.missing_intervals[0] == "2026-01-01T00:00:00Z"
