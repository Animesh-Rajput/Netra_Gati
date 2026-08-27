"""
UrbanTrace Blacklist & Alert Management Router
Endpoints for watchlist operations, security flags, and real-time alert logs.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
import re

from app.database import get_db
from app.models import BlacklistCreate, BlacklistResponse, AlertModel

router = APIRouter(prefix="/api", tags=["Blacklist & Alerts"])

def clean_plate(plate: str) -> str:
    return re.sub(r'[^A-Za-z0-9]', '', plate).upper()

# --- BLACKLIST ENDPOINTS ---

@router.get("/blacklist", response_model=List[BlacklistResponse])
def get_blacklist():
    """Returns all active blacklisted vehicle plates."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM blacklist WHERE is_active = 1 ORDER BY added_date DESC;")
        rows = cursor.fetchall()
        return [
            BlacklistResponse(
                plate_no=r["plate_no"],
                reason=r["reason"],
                vehicle_type=r["vehicle_type"],
                severity=r["severity"],
                added_date=r["added_date"],
                is_active=bool(r["is_active"])
            )
            for r in rows
        ]

@router.post("/blacklist", response_model=BlacklistResponse)
def add_to_blacklist(item: BlacklistCreate):
    """Adds or updates a vehicle plate in the security blacklist."""
    cleaned = clean_plate(item.plate_no)
    if not cleaned:
        raise HTTPException(status_code=400, detail="Invalid license plate number")
        
    now_str = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO blacklist (plate_no, reason, vehicle_type, severity, added_date, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
            ON CONFLICT(plate_no) DO UPDATE SET
                reason = excluded.reason,
                vehicle_type = excluded.vehicle_type,
                severity = excluded.severity,
                is_active = 1;
        """, (cleaned, item.reason, item.vehicle_type, item.severity.upper(), now_str))
        
        return BlacklistResponse(
            plate_no=cleaned,
            reason=item.reason,
            vehicle_type=item.vehicle_type,
            severity=item.severity.upper(),
            added_date=now_str,
            is_active=True
        )

@router.delete("/blacklist/{plate_no}")
def remove_from_blacklist(plate_no: str):
    """Deactivates a vehicle plate from the blacklist."""
    cleaned = clean_plate(plate_no)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM blacklist WHERE plate_no = ?;", (cleaned,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Plate not found in blacklist")
        return {"success": True, "message": f"Plate '{cleaned}' removed from blacklist"}

# --- ALERTS ENDPOINTS ---

@router.get("/alerts", response_model=List[AlertModel])
def get_alerts(
    resolved: Optional[bool] = Query(None, description="Filter by resolved status"),
    limit: int = Query(50, description="Max alerts to return")
):
    """Returns chronologically sorted security alerts enriched with camera node coordinates."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
            SELECT a.id, a.plate_no, a.camera_id, a.timestamp, a.alert_type, a.reason, a.severity, a.speed, a.is_resolved,
                   c.name as camera_name, c.zone, c.lat, c.lng
            FROM alerts a
            LEFT JOIN cameras c ON a.camera_id = c.camera_id
        """
        params = []
        if resolved is not None:
            query += " WHERE a.is_resolved = ?"
            params.append(1 if resolved else 0)
        query += " ORDER BY a.timestamp DESC LIMIT ?;"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        return [
            AlertModel(
                id=r["id"],
                plate_no=r["plate_no"],
                camera_id=r["camera_id"],
                camera_name=r["camera_name"],
                zone=r["zone"],
                lat=r["lat"],
                lng=r["lng"],
                timestamp=r["timestamp"],
                alert_type=r["alert_type"],
                reason=r["reason"],
                severity=r["severity"],
                speed=r["speed"] or 0.0,
                is_resolved=bool(r["is_resolved"])
            )
            for r in rows
        ]

@router.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int):
    """Marks a specific security alert as resolved/dismissed by operator."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE alerts SET is_resolved = 1 WHERE id = ?;", (alert_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Alert ID not found")
        return {"success": True, "message": f"Alert {alert_id} resolved"}
