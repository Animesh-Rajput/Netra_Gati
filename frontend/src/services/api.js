/**
 * NetraGati API Client Service (Raipur Smart City)
 * Connects frontend views to FastAPI backend endpoints.
 */

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

// --- CAMERAS ---
export async function fetchCameras(zone = null) {
  const url = zone ? `${API_BASE}/cameras?zone=${encodeURIComponent(zone)}` : `${API_BASE}/cameras`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch cameras');
  return res.json();
}

export async function fetchCameraDetail(cameraId) {
  const res = await fetch(`${API_BASE}/cameras/${cameraId}`);
  if (!res.ok) throw new Error(`Failed to fetch camera ${cameraId}`);
  return res.json();
}

// --- TRAJECTORY ---
export async function fetchTrajectory(plateNo, allowFuzzy = true) {
  const url = `${API_BASE}/trajectory/${encodeURIComponent(plateNo)}?allow_fuzzy=${allowFuzzy}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `No trajectory found for plate ${plateNo}`);
  }
  return res.json();
}

export async function fetchPlateAutocomplete(query = '') {
  const url = `${API_BASE}/trajectory/autocomplete?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

// --- ANALYTICS ---
export async function fetchAnalyticsSummary() {
  const res = await fetch(`${API_BASE}/analytics/summary`);
  if (!res.ok) throw new Error('Failed to fetch analytics summary');
  return res.json();
}

export async function fetchTrafficDensity(hours = 24) {
  const res = await fetch(`${API_BASE}/analytics/density?hours=${hours}`);
  if (!res.ok) throw new Error('Failed to fetch traffic density');
  return res.json();
}

export async function fetchHeatmapData() {
  const res = await fetch(`${API_BASE}/analytics/heatmap`);
  if (!res.ok) throw new Error('Failed to fetch heatmap data');
  return res.json();
}

export async function fetchODMatrix(limit = 10) {
  const res = await fetch(`${API_BASE}/analytics/od-matrix?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch O-D matrix');
  return res.json();
}

export async function fetchSpeedAnalytics() {
  const res = await fetch(`${API_BASE}/analytics/speed`);
  if (!res.ok) throw new Error('Failed to fetch speed analytics');
  return res.json();
}

export async function fetchHourlyVolume() {
  const res = await fetch(`${API_BASE}/analytics/hourly-volume`);
  if (!res.ok) throw new Error('Failed to fetch hourly volume');
  return res.json();
}

// --- BLACKLIST & ALERTS ---
export async function fetchBlacklist() {
  const res = await fetch(`${API_BASE}/blacklist`);
  if (!res.ok) throw new Error('Failed to fetch blacklist');
  return res.json();
}

export async function addBlacklistPlate(data) {
  const res = await fetch(`${API_BASE}/blacklist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to add plate to blacklist');
  }
  return res.json();
}

export async function removeBlacklistPlate(plateNo) {
  const res = await fetch(`${API_BASE}/blacklist/${encodeURIComponent(plateNo)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove plate from blacklist');
  return res.json();
}

export async function fetchAlerts(resolved = null, limit = 50) {
  let url = `${API_BASE}/alerts?limit=${limit}`;
  if (resolved !== null) url += `&resolved=${resolved}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function resolveAlert(alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/resolve`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to resolve alert');
  return res.json();
}

// --- OCR & VISION ---
export async function detectPlateImage(formDataOrBase64, groundTruthPlate = null) {
  if (typeof formDataOrBase64 === 'string') {
    const payload = {
      image_base64: formDataOrBase64,
      ground_truth_plate: groundTruthPlate
    };
    const res = await fetch(`${API_BASE}/ocr/detect-base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'OCR detection failed');
    }
    return res.json();
  } else {
    // FormData
    if (groundTruthPlate && formDataOrBase64 instanceof FormData) {
      formDataOrBase64.append('ground_truth_plate', groundTruthPlate);
    }
    const res = await fetch(`${API_BASE}/ocr/detect`, {
      method: 'POST',
      body: formDataOrBase64,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'OCR detection failed');
    }
    return res.json();
  }
}

export async function fetchRealSamples() {
  const res = await fetch(`${API_BASE}/ocr/real-samples`);
  if (!res.ok) throw new Error('Failed to fetch real Indian dataset samples');
  return res.json();
}

export async function fetchSampleImages() {
  const res = await fetch(`${API_BASE}/ocr/sample-images`);
  if (!res.ok) throw new Error('Failed to fetch sample images');
  return res.json();
}

export async function injectSimulatedEvent(plateNo, cameraId = 'CAM-01') {
  const res = await fetch(`${API_BASE}/ocr/inject-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plate_no: plateNo, camera_id: cameraId }),
  });
  if (!res.ok) throw new Error('Failed to inject simulated event');
  return res.json();
}
