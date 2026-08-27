"""
Sample Vehicle Image Generator for UrbanTrace Demo
Creates realistic vehicle images with license plates for instant testing of the ANPR OCR module.
"""
import cv2
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from app.config import SAMPLE_IMAGES_DIR

SAMPLE_VEHICLES = [
    {
        "filename": "sample_sedan_mp04.jpg",
        "plate": "MP04CA1234",
        "title": "White Sedan — MP04CA1234 (Normal Daylight)",
        "car_color": (220, 225, 230),
        "bg_color": (70, 75, 80),
        "condition": "Clear Daylight"
    },
    {
        "filename": "sample_stolen_dl01.jpg",
        "plate": "DL01CK8888",
        "title": "Black Luxury Car — DL01CK8888 (Flagged: Stolen Registry)",
        "car_color": (35, 35, 40),
        "bg_color": (60, 65, 70),
        "condition": "Overcast Traffic"
    },
    {
        "filename": "sample_hitrun_mh12.jpg",
        "plate": "MH12DE1212",
        "title": "Silver SUV — MH12DE1212 (Flagged: Hit & Run Suspect)",
        "car_color": (160, 165, 170),
        "bg_color": (50, 55, 60),
        "condition": "High-Speed Corridor"
    },
    {
        "filename": "sample_ev_ka05.jpg",
        "plate": "KA05MC5555",
        "title": "Teal Electric Vehicle — KA05MC5555 (Clean Green Plate)",
        "car_color": (30, 140, 130),
        "bg_color": (80, 85, 90),
        "condition": "Smart City Eco-Zone"
    },
    {
        "filename": "sample_suv_cg04.jpg",
        "plate": "CG04MA1001",
        "title": "Dark Blue SUV — CG04MA1001 (Interstate Transit)",
        "car_color": (25, 40, 95),
        "bg_color": (65, 70, 75),
        "condition": "Highway Toll Gate"
    }
]

def generate_sample_vehicle_image(veh_data: dict) -> np.ndarray:
    """Generates an image of a vehicle with a centered, realistic license plate."""
    width, height = 640, 420
    
    # 1. Background (Road & sky environment)
    img = np.zeros((height, width, 3), dtype=np.uint8)
    img[:180] = veh_data["bg_color"]  # Upper sky/building
    img[180:] = (45, 48, 52)          # Asphalt road
    
    # Road markings
    cv2.line(img, (0, 390), (width, 390), (220, 220, 220), 4)
    cv2.line(img, (width // 2 - 40, 310), (width // 2 + 40, 310), (255, 200, 0), 3)
    
    # 2. Car Body (Rear view of car)
    car_color = veh_data["car_color"]
    # Car cabin / windshield
    cabin_pts = np.array([[180, 100], [460, 100], [530, 210], [110, 210]], np.int32)
    cv2.fillPoly(img, [cabin_pts], (25, 30, 35))
    # Windshield tint & reflection
    cv2.fillPoly(img, [np.array([[200, 115], [440, 115], [500, 195], [140, 195]], np.int32)], (50, 65, 80))
    
    # Car main chassis
    cv2.rectangle(img, (100, 195), (540, 340), car_color, -1)
    # Bumper
    bumper_color = tuple(max(0, c - 30) for c in car_color)
    cv2.rectangle(img, (80, 290), (560, 360), bumper_color, -1)
    
    # Tail lights
    cv2.rectangle(img, (110, 220), (180, 255), (0, 0, 220), -1)
    cv2.rectangle(img, (460, 220), (530, 255), (0, 0, 220), -1)
    # Inner tail light glow
    cv2.rectangle(img, (120, 230), (170, 245), (50, 50, 255), -1)
    cv2.rectangle(img, (470, 230), (520, 245), (50, 50, 255), -1)
    
    # Tires
    cv2.rectangle(img, (85, 330), (135, 375), (15, 15, 15), -1)
    cv2.rectangle(img, (505, 330), (555, 375), (15, 15, 15), -1)
    
    # 3. License Plate Recess / Bounding Area
    plate_x1, plate_y1 = 220, 285
    plate_x2, plate_y2 = 420, 345
    cv2.rectangle(img, (plate_x1 - 4, plate_y1 - 4), (plate_x2 + 4, plate_y2 + 4), (20, 20, 20), -1)
    
    # License Plate White Plate Surface (or Green for EV)
    is_ev = "KA05" in veh_data["plate"]
    plate_bg = (30, 120, 30) if is_ev else (250, 250, 250)
    plate_fg = (255, 255, 255) if is_ev else (10, 10, 10)
    
    cv2.rectangle(img, (plate_x1, plate_y1), (plate_x2, plate_y2), plate_bg, -1)
    cv2.rectangle(img, (plate_x1, plate_y1), (plate_x2, plate_y2), (0, 0, 0), 2)
    
    # Left IND Blue Strip
    cv2.rectangle(img, (plate_x1 + 2, plate_y1 + 2), (plate_x1 + 22, plate_y2 - 2), (180, 50, 0), -1)
    cv2.putText(img, "IND", (plate_x1 + 3, plate_y2 - 15), cv2.FONT_HERSHEY_SIMPLEX, 0.28, (255, 255, 255), 1)
    
    # License Plate Text
    plate_text = veh_data["plate"]
    cv2.putText(img, plate_text, (plate_x1 + 30, plate_y1 + 42), cv2.FONT_HERSHEY_DUPLEX, 0.95, plate_fg, 2, cv2.LINE_AA)
    
    # Add subtle sensor noise and atmospheric lighting
    noise = np.random.normal(0, 4, img.shape).astype(np.int16)
    img_noisy = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    return img_noisy

def generate_all_samples():
    """Generates and writes all sample demo images to disk."""
    SAMPLE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    for veh in SAMPLE_VEHICLES:
        img = generate_sample_vehicle_image(veh)
        target_path = SAMPLE_IMAGES_DIR / veh["filename"]
        cv2.imwrite(str(target_path), img)
    print(f"[Sample Generator] Created {len(SAMPLE_VEHICLES)} test vehicle images in {SAMPLE_IMAGES_DIR}")

if __name__ == "__main__":
    generate_all_samples()
