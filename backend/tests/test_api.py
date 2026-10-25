import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "database_counts" in data

def test_cutoff_presets():
    response = client.get("/api/config/cutoff-presets")
    assert response.status_code == 200
    presets = response.json()
    assert len(presets) >= 4
    preset_ids = [p["id"] for p in presets]
    assert "epex_spot_1100" in preset_ids
    assert "lead_time_24h" in preset_ids

def test_validation_endpoint():
    response = client.get("/api/validation")
    assert response.status_code == 200
    data = response.json()
    assert "expected_intervals" in data
    assert data["expected_intervals"] == 1488
    assert "actual_intervals_found" in data
    assert "coverage_pct" in data
