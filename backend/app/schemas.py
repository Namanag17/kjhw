from typing import List, Optional
from pydantic import BaseModel, Field

class ValidationSummary(BaseModel):
    expected_intervals: int = 1488
    actual_intervals_found: int
    missing_intervals_count: int
    missing_intervals: List[str] = []
    coverage_pct: float
    actual_records_count: int
    forecast_records_count: int
    unique_forecast_publications: int

class AlignedDataPoint(BaseModel):
    start_time: str
    settlement_date: Optional[str] = None
    settlement_period: Optional[int] = None
    actual_generation: Optional[float] = None
    forecast_generation: Optional[float] = None
    forecast_publish_time: Optional[str] = None
    error: Optional[float] = Field(None, description="Forecast - Actual (positive = over-forecast / short)")
    abs_error: Optional[float] = None
    pct_error: Optional[float] = None
    horizon_hours: Optional[float] = Field(None, description="Delivery start_time minus forecast publish_time in hours")

class MetricsSummary(BaseModel):
    sample_size: int
    mae: float = Field(..., description="Mean Absolute Error in MW")
    rmse: float = Field(..., description="Root Mean Square Error in MW")
    mean_error: float = Field(..., description="Mean Error / Bias in MW (Forecast - Actual)")
    mape: Optional[float] = Field(None, description="Mean Absolute Percentage Error (%)")
    p10_error: float
    p50_error: float
    p90_error: float
    max_overforecast: float
    max_underforecast: float
    correlation: Optional[float] = None

class PeriodMetric(BaseModel):
    settlement_period: int
    sample_size: int
    mae: float
    rmse: float
    bias: float
    avg_actual: float
    avg_forecast: float

class DailyMetric(BaseModel):
    date: str
    sample_size: int
    mae: float
    rmse: float
    bias: float
    avg_actual: float
    avg_forecast: float

class HorizonMetric(BaseModel):
    horizon_hours_min: float
    horizon_hours_max: float
    sample_size: int
    mae: float
    rmse: float
    bias: float

class ForecastVersionItem(BaseModel):
    publish_time: str
    start_time: str
    forecast_generation: float
    horizon_hours: float
    is_decision_eligible: bool
    is_selected_at_cutoff: bool
    is_latest: bool

class CutoffConfig(BaseModel):
    cutoff_type: str = Field("day_ahead_fixed_time", description="'day_ahead_fixed_time' or 'lead_time_hours'")
    day_ahead_time_utc: str = Field("11:00", description="Time on D-1 for delivery day D (HH:MM)")
    lead_time_hours: Optional[float] = Field(None, description="Alternative: fixed lead time in hours (e.g. 24.0)")
    alignment_mode: str = Field("hourly_exact", description="'hourly_exact' (744 points) or 'half_hourly_mapped' (1488 points)")
