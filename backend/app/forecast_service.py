import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import pandas as pd
import numpy as np

from app.schemas import (
    AlignedDataPoint,
    ForecastVersionItem,
    CutoffConfig,
)

logger = logging.getLogger(__name__)

class ForecastService:
    def __init__(self):
        pass

    @staticmethod
    def calculate_cutoff_timestamp(
        delivery_dt: datetime,
        config: CutoffConfig,
    ) -> datetime:
        """
        Determine the cutoff timestamp before which a forecast must have been published.
        Modes:
        - 'day_ahead_fixed_time': Date(D-1) at configured UTC time (e.g. 11:00 UTC)
        - 'lead_time_hours': delivery_dt minus specified number of hours
        """
        if config.cutoff_type == "lead_time_hours" and config.lead_time_hours is not None:
            return delivery_dt - timedelta(hours=config.lead_time_hours)
        
        # Default: Day-Ahead fixed time on D-1
        delivery_date = delivery_dt.date()
        d_minus_1 = delivery_date - timedelta(days=1)
        
        hh, mm = 11, 0
        if config.day_ahead_time_utc and ":" in config.day_ahead_time_utc:
            parts = config.day_ahead_time_utc.split(":")
            try:
                hh, mm = int(parts[0]), int(parts[1])
            except ValueError:
                hh, mm = 11, 0

        cutoff = datetime(d_minus_1.year, d_minus_1.month, d_minus_1.day, hh, mm, 0, tzinfo=delivery_dt.tzinfo)
        return cutoff

    def align_forecasts_and_actuals(
        self,
        actuals_df: pd.DataFrame,
        forecasts_df: pd.DataFrame,
        config: CutoffConfig,
    ) -> Tuple[List[AlignedDataPoint], List[AlignedDataPoint]]:
        """
        Core forecast selection and matching logic:
        1. Identifies eligible forecasts published by the decision cutoff.
        2. Selects the latest eligible forecast (Decision Forecast).
        3. Separately selects the latest historical forecast prior to delivery (Latest Benchmark).
        4. Matches each against actual wind generation.
        5. Computes errors (MW, absolute MW, percentage error).
        """
        if actuals_df.empty or forecasts_df.empty:
            return [], []

        act = actuals_df.copy()
        fc = forecasts_df.copy()

        act["dt_start"] = pd.to_datetime(act["start_time"], utc=True)
        fc["dt_start"] = pd.to_datetime(fc["start_time"], utc=True)
        fc["dt_pub"] = pd.to_datetime(fc["publish_time"], utc=True)

        # Handle alignment mode:
        # If 'hourly_exact', filter actuals to :00 minute intervals (744 periods)
        # If 'half_hourly_mapped', expand hourly forecasts to cover :30 intervals as well
        if config.alignment_mode == "half_hourly_mapped":
            # Duplicate forecast rows for minute 30
            fc_30 = fc.copy()
            fc_30["dt_start"] = fc_30["dt_start"] + pd.Timedelta(minutes=30)
            fc_30["start_time"] = fc_30["dt_start"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            fc = pd.concat([fc, fc_30], ignore_index=True)
        else:
            # Hourly exact: filter actuals to minute == 0
            act = act[act["dt_start"].dt.minute == 0].copy()

        # Group forecasts by start_time to perform selection
        decision_points: List[AlignedDataPoint] = []
        latest_points: List[AlignedDataPoint] = []

        # Map actuals by start_time for O(1) lookup
        actuals_by_start = {}
        for _, row in act.iterrows():
            actuals_by_start[row["start_time"]] = row

        fc_grouped = fc.groupby("start_time")

        for start_time, group in fc_grouped:
            if start_time not in actuals_by_start:
                continue

            act_row = actuals_by_start[start_time]
            delivery_dt = pd.to_datetime(start_time, utc=True)
            cutoff_dt = self.calculate_cutoff_timestamp(delivery_dt, config)

            # 1. Decision Forecast Selection: publish_time <= cutoff
            eligible_decision = group[group["dt_pub"] <= cutoff_dt]
            selected_decision_row = None
            if not eligible_decision.empty:
                # Latest published before or at cutoff
                selected_decision_row = eligible_decision.sort_values("dt_pub", ascending=False).iloc[0]

            # 2. Latest Historical Forecast Selection: publish_time <= delivery_dt
            eligible_latest = group[group["dt_pub"] <= delivery_dt]
            selected_latest_row = None
            if not eligible_latest.empty:
                selected_latest_row = eligible_latest.sort_values("dt_pub", ascending=False).iloc[0]

            # Build Decision Point
            actual_gen = float(act_row["actual_generation"]) if pd.notnull(act_row["actual_generation"]) else None
            
            if selected_decision_row is not None and actual_gen is not None:
                fc_gen = float(selected_decision_row["forecast_generation"])
                err = round(fc_gen - actual_gen, 2)
                abs_err = round(abs(err), 2)
                pct_err = round((abs_err / actual_gen * 100.0), 2) if actual_gen > 10.0 else None
                pub_str = selected_decision_row["publish_time"]
                pub_dt = selected_decision_row["dt_pub"]
                horizon = round((delivery_dt - pub_dt).total_seconds() / 3600.0, 2)

                decision_points.append(AlignedDataPoint(
                    start_time=start_time,
                    settlement_date=act_row.get("settlement_date"),
                    settlement_period=int(act_row["settlement_period"]) if pd.notnull(act_row.get("settlement_period")) else None,
                    actual_generation=round(actual_gen, 2),
                    forecast_generation=round(fc_gen, 2),
                    forecast_publish_time=pub_str,
                    error=err,
                    abs_error=abs_err,
                    pct_error=pct_err,
                    horizon_hours=horizon,
                ))

            # Build Latest Point
            if selected_latest_row is not None and actual_gen is not None:
                fc_gen_lt = float(selected_latest_row["forecast_generation"])
                err_lt = round(fc_gen_lt - actual_gen, 2)
                abs_err_lt = round(abs(err_lt), 2)
                pct_err_lt = round((abs_err_lt / actual_gen * 100.0), 2) if actual_gen > 10.0 else None
                pub_str_lt = selected_latest_row["publish_time"]
                pub_dt_lt = selected_latest_row["dt_pub"]
                horizon_lt = round((delivery_dt - pub_dt_lt).total_seconds() / 3600.0, 2)

                latest_points.append(AlignedDataPoint(
                    start_time=start_time,
                    settlement_date=act_row.get("settlement_date"),
                    settlement_period=int(act_row["settlement_period"]) if pd.notnull(act_row.get("settlement_period")) else None,
                    actual_generation=round(actual_gen, 2),
                    forecast_generation=round(fc_gen_lt, 2),
                    forecast_publish_time=pub_str_lt,
                    error=err_lt,
                    abs_error=abs_err_lt,
                    pct_error=pct_err_lt,
                    horizon_hours=horizon_lt,
                ))

        decision_points.sort(key=lambda x: x.start_time)
        latest_points.sort(key=lambda x: x.start_time)

        return decision_points, latest_points

    def get_forecast_version_history(
        self,
        start_time: str,
        versions_raw: List[Dict],
        config: CutoffConfig,
    ) -> List[ForecastVersionItem]:
        """
        Inspect all historical forecast runs published for a specific delivery interval.
        Highlights:
        - Lead time horizon (hours)
        - Whether eligible at decision cutoff
        - Whether selected as the Day-Ahead decision forecast
        - Whether it was the final latest forecast before delivery
        """
        if not versions_raw:
            return []

        delivery_dt = pd.to_datetime(start_time, utc=True)
        cutoff_dt = self.calculate_cutoff_timestamp(delivery_dt, config)

        df = pd.DataFrame(versions_raw)
        df["dt_pub"] = pd.to_datetime(df["publish_time"], utc=True)
        df = df.sort_values("dt_pub")

        eligible_decision = df[df["dt_pub"] <= cutoff_dt]
        selected_decision_pub = eligible_decision["publish_time"].iloc[-1] if not eligible_decision.empty else None

        eligible_latest = df[df["dt_pub"] <= delivery_dt]
        latest_pub = eligible_latest["publish_time"].iloc[-1] if not eligible_latest.empty else None

        items: List[ForecastVersionItem] = []
        for _, row in df.iterrows():
            pub_dt = row["dt_pub"]
            pub_str = row["publish_time"]
            horizon = round((delivery_dt - pub_dt).total_seconds() / 3600.0, 2)
            is_eligible = (pub_dt <= cutoff_dt)
            is_selected = (pub_str == selected_decision_pub)
            is_latest = (pub_str == latest_pub)

            items.append(ForecastVersionItem(
                publish_time=pub_str,
                start_time=start_time,
                forecast_generation=float(row["forecast_generation"]),
                horizon_hours=horizon,
                is_decision_eligible=is_eligible,
                is_selected_at_cutoff=is_selected,
                is_latest=is_latest,
            ))

        return items
