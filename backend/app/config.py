"""
UrbanTrace Configuration
Defines application constants, database paths, and Raipur Smart City grid parameters.
"""
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "app" / "data"
SAMPLE_DATA_DIR = BASE_DIR / "sample_data"
PLATES_DIR = SAMPLE_DATA_DIR / "plates"
VEHICLE_FRAMES_DIR = SAMPLE_DATA_DIR / "vehicle_frames"
SAMPLE_IMAGES_DIR = DATA_DIR / "sample_images"
DB_PATH = BASE_DIR / "urbantrace.db"

# City Center (Raipur Smart City, Chhattisgarh)
CITY_NAME = "Raipur Smart City, Chhattisgarh"
CITY_CENTER = {"lat": 21.2514, "lng": 81.6296}
DEFAULT_ZOOM = 13
CITY_BOUNDS = {
    "south_west": [21.05, 81.45],
    "north_east": [21.40, 81.85]
}

# Traffic Simulation Settings
SIMULATION_INTERVAL_SECONDS = 2.5  # Event emission cadence
ACTIVE_VEHICLE_POOL_SIZE = 50      # Distinct synthetic vehicles
SPEED_LIMIT_DEFAULT = 50.0        # km/h
SPEEDING_THRESHOLD = 75.0          # km/h
ANOMALY_SPEED_THRESHOLD = 150.0    # km/h (indicates cloned plate / impossible speed)
ANOMALY_MIN_DISTANCE_KM = 4.0      # Minimum distance to consider impossible speed
ANOMALY_MAX_TIME_MINUTES = 2.0     # Max time to trigger impossible speed alert

# CORS & Server Settings
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "*"
]
