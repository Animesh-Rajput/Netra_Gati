"""
UrbanTrace Database Engine (SQLite for prototype, structured for PostgreSQL/PostGIS migration)
"""
import sqlite3
import json
from contextlib import contextmanager
from typing import Generator
from app.config import DB_PATH

def get_db_connection() -> sqlite3.Connection:
    """Creates a database connection with Row factory enabled."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")  # High concurrency write-ahead logging
    return conn

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for safe transactional database operations."""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initializes the database schema and indexes."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Cameras table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS cameras (
            camera_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            road_name TEXT,
            zone TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            speed_limit REAL DEFAULT 50.0,
            status TEXT DEFAULT 'online',
            adjacent_cameras TEXT DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        # Plate Reads / Sighting Events table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS plate_reads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plate_no TEXT NOT NULL,
            camera_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            confidence REAL NOT NULL,
            speed_estimate REAL NOT NULL,
            vehicle_type TEXT DEFAULT 'Car',
            image_url TEXT,
            FOREIGN KEY (camera_id) REFERENCES cameras (camera_id)
        );
        """)
        
        # Blacklist table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS blacklist (
            plate_no TEXT PRIMARY KEY,
            reason TEXT NOT NULL,
            vehicle_type TEXT DEFAULT 'Car',
            severity TEXT DEFAULT 'HIGH',
            added_date TEXT NOT NULL,
            is_active INTEGER DEFAULT 1
        );
        """)
        
        # Alerts table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plate_no TEXT NOT NULL,
            camera_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            reason TEXT NOT NULL,
            severity TEXT DEFAULT 'HIGH',
            speed REAL DEFAULT 0.0,
            is_resolved INTEGER DEFAULT 0,
            FOREIGN KEY (camera_id) REFERENCES cameras (camera_id)
        );
        """)
        
        # Performance Indexes for sub-millisecond trajectory & analytics queries
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reads_plate ON plate_reads (plate_no, timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reads_cam_time ON plate_reads (camera_id, timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_reads_timestamp ON plate_reads (timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts (timestamp DESC);")
