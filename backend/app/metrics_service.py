from typing import Dict, List, Optional
import numpy as np
import pandas as pd
from app.schemas import (
    AlignedDataPoint,
    MetricsSummary,
    PeriodMetric,
    DailyMetric,
    HorizonMetric,
)

class MetricsService:
    @staticmethod
    def calculate_summary(points: List[AlignedDataPoint]) -> Optional[MetricsSummary]:
        if not points:
            return None

        errors = np.array([p.error for p in points if p.error is not None], dtype=float)
        abs_errors = np.array([p.abs_error for p in points if p.abs_error is not None], dtype=float)
        actuals = np.array([p.actual_generation for p in points if p.actual_generation is not None], dtype=float)
        forecasts = np.array([p.forecast_generation for p in points if p.forecast_generation is not None], dtype=float)

        n = len(errors)
        if n == 0:
            return None

        mae = float(np.mean(abs_errors))
        rmse = float(np.sqrt(np.mean(errors ** 2)))
        bias = float(np.mean(errors))

        # MAPE calculation (exclude actuals <= 10 MW to avoid division by zero/near-zero)
        valid_pct = [p.pct_error for p in points if p.pct_error is not None]
        mape = float(np.mean(valid_pct)) if valid_pct else None

        p10 = float(np.percentile(errors, 10))
        p50 = float(np.percentile(errors, 50))
        p90 = float(np.percentile(errors, 90))
        max_over = float(np.max(errors))
        max_under = float(np.min(errors))

        # Pearson correlation
        corr = None
        if len(actuals) > 1 and np.std(actuals) > 0 and np.std(forecasts) > 0:
            corr = float(np.corrcoef(actuals, forecasts)[0, 1])

        return MetricsSummary(
            sample_size=n,
            mae=round(mae, 2),
            rmse=round(rmse, 2),
            mean_error=round(bias, 2),
            mape=round(mape, 2) if mape is not None else None,
            p10_error=round(p10, 2),
            p50_error=round(p50, 2),
            p90_error=round(p90, 2),
            max_overforecast=round(max_over, 2),
            max_underforecast=round(max_under, 2),
            correlation=round(corr, 4) if corr is not None else None,
        )

    @staticmethod
    def calculate_by_settlement_period(points: List[AlignedDataPoint]) -> List[PeriodMetric]:
        if not points:
            return []

        df = pd.DataFrame([p.model_dump() for p in points])
        if "settlement_period" not in df.columns or df["settlement_period"].dropna().empty:
            return []

        grouped = df.groupby("settlement_period")
        metrics: List[PeriodMetric] = []

        for period, group in grouped:
            errs = group["error"].dropna().values
            abs_errs = group["abs_error"].dropna().values
            acts = group["actual_generation"].dropna().values
            fcs = group["forecast_generation"].dropna().values

            if len(errs) == 0:
                continue

            mae = float(np.mean(abs_errs))
            rmse = float(np.sqrt(np.mean(errs ** 2)))
            bias = float(np.mean(errs))

            metrics.append(PeriodMetric(
                settlement_period=int(period),
                sample_size=len(errs),
                mae=round(mae, 2),
                rmse=round(rmse, 2),
                bias=round(bias, 2),
                avg_actual=round(float(np.mean(acts)), 2),
                avg_forecast=round(float(np.mean(fcs)), 2),
            ))

        metrics.sort(key=lambda x: x.settlement_period)
        return metrics

    @staticmethod
    def calculate_by_day(points: List[AlignedDataPoint]) -> List[DailyMetric]:
        if not points:
            return []

        df = pd.DataFrame([p.model_dump() for p in points])
        df["date"] = df["settlement_date"].fillna(df["start_time"].str.slice(0, 10))

        grouped = df.groupby("date")
        metrics: List[DailyMetric] = []

        for d_str, group in grouped:
            errs = group["error"].dropna().values
            abs_errs = group["abs_error"].dropna().values
            acts = group["actual_generation"].dropna().values
            fcs = group["forecast_generation"].dropna().values

            if len(errs) == 0:
                continue

            mae = float(np.mean(abs_errs))
            rmse = float(np.sqrt(np.mean(errs ** 2)))
            bias = float(np.mean(errs))

            metrics.append(DailyMetric(
                date=str(d_str),
                sample_size=len(errs),
                mae=round(mae, 2),
                rmse=round(rmse, 2),
                bias=round(bias, 2),
                avg_actual=round(float(np.mean(acts)), 2),
                avg_forecast=round(float(np.mean(fcs)), 2),
            ))

        metrics.sort(key=lambda x: x.date)
        return metrics

    @staticmethod
    def calculate_by_horizon(
        actuals_df: pd.DataFrame,
        forecasts_df: pd.DataFrame,
    ) -> List[HorizonMetric]:
        """
        Evaluate forecast degradation across lead-time horizon buckets:
        0-6h, 6-12h, 12-24h, 24-36h, 36-48h, 48-72h.
        """
        if actuals_df.empty or forecasts_df.empty:
            return []

        act = actuals_df[["start_time", "actual_generation"]].copy()
        fc = forecasts_df[["publish_time", "start_time", "forecast_generation"]].copy()

        merged = pd.merge(fc, act, on="start_time", how="inner")
        if merged.empty:
            return []

        dt_pub = pd.to_datetime(merged["publish_time"], utc=True)
        dt_start = pd.to_datetime(merged["start_time"], utc=True)
        merged["horizon_hours"] = (dt_start - dt_pub).dt.total_seconds() / 3600.0

        # Discard forecasts published after start_time
        merged = merged[merged["horizon_hours"] >= 0].copy()
        merged["error"] = merged["forecast_generation"] - merged["actual_generation"]
        merged["abs_error"] = merged["error"].abs()

        buckets = [
            (0, 6),
            (6, 12),
            (12, 24),
            (24, 36),
            (36, 48),
            (48, 72),
        ]

        metrics: List[HorizonMetric] = []
        for h_min, h_max in buckets:
            sub = merged[(merged["horizon_hours"] >= h_min) & (merged["horizon_hours"] < h_max)]
            if sub.empty:
                continue

            errs = sub["error"].values
            abs_errs = sub["abs_error"].values

            mae = float(np.mean(abs_errs))
            rmse = float(np.sqrt(np.mean(errs ** 2)))
            bias = float(np.mean(errs))

            metrics.append(HorizonMetric(
                horizon_hours_min=float(h_min),
                horizon_hours_max=float(h_max),
                sample_size=len(errs),
                mae=round(mae, 2),
                rmse=round(rmse, 2),
                bias=round(bias, 2),
            ))

        return metrics
