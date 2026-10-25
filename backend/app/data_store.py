import sqlite3
from typing import Dict, List, Optional
import pandas as pd
from app.config import DB_PATH

class DataStore:
    def __init__(self, db_path=DB_PATH):
        self.db_path = str(db_path)
        self.init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS actuals (
                    start_time TEXT PRIMARY KEY,
                    publish_time TEXT,
                    settlement_date TEXT,
                    settlement_period INTEGER,
                    fuel_type TEXT,
                    actual_generation REAL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS forecasts (
                    publish_time TEXT,
                    start_time TEXT,
                    forecast_generation REAL,
                    PRIMARY KEY (publish_time, start_time)
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sync_metadata (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TEXT
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_actuals_date ON actuals(settlement_date)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecasts_start ON forecasts(start_time)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_forecasts_pub ON forecasts(publish_time)")
            conn.commit()

    def save_actuals(self, records: List[Dict]):
        if not records:
            return
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany("""
                INSERT INTO actuals (start_time, publish_time, settlement_date, settlement_period, fuel_type, actual_generation)
                VALUES (:start_time, :publish_time, :settlement_date, :settlement_period, :fuel_type, :actual_generation)
                ON CONFLICT(start_time) DO UPDATE SET
                    publish_time = excluded.publish_time,
                    settlement_date = excluded.settlement_date,
                    settlement_period = excluded.settlement_period,
                    actual_generation = excluded.actual_generation
            """, records)
            conn.commit()

    def save_forecasts(self, records: List[Dict]):
        if not records:
            return
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany("""
                INSERT INTO forecasts (publish_time, start_time, forecast_generation)
                VALUES (:publish_time, :start_time, :forecast_generation)
                ON CONFLICT(publish_time, start_time) DO UPDATE SET
                    forecast_generation = excluded.forecast_generation
            """, records)
            conn.commit()

    def get_actuals_df(self, start_time_min: str = "2026-01-01T00:00:00Z", start_time_max: str = "2026-02-01T00:00:00Z") -> pd.DataFrame:
        with self._get_connection() as conn:
            query = """
                SELECT start_time, publish_time, settlement_date, settlement_period, fuel_type, actual_generation
                FROM actuals
                WHERE start_time >= ? AND start_time < ?
                ORDER BY start_time ASC
            """
            df = pd.read_sql_query(query, conn, params=(start_time_min, start_time_max))
            return df

    def get_forecasts_df(self, start_time_min: str = "2026-01-01T00:00:00Z", start_time_max: str = "2026-02-01T00:00:00Z") -> pd.DataFrame:
        with self._get_connection() as conn:
            query = """
                SELECT publish_time, start_time, forecast_generation
                FROM forecasts
                WHERE start_time >= ? AND start_time < ?
                ORDER BY start_time ASC, publish_time ASC
            """
            df = pd.read_sql_query(query, conn, params=(start_time_min, start_time_max))
            return df

    def get_counts(self) -> Dict[str, int]:
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT COUNT(*) FROM actuals")
            act_count = c.fetchone()[0]
            c.execute("SELECT COUNT(*) FROM forecasts")
            fc_count = c.fetchone()[0]
            c.execute("SELECT COUNT(DISTINCT publish_time) FROM forecasts")
            unique_pubs = c.fetchone()[0]
            return {
                "actuals_count": act_count,
                "forecasts_count": fc_count,
                "unique_publications": unique_pubs,
            }

    def get_forecast_versions(self, start_time: str) -> List[Dict]:
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                SELECT publish_time, start_time, forecast_generation
                FROM forecasts
                WHERE start_time = ?
                ORDER BY publish_time ASC
            """, (start_time,))
            rows = c.fetchall()
            return [dict(r) for r in rows]

    def set_metadata(self, key: str, value: str):
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("""
                INSERT INTO sync_metadata (key, value, updated_at)
                VALUES (?, ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            """, (key, value))
            conn.commit()

    def get_metadata(self, key: str) -> Optional[str]:
        with self._get_connection() as conn:
            c = conn.cursor()
            c.execute("SELECT value FROM sync_metadata WHERE key = ?", (key,))
            row = c.fetchone()
            return row[0] if row else None
