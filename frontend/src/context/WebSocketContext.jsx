/**
 * NetraGati WebSocket Context & Notification Hub
 * Manages persistent real-time streaming sockets for live camera detections and security alerts.
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [liveReads, setLiveReads] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [bannerAlert, setBannerAlert] = useState(null);
  
  // Persisted sound state
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    try {
      return localStorage.getItem('netragati_sound_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  // Sound ref to prevent stale closures and unnecessary WebSocket reconnections
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const liveWsRef = useRef(null);
  const alertsWsRef = useRef(null);
  const audioCtxRef = useRef(null);

  const setSoundEnabled = (val) => {
    const newVal = typeof val === 'function' ? val(soundEnabledRef.current) : val;
    soundEnabledRef.current = newVal;
    setSoundEnabledState(newVal);
    try {
      localStorage.setItem('netragati_sound_enabled', String(newVal));
    } catch (e) {
      // ignore
    }
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabledRef.current);
  };

  // Synthesized Cyber Sonar Beep via Web Audio API
  const playAlertSound = useCallback((severity = 'HIGH') => {
    if (!soundEnabledRef.current) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = severity === 'CRITICAL' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(severity === 'CRITICAL' ? 880 : 587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(severity === 'CRITICAL' ? 440 : 880, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // Connect Live Reads WebSocket
    const liveWsUrl = `${protocol}//${host}/ws/live`;
    const alertsWsUrl = `${protocol}//${host}/ws/alerts`;

    let liveWs;
    let alertsWs;
    let keepAliveTimer;

    const connectSockets = () => {
      try {
        liveWs = new WebSocket(liveWsUrl);
        alertsWs = new WebSocket(alertsWsUrl);

        liveWsRef.current = liveWs;
        alertsWsRef.current = alertsWs;

        liveWs.onopen = () => {
          setIsConnected(true);
        };

        liveWs.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLiveReads((prev) => [data, ...prev.slice(0, 24)]);
          } catch (err) {
            // non-json keepalive
          }
        };

        liveWs.onclose = () => {
          setIsConnected(false);
          setTimeout(connectSockets, 3000);
        };

        alertsWs.onmessage = (event) => {
          try {
            const alert = JSON.parse(event.data);
            setActiveAlerts((prev) => [alert, ...prev.slice(0, 49)]);
            setBannerAlert(alert);
            
            // Only play if sound is enabled
            if (soundEnabledRef.current) {
              playAlertSound(alert.severity);
            }

            // Auto dismiss banner popup after 7 seconds
            setTimeout(() => {
              setBannerAlert((curr) => (curr && curr.id === alert.id ? null : curr));
            }, 7000);
          } catch (err) {
            // non-json
          }
        };

        alertsWs.onclose = () => {
          // Reconnect logic
        };

        // Send ping every 20s
        keepAliveTimer = setInterval(() => {
          if (liveWs && liveWs.readyState === WebSocket.OPEN) {
            liveWs.send('ping');
          }
          if (alertsWs && alertsWs.readyState === WebSocket.OPEN) {
            alertsWs.send('ping');
          }
        }, 20000);

      } catch (e) {
        console.error('WebSocket connection error:', e);
      }
    };

    connectSockets();

    return () => {
      clearInterval(keepAliveTimer);
      if (liveWs) liveWs.close();
      if (alertsWs) alertsWs.close();
    };
  }, [playAlertSound]);

  const dismissBanner = () => setBannerAlert(null);

  const clearAlerts = () => {
    setActiveAlerts([]);
    setBannerAlert(null);
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        liveReads,
        activeAlerts,
        bannerAlert,
        dismissBanner,
        clearAlerts,
        soundEnabled,
        setSoundEnabled,
        toggleSound,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
