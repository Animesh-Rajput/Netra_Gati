"""
UrbanTrace Trajectory Tracking Router
Endpoints for full-city vehicle trajectory reconstruction and fuzzy plate search.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import re
from datetime import datetime

from app.database import get_db
from app.models import TrajectoryResponse, TrajectoryPoint
from app.data.seed_data import haversine_distance
from app.config import ANOMALY_SPEED_THRESHOLD, ANOMALY_MIN_DISTANCE_KM

router = APIRouter(prefix="/api/trajectory", tags=["Trajectory"])

def levenshtein_distance(s1: str, s2: str) -> int:
    """Computes edit distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
        
    return previous_row[-1]

def normalize_plate(plate: str) -> str:
    """Removes spaces, hyphens, and standardizes case."""
    return re.sub(r'[^A-Za-z0-9]', '', plate).upper()

@router.get("/autocomplete", response_model=List[dict])
def get_plate_autocomplete(query: str = Query("", description="Plate substring")):
    """Returns matching plates for frontend search bar autocomplete."""
    cleaned = normalize_plate(query)
    with get_db() as conn:
        cursor = conn.cursor()
        if cleaned:
            cursor.execute("""
                SELECT DISTINCT plate_no, vehicle_type 
                FROM plate_reads 
                WHERE plate_no LIKE ? 
                ORDER BY timestamp DESC 
                LIMIT 10;
            """, (f"%{cleaned}%",))
        else:
            cursor.execute("""
                SELECT DISTINCT plate_no, vehicle_type 
                FROM plate_reads 
                ORDER BY timestamp DESC 
                LIMIT 15;
            """)
        rows = cursor.fetchall()
        
        # Check blacklist for each
        cursor.execute("SELECT plate_no, reason, severity FROM blacklist WHERE is_active = 1;")
        bl_map = {r["plate_no"]: r for r in cursor.fetchall()}
        
        results = []
        for r in rows:
            p = r["plate_no"]
            is_bl = p in bl_map
            results.append({
                "plate_no": p,
                "vehicle_type": r["vehicle_type"],
                "is_blacklisted": is_bl,
                "blacklist_reason": bl_map[p]["reason"] if is_bl else None,
                "severity": bl_map[p]["severity"] if is_bl else None
            })
        return results

@router.get("/{plate_no}", response_model=TrajectoryResponse)
def get_vehicle_trajectory(plate_no: str, allow_fuzzy: bool = Query(True, description="Enable fuzzy edit-distance fallback")):
    """
    Reconstructs complete chronological trajectory of a vehicle across all smart city camera nodes.
    Includes time gaps, distances, implied travel speeds, and anomaly indicators.
    """
    cleaned_input = normalize_plate(plate_no)
    if not cleaned_input:
        raise HTTPException(status_code=400, detail="Invalid vehicle plate number format")
        
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Try Exact Match First
        cursor.execute("""
            SELECT r.id, r.plate_no, r.camera_id, r.timestamp, r.confidence, r.speed_estimate, r.vehicle_type,
                   c.name as camera_name, c.road_name, c.zone, c.lat, c.lng
            FROM plate_reads r
            JOIN cameras c ON r.camera_id = c.camera_id
            WHERE r.plate_no = ?
            ORDER BY r.timestamp ASC;
        """, (cleaned_input,))
        exact_rows = cursor.fetchall()
        
        target_plate = cleaned_input
        is_fuzzy = False
        match_conf = 1.0
        
        # 2. Fuzzy Matching Fallback if exact match yields no rows
        if not exact_rows and allow_fuzzy:
            cursor.execute("SELECT DISTINCT plate_no FROM plate_reads;")
            all_plates = [r["plate_no"] for r in cursor.fetchall()]
            
            best_candidate = None
            min_dist = 999
            for p in all_plates:
                dist = levenshtein_distance(cleaned_input, p)
                if dist < min_dist and dist <= 3:  # Max 3 character edit distance
                    min_dist = dist
                    best_candidate = p
                    
            if best_candidate:
                target_plate = best_candidate
                is_fuzzy = True
                match_conf = round(max(0.70, 1.0 - (min_dist * 0.1)), 2)
                
                cursor.execute("""
                    SELECT r.id, r.plate_no, r.camera_id, r.timestamp, r.confidence, r.speed_estimate, r.vehicle_type,
                           c.name as camera_name, c.road_name, c.zone, c.lat, c.lng
                    FROM plate_reads r
                    JOIN cameras c ON r.camera_id = c.camera_id
                    WHERE r.plate_no = ?
                    ORDER BY r.timestamp ASC;
                """, (target_plate,))
                exact_rows = cursor.fetchall()
                
        if not exact_rows:
            raise HTTPException(
                status_code=404, 
                detail=f"No sightings recorded for vehicle plate '{cleaned_input}'."
            )
            
        # 3. Check Blacklist Status
        cursor.execute("SELECT * FROM blacklist WHERE plate_no = ? AND is_active = 1;", (target_plate,))
        bl_row = cursor.fetchone()
        is_blacklisted = bl_row is not None
        bl_reason = bl_row["reason"] if bl_row else None
        
        # 4. Compute Point-by-Point Kinematics & Trajectory Gaps
        points: List[TrajectoryPoint] = []
        total_distance = 0.0
        total_speed_sum = 0.0
        has_anomaly = False
        anomaly_details = None
        
        prev_point = None
        prev_time = None
        
        for row in exact_rows:
            curr_time = datetime.fromisoformat(row["timestamp"])
            time_gap = None
            dist_km = None
            implied_spd = None
            
            if prev_point is not None and prev_time is not None:
                time_gap = max(1.0, (curr_time - prev_time).total_seconds())
                dist_km = round(haversine_distance(prev_point["lat"], prev_point["lng"], row["lat"], row["lng"]), 2)
                total_distance += dist_km
                
                if time_gap > 0:
                    implied_spd = round((dist_km / (time_gap / 3600.0)), 1)
                    
                # Anomaly detection: Impossible transit speed (> 150 km/h across > 4 km)
                if dist_km >= ANOMALY_MIN_DISTANCE_KM and implied_spd and implied_spd > ANOMALY_SPEED_THRESHOLD:
                    has_anomaly = True
                    anomaly_details = f"Anomaly: Vehicle jumped {dist_km} km between '{prev_point['camera_name']}' and '{row['camera_name']}' in {int(time_gap)}s (Implied speed: {implied_spd} km/h). Probable cloned plate."

            total_speed_sum += row["speed_estimate"]
            
            point = TrajectoryPoint(
                id=row["id"],
                camera_id=row["camera_id"],
                camera_name=row["camera_name"],
                road_name=row["road_name"],
                zone=row["zone"],
                lat=row["lat"],
                lng=row["lng"],
                timestamp=row["timestamp"],
                confidence=row["confidence"],
                speed_estimate=row["speed_estimate"],
                vehicle_type=row["vehicle_type"],
                time_gap_seconds=time_gap,
                distance_from_prev_km=dist_km,
                implied_speed_kmh=implied_spd
            )
            points.append(point)
            prev_point = {"lat": row["lat"], "lng": row["lng"], "camera_name": row["camera_name"]}
            prev_time = curr_time
            
        avg_speed = round(total_speed_sum / len(points), 1) if points else 0.0
        
        return TrajectoryResponse(
            searched_plate=cleaned_input,
            matched_plate=target_plate,
            match_confidence=match_conf,
            is_fuzzy_match=is_fuzzy,
            total_sightings=len(points),
            first_seen=points[0].timestamp if points else None,
            last_seen=points[-1].timestamp if points else None,
            total_distance_km=round(total_distance, 2),
            avg_speed_kmh=avg_speed,
            is_blacklisted=is_blacklisted,
            blacklist_reason=bl_reason,
            has_anomaly=has_anomaly,
            anomaly_details=anomaly_details,
            points=points
        )
