"""
UrbanTrace — Raipur Smart City ANPR Trajectory & Traffic Analytics Platform
Main FastAPI Application & WebSocket Dispatch Hub
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import CORS_ORIGINS, SAMPLE_IMAGES_DIR, SAMPLE_DATA_DIR
from app.database import init_db
from app.data.seed_data import seed_database
from app.data.sample_generator import generate_all_samples
from app.data.download_dataset import download_or_generate_dataset
from app.simulator import traffic_simulator, ws_manager

from app.routers import cameras, trajectory, analytics, blacklist, ocr

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup seeding and simulator lifecycle."""
    print("=================================================================")
    print("🚦 UrbanTrace: Raipur Smart City ANPR & Trajectory Analytics Grid")
    print("=================================================================")
    
    # 1. Initialize SQLite Database Schema
    init_db()
    
    # 2. Download / Initialize Real Indian License Plate Dataset
    download_or_generate_dataset()
    
    # 3. Seed Raipur Camera Nodes & Historical Trajectory Data
    seed_database(reset=False)
    
    # 4. Generate Visual Demo Vehicles
    generate_all_samples()
    
    # 5. Launch Real OCR-Powered Road Traffic Simulator
    traffic_simulator.start()
    
    yield
    
    # Shutdown
    print("[Shutdown] Stopping Traffic Simulator Task...")
    traffic_simulator.stop()

# Initialize FastAPI App
app = FastAPI(
    title="UrbanTrace ANPR & Raipur Traffic Analytics API",
    description="Centralized AI-powered ANPR platform for smart city trajectory tracking, traffic flow analytics, and security alerts.",
    version="1.1.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(cameras.router)
app.include_router(trajectory.router)
app.include_router(analytics.router)
app.include_router(blacklist.router)
app.include_router(ocr.router)

# Mount Static Directories
SAMPLE_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_DATA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static/samples", StaticFiles(directory=str(SAMPLE_IMAGES_DIR)), name="samples")
app.mount("/static/data", StaticFiles(directory=str(SAMPLE_DATA_DIR)), name="data")

# Health Check Endpoint
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "UrbanTrace Backend API (Raipur)",
        "simulator_active": traffic_simulator.running
    }

# WebSocket Endpoint: Live Security Alerts
@app.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    await ws_manager.connect_alerts(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_alerts(websocket)
    except Exception:
        ws_manager.disconnect_alerts(websocket)

# WebSocket Endpoint: Live Camera Feed Detections Ticker
@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await ws_manager.connect_live(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_live(websocket)
    except Exception:
        ws_manager.disconnect_live(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
