import pytest
import numpy as np
from app.metrics_service import MetricsService
from app.schemas import AlignedDataPoint

def test_metrics_summary_calculation():
    # Synthetic dataset with known statistical properties:
    # Point 1: Actual 1000, Forecast 1200 -> Error +200, Abs 200, Pct 20%
    # Point 2: Actual 2000, Forecast 1800 -> Error -200, Abs 200, Pct 10%
    # Point 3: Actual 3000, Forecast 3000 -> Error 0,    Abs 0,   Pct 0%
    points = [
        AlignedDataPoint(start_time="2026-01-01T00:00:00Z", settlement_period=1, actual_generation=1000, forecast_generation=1200, error=200, abs_error=200, pct_error=20.0),
        AlignedDataPoint(start_time="2026-01-01T01:00:00Z", settlement_period=3, actual_generation=2000, forecast_generation=1800, error=-200, abs_error=200, pct_error=10.0),
        AlignedDataPoint(start_time="2026-01-01T02:00:00Z", settlement_period=5, actual_generation=3000, forecast_generation=3000, error=0, abs_error=0, pct_error=0.0),
    ]

    summary = MetricsService.calculate_summary(points)
    assert summary is not None
    assert summary.sample_size == 3
    # MAE = (200 + 200 + 0) / 3 = 133.33
    assert summary.mae == pytest.approx(133.33, 0.01)
    # RMSE = sqrt((40000 + 40000 + 0) / 3) = sqrt(26666.67) = 163.30
    assert summary.rmse == pytest.approx(163.30, 0.01)
    # Mean error (Bias) = (200 - 200 + 0) / 3 = 0.00
    assert summary.mean_error == 0.0
    # MAPE = (20 + 10 + 0) / 3 = 10.0%
    assert summary.mape == 10.0
    assert summary.max_overforecast == 200.0
    assert summary.max_underforecast == -200.0
    # Correlation between [1000, 2000, 3000] and [1200, 1800, 3000]
    assert summary.correlation > 0.95

def test_metrics_by_period():
    points = [
        AlignedDataPoint(start_time="2026-01-01T00:00:00Z", settlement_period=1, actual_generation=1000, forecast_generation=1100, error=100, abs_error=100),
        AlignedDataPoint(start_time="2026-01-02T00:00:00Z", settlement_period=1, actual_generation=1000, forecast_generation=900, error=-100, abs_error=100),
        AlignedDataPoint(start_time="2026-01-01T01:00:00Z", settlement_period=3, actual_generation=2000, forecast_generation=2050, error=50, abs_error=50),
    ]

    period_metrics = MetricsService.calculate_by_settlement_period(points)
    assert len(period_metrics) == 2
    p1 = next(p for p in period_metrics if p.settlement_period == 1)
    assert p1.sample_size == 2
    assert p1.mae == 100.0
    assert p1.bias == 0.0
    assert p1.avg_actual == 1000.0
