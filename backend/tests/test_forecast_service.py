import pytest
from datetime import datetime, timezone
import pandas as pd
from app.forecast_service import ForecastService
from app.schemas import CutoffConfig

def test_calculate_cutoff_timestamp_day_ahead():
    fs = ForecastService()
    # Delivery: 2026-01-05 14:00:00 UTC
    delivery_dt = datetime(2026, 1, 5, 14, 0, 0, tzinfo=timezone.utc)
    
    cfg = CutoffConfig(
        cutoff_type="day_ahead_fixed_time",
        day_ahead_time_utc="11:00",
    )
    cutoff = fs.calculate_cutoff_timestamp(delivery_dt, cfg)
    
    # Must be 2026-01-04 11:00:00 UTC
    assert cutoff.year == 2026
    assert cutoff.month == 1
    assert cutoff.day == 4
    assert cutoff.hour == 11
    assert cutoff.minute == 0

def test_calculate_cutoff_timestamp_lead_time_hours():
    fs = ForecastService()
    delivery_dt = datetime(2026, 1, 5, 14, 0, 0, tzinfo=timezone.utc)
    
    cfg = CutoffConfig(
        cutoff_type="lead_time_hours",
        lead_time_hours=24.0,
    )
    cutoff = fs.calculate_cutoff_timestamp(delivery_dt, cfg)
    
    # Exactly 24 hours prior
    assert cutoff == datetime(2026, 1, 4, 14, 0, 0, tzinfo=timezone.utc)

def test_align_forecasts_and_actuals_selection():
    fs = ForecastService()
    
    # Delivery on 2026-01-02 12:00:00 UTC
    # Actual generation = 10,000 MW
    act_df = pd.DataFrame([{
        "start_time": "2026-01-02T12:00:00Z",
        "settlement_date": "2026-01-02",
        "settlement_period": 25,
        "actual_generation": 10000.0,
    }])

    # 3 forecast publications for this target delivery:
    # 1. Dec 31 15:30 (too early, eligible) -> 8,000 MW
    # 2. Jan 01 09:30 (before cutoff Jan 01 11:00, eligible and latest at cutoff!) -> 9,500 MW
    # 3. Jan 01 15:30 (after cutoff, ineligible for Day-Ahead decision, but eligible for latest) -> 10,200 MW
    fc_df = pd.DataFrame([
        {"publish_time": "2025-12-31T15:30:00Z", "start_time": "2026-01-02T12:00:00Z", "forecast_generation": 8000.0},
        {"publish_time": "2026-01-01T09:30:00Z", "start_time": "2026-01-02T12:00:00Z", "forecast_generation": 9500.0},
        {"publish_time": "2026-01-01T15:30:00Z", "start_time": "2026-01-02T12:00:00Z", "forecast_generation": 10200.0},
    ])

    cfg = CutoffConfig(
        cutoff_type="day_ahead_fixed_time",
        day_ahead_time_utc="11:00",
        alignment_mode="hourly_exact",
    )

    decision_pts, latest_pts = fs.align_forecasts_and_actuals(act_df, fc_df, cfg)

    assert len(decision_pts) == 1
    # Day-Ahead decision forecast MUST be the 09:30 run (9,500 MW)
    assert decision_pts[0].forecast_generation == 9500.0
    assert decision_pts[0].forecast_publish_time == "2026-01-01T09:30:00Z"
    # Error = Forecast - Actual = 9500 - 10000 = -500 (under-forecast)
    assert decision_pts[0].error == -500.0
    assert decision_pts[0].abs_error == 500.0
    assert decision_pts[0].pct_error == 5.0

    # Latest forecast benchmark MUST be the 15:30 run (10,200 MW)
    assert len(latest_pts) == 1
    assert latest_pts[0].forecast_generation == 10200.0
    assert latest_pts[0].forecast_publish_time == "2026-01-01T15:30:00Z"
    # Error = 10200 - 10000 = +200
    assert latest_pts[0].error == 200.0
