"""
UrbanTrace Pydantic Models and DTOs
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class CameraModel(BaseModel):
    camera_id: str
    name: str
    road_name: Optional[str] = None
    zone: str
    lat: float
    lng: float
    speed_limit: float = 50.0
    status: str = "online"
    adjacent_cameras: List[str] = []

class CameraTrafficStatus(CameraModel):
    reads_last_hour: int = 0
    avg_speed_last_hour: float = 0.0
    congestion_level: str = "LOW"  # LOW, MODERATE, HIGH

class PlateReadEvent(BaseModel):
    id: Optional[int] = None
    plate_no: str
    camera_id: str
    timestamp: str
    confidence: float
    speed_estimate: float
    vehicle_type: str = "Car"
    image_url: Optional[str] = None

class TrajectoryPoint(BaseModel):
    id: int
    camera_id: str
    camera_name: str
    road_name: Optional[str]
    zone: str
    lat: float
    lng: float
    timestamp: str
    confidence: float
    speed_estimate: float
    vehicle_type: str
    time_gap_seconds: Optional[float] = None
    distance_from_prev_km: Optional[float] = None
    implied_speed_kmh: Optional[float] = None

class TrajectoryResponse(BaseModel):
    searched_plate: str
    matched_plate: str
    match_confidence: float
    is_fuzzy_match: bool
    total_sightings: int
    first_seen: Optional[str]
    last_seen: Optional[str]
    total_distance_km: float
    avg_speed_kmh: float
    is_blacklisted: bool
    blacklist_reason: Optional[str] = None
    has_anomaly: bool = False
    anomaly_details: Optional[str] = None
    points: List[TrajectoryPoint]

class BlacklistCreate(BaseModel):
    plate_no: str
    reason: str
    vehicle_type: str = "Car"
    severity: str = "HIGH"

class BlacklistResponse(BaseModel):
    plate_no: str
    reason: str
    vehicle_type: str
    severity: str
    added_date: str
    is_active: bool

class AlertModel(BaseModel):
    id: Optional[int] = None
    plate_no: str
    camera_id: str
    camera_name: Optional[str] = None
    zone: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    timestamp: str
    alert_type: str
    reason: str
    severity: str
    speed: float = 0.0
    is_resolved: bool = False

class OcrDetectionResponse(BaseModel):
    plate_no: str
    confidence: float
    latency_ms: float
    bbox: List[int]  # [x, y, w, h]
    vehicle_type_estimate: str
    state_jurisdiction: str
    annotated_image_base64: str
    pipeline_stages: Dict[str, str]  # base64 encoded intermediate images (grayscale, clahe, threshold, plate_crop)
    is_blacklisted: bool
    blacklist_info: Optional[BlacklistResponse] = None
