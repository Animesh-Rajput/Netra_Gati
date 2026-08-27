"""
Direct Test Runner for UrbanTrace Backend (Raipur Smart City)
Uses FastAPI TestClient to test all endpoints, CV pipeline, and real Indian dataset.
"""
import sys
import os
from pathlib import Path

# Fix Windows console UTF-8 output
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
import numpy as np
import cv2

from app.main import app
from app.database import init_db
from app.data.seed_data import seed_database
from app.data.download_dataset import download_or_generate_dataset
from app.ocr_engine import image_to_base64

def run_all_tests():
    print("=================================================================")
    print("Running UrbanTrace Backend Test Suite (Raipur)")
    print("=================================================================")
    
    init_db()
    download_or_generate_dataset()
    seed_database(reset=True)
    
    client = TestClient(app)
    
    # 1. Health
    print("Testing /api/health ...", end=" ")
    res = client.get("/api/health")
    assert res.status_code == 200 and res.json()["status"] == "healthy"
    print("PASSED [OK]")
    
    # 2. Cameras (Raipur Grid)
    print("Testing /api/cameras ...", end=" ")
    res = client.get("/api/cameras")
    assert res.status_code == 200
    cams = res.json()
    assert len(cams) >= 15
    assert any("Tatibandh" in c["name"] for c in cams)
    print(f"PASSED [OK] ({len(cams)} Raipur camera nodes)")
    
    # 3. Trajectory
    print("Testing /api/trajectory/CG04MB1001 ...", end=" ")
    res = client.get("/api/trajectory/CG04MB1001")
    assert res.status_code == 200
    traj = res.json()
    assert traj["matched_plate"] == "CG04MB1001"
    assert len(traj["points"]) > 0
    print(f"PASSED [OK] ({traj['total_sightings']} sightings, {traj['total_distance_km']} km)")
    
    # 4. Trajectory Autocomplete
    print("Testing /api/trajectory/autocomplete ...", end=" ")
    res = client.get("/api/trajectory/autocomplete?query=CG04")
    assert res.status_code == 200
    assert len(res.json()) > 0
    print("PASSED [OK]")
    
    # 5. Analytics Summary
    print("Testing /api/analytics/summary ...", end=" ")
    res = client.get("/api/analytics/summary")
    assert res.status_code == 200
    summary = res.json()
    assert summary["total_reads"] > 0
    print(f"PASSED [OK] (Total reads: {summary['total_reads']}, Avg speed: {summary['avg_city_speed_kmh']} km/h)")
    
    # 6. Analytics Density
    print("Testing /api/analytics/density ...", end=" ")
    res = client.get("/api/analytics/density")
    assert res.status_code == 200
    density = res.json()
    assert len(density["by_zone"]) > 0
    print(f"PASSED [OK] ({len(density['by_zone'])} zones)")
    
    # 7. Analytics Heatmap
    print("Testing /api/analytics/heatmap ...", end=" ")
    res = client.get("/api/analytics/heatmap")
    assert res.status_code == 200
    assert len(res.json()["points"]) >= 15
    print(f"PASSED [OK] ({len(res.json()['points'])} heatmap points)")
    
    # 8. Analytics O-D Matrix
    print("Testing /api/analytics/od-matrix ...", end=" ")
    res = client.get("/api/analytics/od-matrix")
    assert res.status_code == 200
    od = res.json()
    assert len(od["top_od_routes"]) > 0
    print(f"PASSED [OK] ({len(od['top_od_routes'])} top OD routes)")
    
    # 9. Blacklist CRUD
    print("Testing /api/blacklist CRUD ...", end=" ")
    payload = {
        "plate_no": "TEST9999",
        "reason": "Test Vehicle For Automated Check",
        "vehicle_type": "SUV",
        "severity": "CRITICAL"
    }
    res_add = client.post("/api/blacklist", json=payload)
    assert res_add.status_code == 200
    
    res_list = client.get("/api/blacklist")
    assert any(b["plate_no"] == "TEST9999" for b in res_list.json())
    
    res_del = client.delete("/api/blacklist/TEST9999")
    assert res_del.status_code == 200
    print("PASSED [OK]")
    
    # 10. OCR Detection
    print("Testing /api/ocr/detect-base64 with synthetic vehicle image ...", end=" ")
    test_img = np.ones((300, 500, 3), dtype=np.uint8) * 90
    cv2.rectangle(test_img, (140, 180), (360, 250), (255, 255, 255), -1)
    cv2.putText(test_img, "CG04MB1001", (150, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)
    b64 = image_to_base64(test_img)
    
    res_ocr = client.post("/api/ocr/detect-base64", json={"image_base64": b64, "ground_truth_plate": "CG04MB1001"})
    assert res_ocr.status_code == 200
    ocr_data = res_ocr.json()
    assert "plate_no" in ocr_data
    assert "pipeline_stages" in ocr_data
    assert "character_accuracy" in ocr_data
    print(f"PASSED [OK] (Detected: {ocr_data['plate_no']}, Accuracy: {ocr_data['character_accuracy']*100}%)")
    
    # 11. Real Indian Dataset Benchmark Endpoint
    print("Testing /api/ocr/real-samples ...", end=" ")
    res_samples = client.get("/api/ocr/real-samples")
    assert res_samples.status_code == 200
    samples_list = res_samples.json()
    assert len(samples_list) > 0
    assert "ground_truth_plate" in samples_list[0]
    print(f"PASSED [OK] ({len(samples_list)} real Indian plate benchmark samples)")
    
    print("=================================================================")
    print("ALL BACKEND TESTS PASSED SUCCESSFULLY!")
    print("=================================================================")

if __name__ == "__main__":
    run_all_tests()
