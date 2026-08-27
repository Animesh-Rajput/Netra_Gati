"""
UrbanTrace Seed Generator (Raipur Smart City, Chhattisgarh)
Initializes 18 Raipur camera nodes, vehicle pool, initial blacklist targets,
and generates realistic 24-hour historical trajectory reads across Raipur's road network.
"""
import json
import random
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
from app.database import get_db, init_db
from app.config import DATA_DIR

# 50 Vehicle Plates (Primarily Chhattisgarh CG04/CG07/CG10 + Regional Interstate Transit)
SYNTHETIC_PLATES = [
    {"plate": "CG04MB1001", "type": "SUV", "color": "White", "model": "Tata Harrier"},
    {"plate": "CG04MA5555", "type": "EV Car", "color": "Teal", "model": "Tata Nexon EV"},
    {"plate": "CG04KC1357", "type": "Motorcycle", "color": "Black", "model": "Royal Enfield Hunter"},
    {"plate": "CG04GA6060", "type": "Govt Vehicle", "color": "White", "model": "Toyota Innova Crysta"},
    {"plate": "CG04TR1010", "type": "Emergency Ambulance", "color": "White-Red", "model": "Force Traveller"},
    {"plate": "CG04CD3456", "type": "SUV", "color": "Black", "model": "Mahindra Thar"},
    {"plate": "CG10AB9999", "type": "Hatchback", "color": "Red", "model": "Maruti Swift"},
    {"plate": "CG04TA3030", "type": "Taxi", "color": "Yellow-Black", "model": "Maruti Dzire Tour"},
    {"plate": "CG04HC8024", "type": "Utility Van", "color": "White", "model": "Raipur Municipal Swachhata Van"},
    {"plate": "CG04KD2468", "type": "Scooter", "color": "Grey", "model": "Honda Activa 6G"},
    {"plate": "CG07CA4321", "type": "Commercial Truck", "color": "Blue", "model": "Tata LPT 1613 (Durg-Bhilai Transit)"},
    {"plate": "CG04EA1234", "type": "Sedan", "color": "Silver", "model": "Honda City"},
    {"plate": "CG04EB5678", "type": "SUV", "color": "White", "model": "Hyundai Creta"},
    {"plate": "CG04EC9012", "type": "Hatchback", "color": "Blue", "model": "Hyundai i20"},
    {"plate": "CG04ED3456", "type": "Sedan", "color": "Grey", "model": "Skoda Slavia"},
    {"plate": "CG04EE7890", "type": "SUV", "color": "Black", "model": "Mahindra Scorpio-N"},
    {"plate": "CG04EF1122", "type": "City Bus", "color": "Green", "model": "Raipur City Transport Bus"},
    {"plate": "CG04EG3344", "type": "Auto Rickshaw", "color": "Green-Yellow", "model": "Bajaj Maxima"},
    {"plate": "CG04EH5566", "type": "EV Scooter", "color": "Mint Green", "model": "Ather 450X"},
    {"plate": "CG04EJ7788", "type": "EV Scooter", "color": "Black", "model": "Ola S1 Pro"},
    {"plate": "DL01CK8888", "type": "Luxury Sedan", "color": "Black", "model": "Audi A6"},
    {"plate": "MH12DE1212", "type": "Sedan", "color": "White", "model": "BMW 3 Series"},
    {"plate": "UP32BA3333", "type": "Commercial Truck", "color": "Brown", "model": "Ashok Leyland 2820"},
    {"plate": "HR26DK8337", "type": "Hatchback", "color": "Silver", "model": "Maruti Baleno"},
    {"plate": "DL8CAF5030", "type": "Sedan", "color": "White", "model": "Volkswagen Virtus"},
    {"plate": "UP16BV4523", "type": "SUV", "color": "Grey", "model": "Kia Seltos"},
    {"plate": "DL10CE3112", "type": "Sedan", "color": "Black", "model": "Hyundai Verna"},
    {"plate": "KA05MD7788", "type": "SUV", "color": "White", "model": "MG Hector"},
    {"plate": "RJ14CA9090", "type": "Sedan", "color": "Silver", "model": "Honda Amaze"},
    {"plate": "MP04CB5678", "type": "SUV", "color": "White", "model": "Toyota Fortuner"},
    {"plate": "MP04CA1234", "type": "Sedan", "color": "White", "model": "Maruti Ciaz"},
    {"plate": "MH14EF7878", "type": "SUV", "color": "White", "model": "Mahindra XUV700"},
    {"plate": "DL03CP1111", "type": "Sedan", "color": "White", "model": "Skoda Octavia"},
    {"plate": "KA05MC5555", "type": "EV Car", "color": "Teal", "model": "Tata Punch EV"},
    {"plate": "MP09AC8765", "type": "SUV", "color": "Black", "model": "Toyota Innova"},
    {"plate": "CG04KA8080", "type": "Motorcycle", "color": "Red", "model": "Bajaj Pulsar 220"},
    {"plate": "CG04KB9090", "type": "Motorcycle", "color": "Blue", "model": "Yamaha FZ-S"},
    {"plate": "CG04KE3579", "type": "Scooter", "color": "White", "model": "TVS Jupiter"},
    {"plate": "CG04KF4680", "type": "Scooter", "color": "Grey", "model": "Suzuki Access 125"},
    {"plate": "CG04HA6802", "type": "Delivery Van", "color": "White", "model": "Maruti Eeco Cargo"},
    {"plate": "CG04HB7913", "type": "Water Tanker", "color": "Blue", "model": "Tata 1212 LPT"},
    {"plate": "CG04HD9135", "type": "Mini Truck", "color": "White", "model": "Mahindra Bolero Maxi Truck"},
    {"plate": "CG04HE0246", "type": "Cement Mixer", "color": "Yellow", "model": "BharatBenz 2823C"},
    {"plate": "CG04HF1357", "type": "Container Truck", "color": "Red", "model": "Eicher Pro 3019"},
    {"plate": "OD02AK1234", "type": "SUV", "color": "Silver", "model": "Hyundai Alcazar (Odisha Border Transit)"},
    {"plate": "OD02BL5678", "type": "Commercial Truck", "color": "Orange", "model": "Tata Prima 3530"},
    {"plate": "TS09FA9999", "type": "Luxury SUV", "color": "Black", "model": "Land Rover Defender"},
    {"plate": "WB02AZ1122", "type": "Commercial Truck", "color": "Green", "model": "Ashok Leyland Ecomet"},
    {"plate": "GJ01CD1200", "type": "SUV", "color": "White", "model": "Hyundai Venue"},
    {"plate": "RJ14CB8888", "type": "SUV", "color": "Black", "model": "Mahindra Scorpio Classic"}
]

# Initial Seed Blacklist for Raipur Police Watchlist
INITIAL_BLACKLIST = [
    {
        "plate_no": "DL01CK8888",
        "reason": "Vehicle flagged in High-Priority Stolen Luxury Vehicle Registry (FIR #9421 / Inter-State Auto Theft)",
        "vehicle_type": "Luxury Sedan",
        "severity": "CRITICAL",
        "added_date": "2026-08-20T10:00:00Z"
    },
    {
        "plate_no": "MH12DE1212",
        "reason": "Suspect in Hit-and-Run Incident near Telibandha Marine Drive (Case Ref: RPR-HR-2026-08)",
        "vehicle_type": "Sedan",
        "severity": "CRITICAL",
        "added_date": "2026-08-22T14:30:00Z"
    },
    {
        "plate_no": "UP32BA3333",
        "reason": "Overloaded Commercial Transit / Multiple Unpaid Toll & E-Challan Violations on NH-53",
        "vehicle_type": "Commercial Truck",
        "severity": "HIGH",
        "added_date": "2026-08-23T08:15:00Z"
    },
    {
        "plate_no": "CG04CD3456",
        "reason": "Suspected Unauthorized Border Transit / Raipur Police Surveillance Target",
        "vehicle_type": "SUV",
        "severity": "HIGH",
        "added_date": "2026-08-24T06:00:00Z"
    }
]

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def seed_database(reset: bool = False):
    """Populates Raipur cameras, blacklist, and 24-hour historical trajectory reads."""
    init_db()
    
    with open(DATA_DIR / "cameras_config.json", "r", encoding="utf-8") as f:
        cameras_data = json.load(f)
        
    camera_map = {c["camera_id"]: c for c in cameras_data}
    camera_ids = list(camera_map.keys())
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM cameras;")
        cam_count = cursor.fetchone()[0]
        if cam_count > 0 and not reset:
            print(f"[Seed] Database already contains {cam_count} Raipur cameras. Skipping seed.")
            return

        if reset or cam_count > 0:
            print("[Seed] Resetting database tables for Raipur Smart City Grid...")
            cursor.execute("DELETE FROM alerts;")
            cursor.execute("DELETE FROM plate_reads;")
            cursor.execute("DELETE FROM blacklist;")
            cursor.execute("DELETE FROM cameras;")

        # 1. Insert Cameras
        print(f"[Seed] Inserting {len(cameras_data)} Raipur Smart City ANPR cameras...")
        for cam in cameras_data:
            cursor.execute("""
                INSERT OR REPLACE INTO cameras (camera_id, name, road_name, zone, lat, lng, speed_limit, status, adjacent_cameras)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cam["camera_id"],
                cam["name"],
                cam.get("road_name", ""),
                cam["zone"],
                cam["lat"],
                cam["lng"],
                cam.get("speed_limit", 50.0),
                cam.get("status", "online"),
                json.dumps(cam.get("adjacent_cameras", []))
            ))

        # 2. Insert Blacklist
        print(f"[Seed] Inserting {len(INITIAL_BLACKLIST)} initial blacklist records...")
        for bl in INITIAL_BLACKLIST:
            cursor.execute("""
                INSERT OR REPLACE INTO blacklist (plate_no, reason, vehicle_type, severity, added_date, is_active)
                VALUES (?, ?, ?, ?, ?, 1)
            """, (bl["plate_no"], bl["reason"], bl["vehicle_type"], bl["severity"], bl["added_date"]))

        # 3. Generate Historical Trajectory Reads (Last 24 Hours)
        print("[Seed] Generating 24-hour historical vehicle trajectories across Raipur camera grid...")
        now = datetime.now(timezone.utc)
        
        reads_to_insert = []
        alerts_to_insert = []
        
        for veh in SYNTHETIC_PLATES:
            plate = veh["plate"]
            v_type = veh["type"]
            is_blacklisted = any(b["plate_no"] == plate for b in INITIAL_BLACKLIST)
            
            num_trips = random.randint(2, 6)
            
            for trip_idx in range(num_trips):
                hours_ago = random.uniform(0.1, 23.5)
                trip_time = now - timedelta(hours=hours_ago)
                
                curr_cam_id = random.choice(camera_ids)
                trip_length = random.randint(3, 7)
                visited_in_trip = [curr_cam_id]
                
                for step in range(trip_length):
                    cam_info = camera_map[curr_cam_id]
                    speed_limit = cam_info.get("speed_limit", 50.0)
                    
                    speed = max(20.0, round(random.gauss(speed_limit, 7.0), 1))
                    confidence = round(random.uniform(0.92, 0.99), 3)
                    
                    timestamp_str = trip_time.isoformat()
                    reads_to_insert.append((
                        plate,
                        curr_cam_id,
                        timestamp_str,
                        confidence,
                        speed,
                        v_type,
                        f"/api/ocr/thumb/{plate}.jpg"
                    ))
                    
                    if is_blacklisted and random.random() < 0.8:
                        bl_entry = next(b for b in INITIAL_BLACKLIST if b["plate_no"] == plate)
                        alerts_to_insert.append((
                            plate,
                            curr_cam_id,
                            timestamp_str,
                            "BLACKLIST_MATCH",
                            f"FLAGGED: {bl_entry['reason']}",
                            bl_entry["severity"],
                            speed,
                            0
                        ))
                    
                    adj_cams = cam_info.get("adjacent_cameras", [])
                    if adj_cams:
                        possible_next = [c for c in adj_cams if c not in visited_in_trip[-2:]]
                        next_cam_id = random.choice(possible_next) if possible_next else random.choice(adj_cams)
                    else:
                        next_cam_id = random.choice(camera_ids)
                        
                    next_cam_info = camera_map[next_cam_id]
                    dist_km = haversine_distance(cam_info["lat"], cam_info["lng"], next_cam_info["lat"], next_cam_info["lng"])
                    
                    transit_minutes = max(1.5, (dist_km / max(25.0, speed)) * 60.0 + random.uniform(0.5, 2.0))
                    trip_time += timedelta(minutes=transit_minutes)
                    curr_cam_id = next_cam_id
                    visited_in_trip.append(curr_cam_id)

        # Batch insert plate reads
        cursor.executemany("""
            INSERT INTO plate_reads (plate_no, camera_id, timestamp, confidence, speed_estimate, vehicle_type, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, reads_to_insert)
        
        # Batch insert alerts
        cursor.executemany("""
            INSERT INTO alerts (plate_no, camera_id, timestamp, alert_type, reason, severity, speed, is_resolved)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, alerts_to_insert)
        
        print(f"[Seed] Successfully seeded {len(reads_to_insert)} reads and {len(alerts_to_insert)} alerts across Raipur.")

if __name__ == "__main__":
    seed_database(reset=True)
