import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DB_PATH = DATA_DIR / "windfor.db"

# Elexon BMRS API endpoints
ELEXON_BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
FUELHH_STREAM_URL = f"{ELEXON_BASE_URL}/datasets/FUELHH/stream"
WINDFOR_STREAM_URL = f"{ELEXON_BASE_URL}/datasets/WINDFOR/stream"

# Target delivery period: January 2026
JAN_2026_START = "2026-01-01T00:00:00Z"
JAN_2026_END = "2026-02-01T00:00:00Z"

# Forecast query window: include December 31, 2025 so Day-Ahead decisions for Jan 1 are captured
FORECAST_FETCH_START = "2025-12-30T00:00:00Z"
FORECAST_FETCH_END = "2026-02-01T00:00:00Z"

# Total expected half-hourly settlement intervals in January (31 days * 48 periods)
EXPECTED_JAN_INTERVALS = 31 * 48  # 1488

# Default Day-Ahead decision cutoff time on day D-1 (e.g. 11:00 UTC, typical EPEX SPOT Day-Ahead auction deadline)
DEFAULT_DAY_AHEAD_CUTOFF_TIME = "11:00"
