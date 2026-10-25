import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import httpx
from app.config import (
    FUELHH_STREAM_URL,
    WINDFOR_STREAM_URL,
    JAN_2026_START,
    JAN_2026_END,
    FORECAST_FETCH_START,
    FORECAST_FETCH_END,
)

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "WindFor-UK-Utility-Trader/1.0 (Day-Ahead Market Procurement)",
    "Accept": "application/json",
}

class ElexonClient:
    def __init__(self, timeout_sec: float = 25.0):
        self.timeout = timeout_sec

    def _fetch_stream_chunk(self, client: httpx.Client, base_url: str, dt_from: str, dt_to: str) -> List[Dict]:
        url = f"{base_url}?publishDateTimeFrom={dt_from}&publishDateTimeTo={dt_to}"
        logger.info(f"Fetching chunk: {url}")
        retries = 3
        for attempt in range(retries):
            try:
                response = client.get(url, headers=HEADERS, timeout=self.timeout)
                response.raise_for_status()
                data = response.json()
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict) and "data" in data:
                    return data["data"]
                return []
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1}/{retries} failed for {url}: {e}")
                if attempt == retries - 1:
                    logger.error(f"Failed to fetch {url} after {retries} attempts")
                    raise

    def fetch_actuals_fuelhh(
        self,
        start_iso: str = JAN_2026_START,
        end_iso: str = JAN_2026_END,
        chunk_days: int = 5,
    ) -> List[Dict]:
        """
        Fetch FUELHH actual generation dataset and filter for fuelType == 'WIND'.
        Chunks requests across chunk_days intervals to ensure reliability.
        """
        dt_start = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
        # Add 2 hours buffer to end date to catch outturn publications for the final settlement period
        dt_end = datetime.fromisoformat(end_iso.replace("Z", "+00:00")) + timedelta(hours=2)

        wind_records: List[Dict] = []
        with httpx.Client() as client:
            curr = dt_start
            while curr < dt_end:
                next_chunk = min(curr + timedelta(days=chunk_days), dt_end)
                from_str = curr.strftime("%Y-%m-%dT%H:%M:%SZ")
                to_str = next_chunk.strftime("%Y-%m-%dT%H:%M:%SZ")
                chunk_data = self._fetch_stream_chunk(client, FUELHH_STREAM_URL, from_str, to_str)
                for item in chunk_data:
                    if item.get("fuelType") == "WIND":
                        wind_records.append(item)
                curr = next_chunk

        logger.info(f"Total FUELHH WIND records retrieved: {len(wind_records)}")
        return wind_records

    def fetch_forecasts_windfor(
        self,
        start_iso: str = FORECAST_FETCH_START,
        end_iso: str = FORECAST_FETCH_END,
        chunk_days: int = 5,
    ) -> List[Dict]:
        """
        Fetch WINDFOR forecast dataset across the specified publication date range.
        Includes publication runs from December 31, 2025 so day-ahead decisions for Jan 1 are captured.
        """
        dt_start = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
        dt_end = datetime.fromisoformat(end_iso.replace("Z", "+00:00"))

        all_records: List[Dict] = []
        with httpx.Client() as client:
            curr = dt_start
            while curr < dt_end:
                next_chunk = min(curr + timedelta(days=chunk_days), dt_end)
                from_str = curr.strftime("%Y-%m-%dT%H:%M:%SZ")
                to_str = next_chunk.strftime("%Y-%m-%dT%H:%M:%SZ")
                chunk_data = self._fetch_stream_chunk(client, WINDFOR_STREAM_URL, from_str, to_str)
                all_records.extend(chunk_data)
                curr = next_chunk

        logger.info(f"Total WINDFOR records retrieved: {len(all_records)}")
        return all_records
