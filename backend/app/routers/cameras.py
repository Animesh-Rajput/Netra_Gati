"""
UrbanTrace Cameras Router
Endpoints for querying camera nodes, metadata, and live operational stats.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List
import json
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models import CameraModel, CameraTrafficStatus

router = APIRouter(prefix="/api/cameras", tags=["Cameras"])

@router.get("", response_model=List[CameraTrafficStatus])
def get_all_cameras(zone: str = Query(None, description="Filter by city zone")):
    """Returns all camera nodes enriched with real-time traffic statistics."""
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        query = "SELECT * FROM cameras"
        params = []
        if zone:
            query += " WHERE zone = ?"
            params.append(zone)
        query += " ORDER BY camera_id ASC;"
        
        cursor.execute(query, params)
        cameras = cursor.fetchall()
        
        results = []
        for cam in cameras:
            cam_id = cam["camera_id"]
            
            # Fetch last hour traffic load for this camera
            cursor.execute("""
                SELECT COUNT(*) as count, AVG(speed_estimate) as avg_speed
                FROM plate_reads
                WHERE camera_id = ? AND timestamp >= ?;
            """, (cam_id, one_hour_ago))
            stats = cursor.fetchone()
            
            reads_count = stats["count"] if stats and stats["count"] else 0
            avg_speed = round(stats["avg_speed"], 1) if stats and stats["avg_speed"] else cam["speed_limit"]
            
            # Calculate congestion level based on reads volume
            if reads_count > 30:
                congestion = "HIGH"
            elif reads_count > 12:
                congestion = "MODERATE"
            else:
                congestion = "LOW"
                
            results.append(CameraTrafficStatus(
                camera_id=cam["camera_id"],
                name=cam["name"],
                road_name=cam["road_name"],
                zone=cam["zone"],
                lat=cam["lat"],
                lng=cam["lng"],
                speed_limit=cam["speed_limit"],
                status=cam["status"],
                adjacent_cameras=json.loads(cam["adjacent_cameras"] or "[]"),
                reads_last_hour=reads_count,
                avg_speed_last_hour=avg_speed,
                congestion_level=congestion
            ))
            
        return results

@router.get("/{camera_id}", response_model=CameraTrafficStatus)
def get_camera_detail(camera_id: str):
    """Returns single camera details and current traffic stats."""
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM cameras WHERE camera_id = ?;", (camera_id,))
        cam = cursor.fetchone()
        if not cam:
            raise HTTPException(status_code=404, detail="Camera node not found")
            
        cursor.execute("""
            SELECT COUNT(*) as count, AVG(speed_estimate) as avg_speed
            FROM plate_reads
            WHERE camera_id = ? AND timestamp >= ?;
        """, (camera_id, one_hour_ago))
        stats = cursor.fetchone()
        
        reads_count = stats["count"] if stats and stats["count"] else 0
        avg_speed = round(stats["avg_speed"], 1) if stats and stats["avg_speed"] else cam["speed_limit"]
        
        congestion = "HIGH" if reads_count > 30 else ("MODERATE" if reads_count > 12 else "LOW")
        
        return CameraTrafficStatus(
            camera_id=cam["camera_id"],
            name=cam["name"],
            road_name=cam["road_name"],
            zone=cam["zone"],
            lat=cam["lat"],
            lng=cam["lng"],
            speed_limit=cam["speed_limit"],
            status=cam["status"],
            adjacent_cameras=json.loads(cam["adjacent_cameras"] or "[]"),
            reads_last_hour=reads_count,
            avg_speed_last_hour=avg_speed,
            congestion_level=congestion
        )
