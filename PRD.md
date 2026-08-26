# NetraGati — Product Requirements Document

**Version:** 1.0  
**Status:** Prototype / Hackathon Submission (Smart India Hackathon)  
**Deployment Context (Demo):** Raipur, Chhattisgarh

---

## 1. Project Overview

NetraGati is a centralized AI-powered Automatic Number Plate Recognition (ANPR), vehicle trajectory reconstruction, and smart-city traffic analytics platform. It addresses the fundamental gap in existing city ANPR systems where camera feeds operate in isolated silos — performing basic license plate detection without linking data across space and time. By integrating multi-camera ANPR feeds across a city-wide network, NetraGati enables authorities to track high-interest vehicles across different sectors, extract macro-level traffic movement trends, and respond to security incidents in real time using cross-camera intelligence.

---

## 2. Problem Statement

Modern urban centers deploy vast networks of CCTV and ANPR cameras to manage traffic, enforce traffic laws, and maintain public security. However, most existing systems process these feeds in isolated silos, preventing city authorities from:

- Automatically tracking high-interest/blacklisted vehicles across different sectors of a city
- Extracting macro-level traffic movement trends from existing camera infrastructure
- Responding to security incidents in real time using cross-camera intelligence

This lack of integration results in fragmented data that cannot support city-wide operational decision-making or investigative workflows.

---

## 3. Target Users

| User | Need |
|---|---|
| **Traffic Police / Control Room Operators** | Real-time visibility into traffic flow and instant blacklist alerts |
| **City Traffic Planning Authorities** | Macro trends — congestion points, O-D patterns, density by zone |
| **Law Enforcement / Investigation Units** | Reconstruct a specific vehicle's movement history for investigations |

---

## 4. Core Features

### 4.1 OCR Engine (High-Precision ANPR)

**What it does:**  
Performs plate detection (bounding box) + character recognition (OCR) on uploaded images or webcam capture. Includes preprocessing pipeline (grayscale conversion, CLAHE contrast enhancement, denoising) for robustness under real-world conditions. Returns plate number, confidence score, and annotated image with bounding box.

**Implementation Status:** ✅ **Fully Working**  
**Files/Modules:**  
- `backend/app/ocr_engine.py` — OpenCV + CLAHE + OCR detection pipeline
- `backend/app/routers/ocr.py` — API endpoints (`/api/ocr/detect`, `/api/ocr/real-samples`)
- `frontend/src/pages/OcrDemo.jsx` — Benchmark gallery, webcam mode, camera injector
- `backend/sample_data/` — Real Indian license plate dataset with ground-truth annotations

**Notes:**  
- Uses real Indian license plate dataset from Hugging Face (`Dataclusterlabspvtltd/indian-number-plates-dataset`)
- Ground-truth comparison shows exact match / character similarity badges
- Live running accuracy counter (>90% accuracy target)
- Supports live webcam capture via HTML5 `getUserMedia`

---

### 4.2 Single Plate Trajectory Tracking

**What it does:**  
Query interface to search any plate number and reconstruct its full travel history. Displays chronological path on a GIS map (real Raipur camera node locations), with timestamps, direction, and camera identity at each sighting. Includes fuzzy/edit-distance search tolerance to account for OCR misreads (e.g., 0 vs O, 1 vs I).

**Implementation Status:** ✅ **Fully Working**  
**Files/Modules:**  
- `backend/app/routers/trajectory.py` — API endpoints (`/api/trajectory/{plate_no}`, autocomplete)
- `backend/app/database.py` — SQLite schema for sightings storage
- `frontend/src/pages/TrajectorySearch.jsx` — Search UI, map visualization, timeline
- `frontend/src/components/MapView.jsx` — Leaflet map with trajectory polylines

**Notes:**  
- 18 real Raipur camera nodes anchored to authentic GPS coordinates
- Fuzzy search with edit-distance tolerance for OCR misreads
- Displays telemetry bar (total sightings, time span, cameras visited)
- Chronological sightings log with timestamps and camera details

---

### 4.3 Traffic Analytics Dashboard

**What it does:**  
City-wide traffic analytics including density by zone, Origin-Destination (O-D) pattern detection, congestion/bottleneck identification, real-time heatmap of traffic movement, and average speed estimation per zone/route.

**Implementation Status:** ✅ **Fully Working**  
**Files/Modules:**  
- `backend/app/routers/analytics.py` — API endpoints (density, heatmap, O-D, speed, hourly volume)
- `backend/app/simulator.py` — Background traffic simulator with OCR-powered events
- `frontend/src/pages/Analytics.jsx` — Charts, O-D table, speed compliance, heatmap
- `frontend/src/pages/Dashboard.jsx` — Central dashboard with KPI cards and live map

**Notes:**  
- Real-time stats: total sighting events, active watchlist alerts, average city-wide velocity
- Interactive dark-themed map (Leaflet + real Raipur coordinates) with live camera node status
- Charts: density by zone, traffic volume over time, top O-D routes
- Heatmap layer using Leaflet.heat

---

### 4.4 Alert System

**What it does:**  
Blacklist management (add/remove flagged plate numbers with reason). Real-time alert when a blacklisted plate is detected at any camera node, pushed via WebSocket. Rule-based anomaly flag (e.g., same plate detected at two distant cameras within an implausibly short time window). Live alert feed with toast notifications + persistent log panel.

**Implementation Status:** ✅ **Fully Working**  
**Files/Modules:**  
- `backend/app/routers/blacklist.py` — API endpoints (`/api/blacklist`, `/api/alerts`)
- `backend/app/simulator.py` — WebSocket manager for real-time alert push
- `frontend/src/pages/Alerts.jsx` — Watchlist CRUD, incident feed, severity filters
- `frontend/src/components/AlertModal.jsx` — Floating alert toast notifications
- `frontend/src/context/WebSocketContext.jsx` — WebSocket connection manager

**Notes:**  
- Real-time WebSocket push for alerts (`/ws/alerts`)
- Severity levels: CRITICAL, HIGH, MEDIUM
- Resolve alert functionality
- Camera pulse injection to simulate live events

---

## 5. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | Python 3.10+, FastAPI, Uvicorn, Pydantic v2 | REST API, WebSocket support, data validation |
| **Database** | SQLite (WAL mode) | Dev database (designed for PostgreSQL + PostGIS migration) |
| **Vision / OCR** | OpenCV (`cv2`), NumPy, PIL, CLAHE | Plate detection, preprocessing, image manipulation |
| **Dataset** | Hugging Face `Dataclusterlabspvtltd/indian-number-plates-dataset` | Real Indian license plates for OCR validation |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons | UI framework, build tooling, styling, icons |
| **GIS / Mapping** | Leaflet.js, Leaflet.heat, OpenStreetMap | Interactive maps, heatmap visualization |
| **Charts** | Recharts (AreaChart, BarChart, ResponsiveContainer) | Data visualization |
| **Real-time Protocol** | WebSockets (`/ws/live`, `/ws/alerts`) | Live event streaming and alert push |

---

## 6. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Camera / Input Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ Simulated    │  │ Real Indian  │  │ Live Webcam  │        │
│  │ Raipur Events│  │ Plate Dataset│  │ Capture      │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OCR Processing Layer                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OpenCV CLAHE → Plate Detection → Character Recognition  │  │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Storage Layer                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              SQLite Database (urbantrace.db)              │  │
│  │  • cameras  • sightings  • blacklist  • trajectories       │  │
│  └──────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API & Analytics Layer                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ /api/    │ │ /api/    │ │ /api/    │ │ /api/    │        │
│  │ cameras  │ │ trajectory│ │ analytics│ │ blacklist│        │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘        │
│       └─────────────┼─────────────┼─────────────┘              │
│                     ▼             ▼                              │
│              ┌──────────────┐                                 │
│              │ WebSocket Hub │                                 │
│              │ /ws/live     │                                 │
│              │ /ws/alerts   │                                 │
│              └──────┬───────┘                                 │
└─────────────────────┼─────────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Presentation Layer                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Dashboard │ │Trajectory│ │Analytics │ │ Alerts   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│  ┌──────────┐ ┌──────────┐                                     │
│  │ OcrDemo  │ │ LiveFeed │                                     │
│  └──────────┘ └──────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Prototype Scope vs Production Roadmap

### Current Prototype (Demo/Hackathon)

| Aspect | Implementation |
|---|---|
| **Camera Events** | Simulated camera events anchored to real Raipur GPS coordinates |
| **OCR Dataset** | Real Indian license plate dataset from Hugging Face for accuracy validation |
| **Database** | SQLite (single-file, WAL mode) |
| **Ingestion** | Single-server FastAPI with background task simulator |
| **OCR Inference** | Local OpenCV + EasyOCR/PaddleOCR on server |
| **Deployment** | Local development environment (localhost) |

### Production Roadmap (Beyond Prototype)

| Prototype Component | Production Equivalent |
|---|---|
| SQLite | PostgreSQL + PostGIS (spatial querying at city scale) |
| Simulated camera events | Live authorized ANPR camera feeds (RTSP ingestion) |
| Single-server FastAPI | Kafka/message-queue ingestion + horizontally scaled microservices |
| Local OCR inference | Fine-tuned deep learning model (YOLOv8 + CRNN) trained on city-specific plate data, deployed on edge/GPU inference nodes |
| Manual blacklist entry | Integration with police/RTO databases for automated blacklist sync |
| Local WebSocket | Redis Pub/Sub or dedicated message broker for multi-client scaling |

---

## 8. Team Roles & Ownership

| Module | Owner | Status |
|---|---|---|
| OCR Engine | _ | ✅ Complete |
| Trajectory Tracking | _ | ✅ Complete |
| Traffic Analytics Dashboard | _ | ✅ Complete |
| Alert System | _ | ✅ Complete |
| Frontend/UI | _ | ✅ Complete |
| Deployment | _ | ⏳ Pending |

---

## 9. Setup & Run Instructions

### Prerequisites
- **Python 3.10+** (tested on Python 3.13)
- **Node.js 18+** & **npm**

### Step 1: Start Backend Server
```bash
# From repository root
cd backend
python run.py
```

The backend will automatically:
- Initialize `urbantrace.db` with schema
- Download/verify the Hugging Face Indian license plate dataset
- Seed the 18 Raipur camera nodes
- Launch the real OCR traffic simulator

**Endpoints:**
- API Docs (Swagger UI): http://localhost:8000/docs
- Health Check: http://localhost:8000/api/health

### Step 2: Start Frontend Server
```bash
# In a new terminal tab / window
cd frontend
npm run dev
```

Open your browser to **`http://localhost:5173`** (or `http://localhost:5174` if 5173 is in use) to access the NetraGati operations console.

### Step 3: Run Tests (Optional)
```bash
# Run backend automated test suite
python backend/tests/run_tests.py
```

---

## 10. Known Issues / Open Items

- **No TODO/FIXME comments found** in the current codebase
- **Lint warnings:** Unknown `@tailwind` rules in `index.css` (non-blocking, Tailwind CSS directive)
- **Port conflict:** Vite may use port 5174 if 5173 is already in use (handled automatically)
- **Production deployment:** Not yet configured (requires PostgreSQL, Kafka, edge inference setup)

---

## 11. Demo Script

1. **Show Live Dashboard** — Open Dashboard page, demonstrate real-time events streaming in via WebSocket, show KPI cards updating (total sightings, active alerts, average velocity), and highlight the dark-themed map with live camera node status.

2. **Search Plate Trajectory** — Navigate to TrajectorySearch page, search for a plate number (e.g., "CG04AB1234"), show the chronological path plotted on the Raipur map with timestamps and camera details, demonstrate fuzzy search tolerance.

3. **Show Analytics & Heatmap** — Navigate to Analytics page, show density by zone, O-D flow table, traffic volume over time chart, speed compliance metrics, and the city-wide density heatmap layer.

4. **Trigger Blacklist Alert** — Navigate to Alerts page, add a plate to the watchlist with reason and severity, wait for the simulator to detect it, show the real-time alert toast notification and persistent log entry.

5. **OCR Demo with Real Dataset** — Navigate to OcrDemo page, click through the benchmark gallery of real Indian license plates, show ground-truth vs predicted comparison with accuracy badges, demonstrate live webcam capture mode, and show camera pulse injection to simulate live events.

---

**End of PRD**
