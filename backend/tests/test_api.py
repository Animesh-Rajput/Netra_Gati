"""
UrbanTrace Backend Test Suite
Verifies APIs, Database operations, Trajectory Reconstruction, Analytics, and OCR.
"""
import pytest
from fastapi.testclient import TestClient
import numpy as np
import cv2

from app.main import app
from app.database import init_db
from app.data.seed_data import seed_database
from app.ocr_engine import ocr_engine, image_to_base64

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensures database is initialized and seeded before running tests."""
    init_db()
    seed_database(reset=True)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_get_cameras():
    response = client.get("/api/cameras")
    assert response.status_code == 200
    cameras = response.json()
    assert len(cameras) >= 15
    assert "camera_id" in cameras[0]
    assert "lat" in cameras[0]
    assert "lng" in cameras[0]
    assert "reads_last_hour" in cameras[0]

def test_trajectory_exact_match():
    response = client.get("/api/trajectory/MP04CA1234")
    assert response.status_code == 200
    data = response.json()
    assert data["matched_plate"] == "MP04CA1234"
    assert data["total_sightings"] > 0
    assert len(data["points"]) > 0
    assert "camera_name" in data["points"][0]

def test_trajectory_fuzzy_match():
    # Search with slight typo (e.g. lowercase or letter variation)
    response = client.get("/api/trajectory/MP04CA1234?allow_fuzzy=true")
    assert response.status_code == 200
    data = response.json()
    assert data["matched_plate"] == "MP04CA1234"

def test_analytics_summary():
    response = client.get("/api/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_reads" in data
    assert "distinct_vehicles" in data
    assert "avg_city_speed_kmh" in data
    assert "cameras_online" in data

def test_analytics_density():
    response = client.get("/api/analytics/density")
    assert response.status_code == 200
    data = response.json()
    assert "by_zone" in data
    assert "camera_hotspots" in data

def test_analytics_heatmap():
    response = client.get("/api/analytics/heatmap")
    assert response.status_code == 200
    data = response.json()
    assert "points" in data
    assert len(data["points"]) >= 15

def test_analytics_od_matrix():
    response = client.get("/api/analytics/od-matrix")
    assert response.status_code == 200
    data = response.json()
    assert "top_od_routes" in data

def test_blacklist_crud():
    # 1. Add to blacklist
    payload = {
        "plate_no": "TEST9999",
        "reason": "Suspicious Vehicle for Unit Testing",
        "vehicle_type": "SUV",
        "severity": "HIGH"
    }
    create_res = client.post("/api/blacklist", json=payload)
    assert create_res.status_code == 200
    assert create_res.json()["plate_no"] == "TEST9999"
    
    # 2. Get blacklist
    get_res = client.get("/api/blacklist")
    assert get_res.status_code == 200
    plates = [b["plate_no"] for b in get_res.json()]
    assert "TEST9999" in plates
    
    # 3. Delete from blacklist
    del_res = client.delete("/api/blacklist/TEST9999")
    assert del_res.status_code == 200

def test_ocr_detection():
    # Create test image with plate
    test_img = np.ones((300, 500, 3), dtype=np.uint8) * 100
    cv2.rectangle(test_img, (150, 200), (350, 260), (255, 255, 255), -1)
    cv2.putText(test_img, "MP04CA1234", (160, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    
    b64 = image_to_base64(test_img)
    response = client.post("/api/ocr/detect", json={"image_base64": b64})
    assert response.status_code == 200
    data = response.json()
    assert "plate_no" in data
    assert "confidence" in data
    assert "annotated_image_base64" in data
    assert "pipeline_stages" in data
    assert "grayscale" in data["pipeline_stages"]
    assert "clahe" in data["pipeline_stages"]
