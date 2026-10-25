import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from app.config import (
    DEFAULT_DAY_AHEAD_CUTOFF_TIME,
    JAN_2026_START,
    JAN_2026_END,
)
from app.elexon_client import ElexonClient
from app.data_store import DataStore
from app.data_processor import (
    clean_actuals,
    clean_forecasts,
    validate_january_coverage,
)
from app.forecast_service import ForecastService
from app.metrics_service import MetricsService
from app.schemas import (
    ValidationSummary,
    AlignedDataPoint,
    MetricsSummary,
    PeriodMetric,
    DailyMetric,
    HorizonMetric,
    ForecastVersionItem,
    CutoffConfig,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("windfor-api")

app = FastAPI(
    title="UK Wind Generation Forecast & Day-Ahead Procurement API",
    description="Elexon BMRS Wind Generation Forecast (WINDFOR) vs Outturn Actuals (FUELHH) for Day-Ahead Power Procurement (January 2026)",
    version="1.0.0",
)

# Enable CORS for React frontend (local dev and cloud deployments)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data_store = DataStore()
elexon_client = ElexonClient()
forecast_service = ForecastService()
metrics_service = MetricsService()

@app.get("/api/health")
def health_check():
    counts = data_store.get_counts()
    return {
        "status": "healthy",
        "service": "windfor-api",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "database_counts": counts,
    }

def run_sync_task():
    logger.info("Starting background synchronization of January 2026 Elexon data...")
    # 1. Fetch Actuals
    raw_actuals = elexon_client.fetch_actuals_fuelhh(start_iso=JAN_2026_START, end_iso=JAN_2026_END)
    cleaned_act, act_stats = clean_actuals(raw_actuals)
    data_store.save_actuals(cleaned_act)

    # 2. Fetch Forecasts
    raw_forecasts = elexon_client.fetch_forecasts_windfor()
    cleaned_fc, fc_stats = clean_forecasts(raw_forecasts)
    data_store.save_forecasts(cleaned_fc)

    data_store.set_metadata("last_synced_at", datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    logger.info("Synchronization complete.")

@app.post("/api/sync")
def trigger_sync(background_tasks: BackgroundTasks, force: bool = Query(False)):
    """
    Synchronize January 2026 Elexon data into SQLite database.
    If data already exists and force is False, returns current status.
    """
    counts = data_store.get_counts()
    if counts["actuals_count"] > 0 and counts["forecasts_count"] > 0 and not force:
        return {
            "message": "Data already populated. Use ?force=true to resync.",
            "counts": counts,
            "last_synced_at": data_store.get_metadata("last_synced_at"),
        }

    # Run synchronously if database is empty so client gets instant readiness, or in background
    run_sync_task()
    return {
        "message": "Synchronization completed successfully.",
        "counts": data_store.get_counts(),
        "last_synced_at": data_store.get_metadata("last_synced_at"),
    }

@app.get("/api/validation", response_model=ValidationSummary)
def get_validation():
    """
    Validate coverage against expected 1,488 half-hour settlement periods in January 2026.
    """
    actuals_df = data_store.get_actuals_df(JAN_2026_START, JAN_2026_END)
    counts = data_store.get_counts()
    summary = validate_january_coverage(
        actuals_df=actuals_df,
        start_iso=JAN_2026_START,
        end_iso=JAN_2026_END,
        forecasts_count=counts["forecasts_count"],
        unique_pubs=counts["unique_publications"],
    )
    return summary

def _build_cutoff_config(
    cutoff_type: str,
    day_ahead_time_utc: str,
    lead_time_hours: Optional[float],
    alignment_mode: str,
) -> CutoffConfig:
    return CutoffConfig(
        cutoff_type=cutoff_type,
        day_ahead_time_utc=day_ahead_time_utc,
        lead_time_hours=lead_time_hours,
        alignment_mode=alignment_mode,
    )

@app.get("/api/forecasts/series")
def get_forecast_series(
    start_date: str = Query("2026-01-01", description="Start date YYYY-MM-DD"),
    end_date: str = Query("2026-01-31", description="End date YYYY-MM-DD"),
    cutoff_type: str = Query("day_ahead_fixed_time", description="'day_ahead_fixed_time' or 'lead_time_hours'"),
    day_ahead_time_utc: str = Query(DEFAULT_DAY_AHEAD_CUTOFF_TIME, description="Cutoff time on D-1 in UTC (HH:MM)"),
    lead_time_hours: Optional[float] = Query(None, description="Hours ahead if cutoff_type is lead_time_hours"),
    alignment_mode: str = Query("hourly_exact", description="'hourly_exact' (744 pts) or 'half_hourly_mapped' (1488 pts)"),
):
    """
    Retrieve aligned time-series of Actual Wind Generation, Day-Ahead Decision Forecast,
    and Latest Forecast along with associated error metrics.
    """
    # Auto-seed data if empty
    counts = data_store.get_counts()
    if counts["actuals_count"] == 0:
        run_sync_task()

    start_iso = f"{start_date}T00:00:00Z"
    end_iso = f"{end_date}T23:59:59Z"

    act_df = data_store.get_actuals_df(start_iso, end_iso)
    fc_df = data_store.get_forecasts_df(start_iso, end_iso)

    cfg = _build_cutoff_config(cutoff_type, day_ahead_time_utc, lead_time_hours, alignment_mode)
    decision_pts, latest_pts = forecast_service.align_forecasts_and_actuals(act_df, fc_df, cfg)

    dec_metrics = metrics_service.calculate_summary(decision_pts)
    lat_metrics = metrics_service.calculate_summary(latest_pts)

    return {
        "config": cfg.model_dump(),
        "start_iso": start_iso,
        "end_iso": end_iso,
        "points_count": len(decision_pts),
        "decision_series": decision_pts,
        "latest_series": latest_pts,
        "decision_metrics": dec_metrics,
        "latest_metrics": lat_metrics,
    }

@app.get("/api/forecasts/versions", response_model=List[ForecastVersionItem])
def get_delivery_versions(
    start_time: str = Query(..., description="Target delivery interval in ISO UTC, e.g. 2026-01-15T12:00:00Z"),
    cutoff_type: str = Query("day_ahead_fixed_time"),
    day_ahead_time_utc: str = Query(DEFAULT_DAY_AHEAD_CUTOFF_TIME),
    lead_time_hours: Optional[float] = Query(None),
):
    """
    Inspect all historical forecast runs published for a specific delivery interval.
    Shows how forecast estimates evolved from 48h+ out down to gate closure and delivery.
    """
    versions = data_store.get_forecast_versions(start_time)
    if not versions:
        raise HTTPException(status_code=404, detail=f"No forecast versions found for delivery interval {start_time}")

    cfg = _build_cutoff_config(cutoff_type, day_ahead_time_utc, lead_time_hours, "hourly_exact")
    return forecast_service.get_forecast_version_history(start_time, versions, cfg)

@app.get("/api/metrics/summary", response_model=Optional[MetricsSummary])
def get_metrics_summary(
    start_date: str = Query("2026-01-01"),
    end_date: str = Query("2026-01-31"),
    cutoff_type: str = Query("day_ahead_fixed_time"),
    day_ahead_time_utc: str = Query(DEFAULT_DAY_AHEAD_CUTOFF_TIME),
    lead_time_hours: Optional[float] = Query(None),
    alignment_mode: str = Query("hourly_exact"),
):
    start_iso = f"{start_date}T00:00:00Z"
    end_iso = f"{end_date}T23:59:59Z"

    act_df = data_store.get_actuals_df(start_iso, end_iso)
    fc_df = data_store.get_forecasts_df(start_iso, end_iso)
    cfg = _build_cutoff_config(cutoff_type, day_ahead_time_utc, lead_time_hours, alignment_mode)

    decision_pts, _ = forecast_service.align_forecasts_and_actuals(act_df, fc_df, cfg)
    return metrics_service.calculate_summary(decision_pts)

@app.get("/api/metrics/by-settlement-period", response_model=List[PeriodMetric])
def get_metrics_by_period(
    start_date: str = Query("2026-01-01"),
    end_date: str = Query("2026-01-31"),
    cutoff_type: str = Query("day_ahead_fixed_time"),
    day_ahead_time_utc: str = Query(DEFAULT_DAY_AHEAD_CUTOFF_TIME),
    lead_time_hours: Optional[float] = Query(None),
    alignment_mode: str = Query("hourly_exact"),
):
    start_iso = f"{start_date}T00:00:00Z"
    end_iso = f"{end_date}T23:59:59Z"

    act_df = data_store.get_actuals_df(start_iso, end_iso)
    fc_df = data_store.get_forecasts_df(start_iso, end_iso)
    cfg = _build_cutoff_config(cutoff_type, day_ahead_time_utc, lead_time_hours, alignment_mode)

    decision_pts, _ = forecast_service.align_forecasts_and_actuals(act_df, fc_df, cfg)
    return metrics_service.calculate_by_settlement_period(decision_pts)

@app.get("/api/metrics/by-day", response_model=List[DailyMetric])
def get_metrics_by_day(
    start_date: str = Query("2026-01-01"),
    end_date: str = Query("2026-01-31"),
    cutoff_type: str = Query("day_ahead_fixed_time"),
    day_ahead_time_utc: str = Query(DEFAULT_DAY_AHEAD_CUTOFF_TIME),
    lead_time_hours: Optional[float] = Query(None),
    alignment_mode: str = Query("hourly_exact"),
):
    start_iso = f"{start_date}T00:00:00Z"
    end_iso = f"{end_date}T23:59:59Z"

    act_df = data_store.get_actuals_df(start_iso, end_iso)
    fc_df = data_store.get_forecasts_df(start_iso, end_iso)
    cfg = _build_cutoff_config(cutoff_type, day_ahead_time_utc, lead_time_hours, alignment_mode)

    decision_pts, _ = forecast_service.align_forecasts_and_actuals(act_df, fc_df, cfg)
    return metrics_service.calculate_by_day(decision_pts)

@app.get("/api/metrics/by-horizon", response_model=List[HorizonMetric])
def get_metrics_by_horizon(
    start_date: str = Query("2026-01-01"),
    end_date: str = Query("2026-01-31"),
):
    start_iso = f"{start_date}T00:00:00Z"
    end_iso = f"{end_date}T23:59:59Z"

    act_df = data_store.get_actuals_df(start_iso, end_iso)
    fc_df = data_store.get_forecasts_df(start_iso, end_iso)
    return metrics_service.calculate_by_horizon(act_df, fc_df)

@app.get("/api/config/cutoff-presets")
def get_cutoff_presets():
    return [
        {
            "id": "epex_spot_1100",
            "name": "EPEX SPOT UK Day-Ahead (D-1 11:00 UTC)",
            "description": "Standard UK wholesale power auction gate closure. Forecast published by 11:00 UTC on the day before delivery.",
            "cutoff_type": "day_ahead_fixed_time",
            "day_ahead_time_utc": "11:00",
        },
        {
            "id": "early_morning_0930",
            "name": "Early Morning Strategy Run (D-1 09:30 UTC)",
            "description": "Pre-trading risk review before market opening.",
            "cutoff_type": "day_ahead_fixed_time",
            "day_ahead_time_utc": "09:30",
        },
        {
            "id": "nordpool_1200",
            "name": "Nord Pool UK Day-Ahead (D-1 12:00 UTC)",
            "description": "Nord Pool European day-ahead auction deadline.",
            "cutoff_type": "day_ahead_fixed_time",
            "day_ahead_time_utc": "12:00",
        },
        {
            "id": "lead_time_24h",
            "name": "Rolling 24-Hour Lead Time",
            "description": "Forecast issued exactly 24 hours prior to each delivery interval.",
            "cutoff_type": "lead_time_hours",
            "lead_time_hours": 24.0,
        },
        {
            "id": "lead_time_12h",
            "name": "Intraday Rolling 12-Hour Lead Time",
            "description": "Intraday hedging window 12 hours prior to delivery.",
            "cutoff_type": "lead_time_hours",
            "lead_time_hours": 12.0,
        },
    ]
