import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

// Fix Leaflet default icon issues in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Raipur Smart City Coordinates & Bounds
const RAIPUR_CENTER = [21.2514, 81.6296];
const RAIPUR_BOUNDS = L.latLngBounds(
  L.latLng(21.05, 81.45), // South-West
  L.latLng(21.40, 81.85)  // North-East
);

export default function MapView({
  cameras = [],
  trajectoryPoints = [],
  heatmapPoints = [],
  showHeatmap = false,
  showCameras = true,
  onCameraSelect = null,
  onPlateClick = null,
  recentActiveCameraId = null,
  center = RAIPUR_CENTER,
  zoom = 13,
  height = '520px'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const cameraLayerGroupRef = useRef(null);
  const trajectoryLayerGroupRef = useRef(null);
  const heatLayerRef = useRef(null);

  // 1. Initialize Leaflet Map Instance with OpenStreetMap Tiles
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      minZoom: 11,
      maxZoom: 18,
      maxBounds: RAIPUR_BOUNDS,
      maxBoundsViscosity: 0.9,
      zoomControl: false,
      attributionControl: false
    });

    // Dark-themed OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'dark-map-tiles'
    }).addTo(map);

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    cameraLayerGroupRef.current = L.layerGroup().addTo(map);
    trajectoryLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Render Camera Markers (Raipur Junctions)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = cameraLayerGroupRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (!showCameras) return;

    cameras.forEach((cam) => {
      const congestion = cam.congestion_level || 'LOW';
      const color = congestion === 'HIGH' ? '#ef4444' : (congestion === 'MODERATE' ? '#f59e0b' : '#2DD4BF');

      const customIcon = L.divIcon({
        className: 'custom-cam-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            <div style="
              width: 26px; 
              height: 26px; 
              border-radius: 50%; 
              background: #141A22; 
              border: 2px solid ${color}; 
              display: flex; 
              align-items: center; 
              justify-content: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              ${recentActiveCameraId === cam.camera_id ? 'box-shadow: 0 0 12px rgba(45,212,191,0.5);' : ''}
            ">
              <span style="font-size: 10px; font-weight: 700; color: ${color};">${cam.camera_id.replace('CAM-', '')}</span>
            </div>
            <span style="
              position: absolute; 
              bottom: -15px; 
              background: #141A22; 
              border: 1px solid #232B36; 
              padding: 1px 5px; 
              border-radius: 4px; 
              font-size: 9px; 
              color: #e2e8f0; 
              white-space: nowrap;
              font-weight: 600;
              box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            ">${cam.name.split(' ')[0]}</span>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
      });

      const marker = L.marker([cam.lat, cam.lng], { icon: customIcon });

      const popupContent = `
        <div style="min-width: 240px; font-family: sans-serif; background: #141A22; border: 1px solid #232B36; border-left: 4px solid ${color}; border-radius: 8px; padding: 14px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #232B36;">
            <span style="font-weight: 700; font-size: 13px; color: #e2e8f0; letter-spacing: 0.5px;">${cam.name}</span>
            <span style="font-size: 10px; background: #0B0F14; color: ${color}; padding: 3px 8px; border-radius: 4px; border: 1px solid ${color}; font-weight: 700; letter-spacing: 0.5px;">
              ${cam.camera_id}
            </span>
          </div>
          <p style="font-size: 11px; color: #94a3b8; margin: 0 0 10px 0;">${cam.road_name || 'Raipur City Arterial'}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
            <div style="background: #0B0F14; padding: 6px 8px; border-radius: 6px; border: 1px solid #232B36;">
              <span style="color: #94a3b8; font-size: 10px; font-weight: 600; letter-spacing: 0.5px;">ZONE</span><br>
              <strong style="color: #e2e8f0;">${cam.zone}</strong>
            </div>
            <div style="background: #0B0F14; padding: 6px 8px; border-radius: 6px; border: 1px solid #232B36;">
              <span style="color: #94a3b8; font-size: 10px; font-weight: 600; letter-spacing: 0.5px;">SPEED</span><br>
              <strong style="color: #e2e8f0;">${cam.speed_limit} km/h</strong>
            </div>
            <div style="background: #0B0F14; padding: 6px 8px; border-radius: 6px; border: 1px solid #232B36;">
              <span style="color: #94a3b8; font-size: 10px; font-weight: 600; letter-spacing: 0.5px;">1H READS</span><br>
              <strong style="color: #2DD4BF;">${cam.reads_last_hour || 0}</strong>
            </div>
            <div style="background: #0B0F14; padding: 6px 8px; border-radius: 6px; border: 1px solid #232B36;">
              <span style="color: #94a3b8; font-size: 10px; font-weight: 600; letter-spacing: 0.5px;">CONGESTION</span><br>
              <strong style="color: ${color};">${congestion}</strong>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        if (onCameraSelect) onCameraSelect(cam);
      });

      layer.addLayer(marker);
    });
  }, [cameras, showCameras, onCameraSelect, recentActiveCameraId]);

  // 3. Render Heatmap Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (showHeatmap && heatmapPoints && heatmapPoints.length > 0) {
      const heat = L.heatLayer(heatmapPoints, {
        radius: 35,
        blur: 25,
        maxZoom: 15,
        max: 1.0,
        gradient: {
          0.3: '#06b6d4',
          0.55: '#10b981',
          0.75: '#f59e0b',
          1.0: '#ef4444'
        }
      });
      heat.addTo(map);
      heatLayerRef.current = heat;
    }
  }, [showHeatmap, heatmapPoints]);

  // 4. Render Vehicle Trajectory Polyline & Waypoint Badges
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = trajectoryLayerGroupRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (!trajectoryPoints || trajectoryPoints.length === 0) return;

    const latLngs = trajectoryPoints.map(p => [p.lat, p.lng]);

    // Outer polyline shadow
    const glowLine = L.polyline(latLngs, {
      color: '#3b82f6',
      weight: 8,
      opacity: 0.25,
      lineCap: 'round',
      lineJoin: 'round'
    });
    layer.addLayer(glowLine);

    // Inner polyline
    const pathLine = L.polyline(latLngs, {
      color: '#2563eb',
      weight: 4,
      opacity: 0.9,
      dashArray: '8, 6',
      lineCap: 'round',
      lineJoin: 'round'
    });
    layer.addLayer(pathLine);

    // Add Waypoint markers
    trajectoryPoints.forEach((point, index) => {
      const isStart = index === 0;
      const isEnd = index === trajectoryPoints.length - 1;
      
      const badgeBg = isStart ? '#10b981' : (isEnd ? '#ef4444' : '#3b82f6');
      const badgeText = isStart ? 'START' : (isEnd ? 'NOW' : `${index + 1}`);

      const wpIcon = L.divIcon({
        className: 'custom-wp-marker',
        html: `
          <div style="
            display: flex; 
            flex-direction: column;
            align-items: center; 
            justify-content: center;
          ">
            <div style="
              width: 26px; 
              height: 26px; 
              border-radius: 50%; 
              background: ${badgeBg}; 
              border: 2px solid #ffffff; 
              color: #ffffff;
              display: flex; 
              align-items: center; 
              justify-content: center;
              font-size: 11px;
              font-weight: 700;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">
              ${index + 1}
            </div>
            <span style="
              margin-top: 2px;
              background: #ffffff; 
              border: 1px solid ${badgeBg}; 
              padding: 1px 4px; 
              border-radius: 3px; 
              font-size: 8px; 
              color: ${badgeBg}; 
              font-weight: 700;
              letter-spacing: 0.5px;
              box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            ">${badgeText}</span>
          </div>
        `,
        iconSize: [28, 42],
        iconAnchor: [14, 21],
        popupAnchor: [0, -22]
      });

      const wpMarker = L.marker([point.lat, point.lng], { icon: wpIcon });

      const dateStr = new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const timeGapText = point.time_gap_seconds ? `${Math.round(point.time_gap_seconds / 60)} min` : 'Origin';
      const distText = point.distance_from_prev_km ? `${point.distance_from_prev_km} km` : '0 km';

      const popupHtml = `
        <div style="min-width: 220px; font-family: sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <strong style="color: #1e293b; font-size: 12px;">Waypoint #${index + 1}</strong>
            <span style="font-size: 10px; background: #dbeafe; color: #1e40af; padding: 1px 5px; border-radius: 3px;">${dateStr}</span>
          </div>
          <p style="font-size: 12px; font-weight: 600; color: #1e293b; margin: 0 0 4px 0;">${point.camera_name}</p>
          <p style="font-size: 10px; color: #64748b; margin: 0 0 6px 0;">${point.road_name || 'Raipur City Arterial'}</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px;">
            <div style="background: #f8fafc; padding: 4px; border-radius: 3px;">
              <span style="color: #64748b;">Speed:</span> <strong style="color: #059669;">${point.speed_estimate} km/h</strong>
            </div>
            <div style="background: #f8fafc; padding: 4px; border-radius: 3px;">
              <span style="color: #64748b;">Confidence:</span> <strong style="color: #1e293b;">${Math.round(point.confidence * 100)}%</strong>
            </div>
            <div style="background: #f8fafc; padding: 4px; border-radius: 3px;">
              <span style="color: #64748b;">Segment Dist:</span> <strong style="color: #1e293b;">${distText}</strong>
            </div>
            <div style="background: #f8fafc; padding: 4px; border-radius: 3px;">
              <span style="color: #64748b;">Transit Gap:</span> <strong style="color: #1e293b;">${timeGapText}</strong>
            </div>
          </div>
        </div>
      `;

      wpMarker.bindPopup(popupHtml);
      layer.addLayer(wpMarker);
    });

    // Auto-fit bounds
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [trajectoryPoints]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-300 shadow-md bg-white">
      <div ref={mapContainerRef} style={{ height: height, width: '100%' }} />
    </div>
  );
}