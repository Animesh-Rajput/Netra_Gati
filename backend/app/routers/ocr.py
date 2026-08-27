"""
UrbanTrace ANPR / OCR Detection Router
Endpoints for image upload, plate localization, OCR extraction, real Indian dataset benchmark samples,
and interactive pipeline demonstration.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import cv2
import numpy as np
import json
from pathlib import Path

from app.ocr_engine import ocr_engine, base64_to_image, image_to_base64
from app.models import OcrDetectionResponse, BlacklistResponse
from app.database import get_db
from app.config import SAMPLE_IMAGES_DIR, SAMPLE_DATA_DIR, VEHICLE_FRAMES_DIR, PLATES_DIR
from app.data.sample_generator import SAMPLE_VEHICLES, generate_sample_vehicle_image
from app.data.download_dataset import download_or_generate_dataset
from app.simulator import traffic_simulator

router = APIRouter(prefix="/api/ocr", tags=["OCR / ANPR"])

class OcrJsonRequest(BaseModel):
    image_base64: str
    ground_truth_plate: Optional[str] = None

def compute_character_similarity(s1: str, s2: str) -> float:
    """Calculates character-level match ratio between predicted and ground-truth plate."""
    if not s1 or not s2:
        return 0.0
    s1, s2 = s1.upper(), s2.upper()
    if s1 == s2:
        return 1.0
    matches = sum(1 for c1, c2 in zip(s1, s2) if c1 == c2)
    max_len = max(len(s1), len(s2))
    return round(matches / max_len, 3)

def process_and_enrich_ocr(bgr_img: np.ndarray, ground_truth: Optional[str] = None) -> Dict[str, Any]:
    """Runs CV pipeline, checks blacklist, and computes ground-truth accuracy metrics."""
    result = ocr_engine.process_image(bgr_img)
    plate_no = result["plate_no"]
    
    # Cross-reference Blacklist Database
    bl_response = None
    is_blacklisted = False
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM blacklist WHERE plate_no = ? AND is_active = 1;", (plate_no,))
        bl_row = cursor.fetchone()
        if bl_row:
            is_blacklisted = True
            bl_response = {
                "plate_no": bl_row["plate_no"],
                "reason": bl_row["reason"],
                "vehicle_type": bl_row["vehicle_type"],
                "severity": bl_row["severity"],
                "added_date": bl_row["added_date"],
                "is_active": bool(bl_row["is_active"])
            }
            
    # Ground-truth comparison
    char_acc = 1.0
    is_match = True
    if ground_truth:
        char_acc = compute_character_similarity(plate_no, ground_truth)
        is_match = (plate_no.upper() == ground_truth.upper())

    return {
        "plate_no": result["plate_no"],
        "confidence": result["confidence"],
        "latency_ms": result["latency_ms"],
        "bbox": result["bbox"],
        "vehicle_type_estimate": result["vehicle_type_estimate"],
        "state_jurisdiction": result["state_jurisdiction"],
        "annotated_image_base64": result["annotated_image_base64"],
        "pipeline_stages": result["pipeline_stages"],
        "is_blacklisted": is_blacklisted,
        "blacklist_info": bl_response,
        "ground_truth_plate": ground_truth,
        "is_exact_match": is_match,
        "character_accuracy": char_acc
    }

@router.post("/detect")
async def detect_license_plate_multipart(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    ground_truth_plate: Optional[str] = Form(None)
):
    """
    Accepts multipart form-data (file upload or image_base64 form field).
    """
    bgr_img = None
    if file:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        bgr_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    elif image_base64:
        bgr_img = base64_to_image(image_base64)
        
    if bgr_img is None:
        raise HTTPException(status_code=400, detail="No valid image file or image_base64 provided.")
        
    return process_and_enrich_ocr(bgr_img, ground_truth_plate)

@router.post("/detect-base64")
async def detect_license_plate_json(request: OcrJsonRequest):
    """
    Accepts JSON payload with base64 encoded image string and optional ground truth.
    """
    bgr_img = base64_to_image(request.image_base64)
    if bgr_img is None:
        raise HTTPException(status_code=400, detail="Invalid base64 image data.")
        
    return process_and_enrich_ocr(bgr_img, request.ground_truth_plate)

@router.get("/real-samples")
def get_real_dataset_samples():
    """
    Returns curated real Indian license plate benchmark images from the dataset
    with ground-truth labels and difficulty ratings for live accuracy verification.
    """
    meta_file = SAMPLE_DATA_DIR / "metadata.json"
    if not meta_file.exists():
        download_or_generate_dataset()
        
    with open(meta_file, "r", encoding="utf-8") as f:
        meta = json.load(f)
        
    samples = []
    for filename, item in list(meta.items())[:20]:
        img_path = VEHICLE_FRAMES_DIR / filename
        if img_path.exists():
            img = cv2.imread(str(img_path))
            if img is not None:
                # Resize if high res to ensure fast UI payload
                h, w = img.shape[:2]
                if w > 800:
                    scale = 800.0 / w
                    img = cv2.resize(img, (800, int(h * scale)))
                    
                b64 = image_to_base64(img)
                samples.append({
                    "id": filename,
                    "filename": filename,
                    "ground_truth_plate": item["ground_truth_plate"],
                    "vehicle_type": item["vehicle_type"],
                    "state_jurisdiction": item["state_jurisdiction"],
                    "condition": item["condition"],
                    "image_base64": b64
                })
                
    return samples

@router.get("/sample-images")
def get_sample_test_images():
    """
    Returns curated demo vehicle images for 1-click testing in the UI.
    """
    SAMPLE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    
    for veh in SAMPLE_VEHICLES:
        file_path = SAMPLE_IMAGES_DIR / veh["filename"]
        if not file_path.exists():
            img = generate_sample_vehicle_image(veh)
            cv2.imwrite(str(file_path), img)
        else:
            img = cv2.imread(str(file_path))
            
        b64 = image_to_base64(img)
        results.append({
            "id": veh["plate"],
            "title": veh["title"],
            "plate_expected": veh["plate"],
            "condition": veh["condition"],
            "image_base64": b64
        })
        
    return results

class InjectEventRequest(BaseModel):
    plate_no: str
    camera_id: str = "CAM-01"

@router.post("/inject-event")
async def inject_simulated_read(payload: InjectEventRequest):
    """
    Simulates instant camera capture for a detected plate at a specified Raipur camera node.
    Triggers DB storage, kinematic updates, and live WebSocket broadcast.
    """
    await traffic_simulator.simulate_vehicle_event(payload.plate_no, target_cam_id=payload.camera_id)
    return {"success": True, "message": f"Event injected for {payload.plate_no} at {payload.camera_id}"}
