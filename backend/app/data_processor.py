import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

from app.config import (
    JAN_2026_START,
    JAN_2026_END,
    EXPECTED_JAN_INTERVALS,
)
from app.schemas import ValidationSummary

logger = logging.getLogger(__name__)

def parse_iso_utc(ts_str: str) -> Optional[str]:
    """Parse any ISO string and standardize to UTC YYYY-MM-DDTHH:MM:SSZ format."""
    if not ts_str:
        return None
    # Fast path for standard Elexon UTC strings (e.g. '2026-01-01T00:00:00Z')
    if len(ts_str) == 20 and ts_str.endswith("Z") and ts_str[10] == "T":
        return ts_str
    try:
        dt = pd.to_datetime(ts_str, utc=True)
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception as e:
        logger.warning(f"Failed to parse timestamp '{ts_str}': {e}")
        return None

def clean_actuals(raw_records: List[Dict]) -> Tuple[List[Dict], Dict[str, int]]:
    """
    Standardize and clean raw FUELHH actual records:
    - Filter fuelType == 'WIND'
    - Standardize timestamps to UTC
    - Convert generation to float
    - Remove invalid/null generation records
    - Deduplicate on start_time
    """
    stats = {"total_raw": len(raw_records), "wind_filtered": 0, "invalid": 0, "duplicates_removed": 0, "cleaned": 0}
    seen_starts = {}

    for r in raw_records:
        fuel = r.get("fuelType")
        if fuel != "WIND":
            continue
        stats["wind_filtered"] += 1

        start_time = parse_iso_utc(r.get("startTime"))
        publish_time = parse_iso_utc(r.get("publishTime"))
        if not start_time:
            stats["invalid"] += 1
            continue

        gen_val = r.get("generation")
        try:
            gen_float = float(gen_val) if gen_val is not None else None
            if gen_float is None or np.isnan(gen_float) or gen_float < 0:
                stats["invalid"] += 1
                continue
        except (ValueError, TypeError):
            stats["invalid"] += 1
            continue

        item = {
            "start_time": start_time,
            "publish_time": publish_time,
            "settlement_date": r.get("settlementDate"),
            "settlement_period": int(r.get("settlementPeriod")) if r.get("settlementPeriod") is not None else None,
            "fuel_type": "WIND",
            "actual_generation": gen_float,
        }

        # If duplicate start_time exists, keep the record with newer publish_time
        if start_time in seen_starts:
            existing = seen_starts[start_time]
            if (publish_time or "") >= (existing.get("publish_time") or ""):
                seen_starts[start_time] = item
            stats["duplicates_removed"] += 1
        else:
            seen_starts[start_time] = item

    cleaned_list = sorted(seen_starts.values(), key=lambda x: x["start_time"])
    stats["cleaned"] = len(cleaned_list)
    logger.info(f"Actuals cleaning stats: {stats}")
    return cleaned_list, stats

def clean_forecasts(raw_records: List[Dict]) -> Tuple[List[Dict], Dict[str, int]]:
    """
    Standardize and clean raw WINDFOR forecast records:
    - Standardize publishTime and startTime to UTC
    - Convert generation to float
    - Remove invalid/null generation records
    - Deduplicate on (publish_time, start_time)
    - Preserve all historical forecast publication runs
    """
    stats = {"total_raw": len(raw_records), "invalid": 0, "duplicates_removed": 0, "cleaned": 0}
    seen_pairs = {}

    for r in raw_records:
        publish_time = parse_iso_utc(r.get("publishTime"))
        start_time = parse_iso_utc(r.get("startTime"))
        if not publish_time or not start_time:
            stats["invalid"] += 1
            continue

        gen_val = r.get("generation")
        try:
            gen_float = float(gen_val) if gen_val is not None else None
            if gen_float is None or np.isnan(gen_float) or gen_float < 0:
                stats["invalid"] += 1
                continue
        except (ValueError, TypeError):
            stats["invalid"] += 1
            continue

        key = (publish_time, start_time)
        if key in seen_pairs:
            stats["duplicates_removed"] += 1
        else:
            seen_pairs[key] = {
                "publish_time": publish_time,
                "start_time": start_time,
                "forecast_generation": gen_float,
            }

    cleaned_list = sorted(seen_pairs.values(), key=lambda x: (x["start_time"], x["publish_time"]))
    stats["cleaned"] = len(cleaned_list)
    logger.info(f"Forecasts cleaning stats: {stats}")
    return cleaned_list, stats

def validate_january_coverage(
    actuals_df: pd.DataFrame,
    start_iso: str = JAN_2026_START,
    end_iso: str = JAN_2026_END,
    forecasts_count: int = 0,
    unique_pubs: int = 0,
) -> ValidationSummary:
    """
    Validate actual coverage against the full January 2026 timeline (1,488 half-hour intervals).
    Identifies missing intervals, coverage percentage, and dataset sizes.
    """
    expected_range = pd.date_range(
        start=start_iso,
        end=end_iso,
        freq="30min",
        inclusive="left"
    )
    expected_iso_list = [dt.strftime("%Y-%m-%dT%H:%M:%SZ") for dt in expected_range]
    expected_count = len(expected_iso_list)

    if not actuals_df.empty and "start_time" in actuals_df.columns:
        present_starts = set(actuals_df["start_time"].tolist())
    else:
        present_starts = set()

    missing = [t for t in expected_iso_list if t not in present_starts]
    found_count = len(expected_iso_list) - len(missing)
    coverage_pct = round((found_count / expected_count) * 100.0, 2) if expected_count > 0 else 0.0

    return ValidationSummary(
        expected_intervals=expected_count,
        actual_intervals_found=found_count,
        missing_intervals_count=len(missing),
        missing_intervals=missing[:20],  # sample first 20 if any
        coverage_pct=coverage_pct,
        actual_records_count=len(actuals_df),
        forecast_records_count=forecasts_count,
        unique_forecast_publications=unique_pubs,
    )
