import sys
import logging
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.main import run_sync_task, data_store
from app.data_processor import validate_january_coverage
from app.config import JAN_2026_START, JAN_2026_END

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

if __name__ == "__main__":
    print("=== Fetching and Processing January 2026 Elexon Data ===")
    run_sync_task()
    counts = data_store.get_counts()
    print("Database counts:", counts)
    
    act_df = data_store.get_actuals_df(JAN_2026_START, JAN_2026_END)
    summary = validate_january_coverage(
        actuals_df=act_df,
        start_iso=JAN_2026_START,
        end_iso=JAN_2026_END,
        forecasts_count=counts["forecasts_count"],
        unique_pubs=counts["unique_publications"],
    )
    print("\n=== Validation Results for January 2026 ===")
    print(f"Expected intervals (31 days * 48 half-hours): {summary.expected_intervals}")
    print(f"Actual intervals found: {summary.actual_intervals_found}")
    print(f"Coverage percentage: {summary.coverage_pct}%")
    print(f"Missing intervals count: {summary.missing_intervals_count}")
    if summary.missing_intervals:
        print("Missing intervals sample:", summary.missing_intervals[:5])
    print(f"Total cleaned Actual records: {summary.actual_records_count}")
    print(f"Total cleaned Forecast records: {summary.forecast_records_count}")
    print(f"Unique forecast publication runs: {summary.unique_forecast_publications}")
