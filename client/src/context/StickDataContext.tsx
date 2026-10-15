import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SensorDataPayload, DashboardSummary, ObstacleRecord, AlertRecord, DeviceTelemetryData } from '../types';
import { api, defaultDemoDashboard, generateDemoSensorData } from '../services/api';
import { 
  subscribeToDeviceData, 
  saveDeviceData as firebaseSaveDeviceData, 
  updateDeviceTelemetry as firebaseUpdateDeviceTelemetry, 
  setDeviceSOS as firebaseSetDeviceSOS 
} from '../services/firebase';
import { soundSynth } from '../utils/soundSynth';

// Disconnected / Unavailable State (Used when no real ESP32 hardware telemetry has arrived)
export const disconnectedSensorData: SensorDataPayload = {
  deviceId: 'NEXUS-SBS-001',
  distance: null,
  frontDistance: null,
  leftDistance: null,
  rightDistance: null,
  object: 'NO HARDWARE DETECTED',
  confidence: 0,
  latitude: null,
  longitude: null,
  gpsStatus: 'offline',
  simStatus: 'offline',
  esp32CamStatus: 'offline',
  obstacleStatus: 'clear',
  sosStatus: 'normal',
  battery: null,
  alert: 'none',
  timestamp: undefined
};

export const disconnectedDashboard: DashboardSummary = {
  device: {
    deviceId: 'NEXUS-SBS-001',
    name: 'Nexus Vision Cane V2',
    status: 'offline',
    firmwareVersion: 'v2.4.1-ai-edge',
    lastSeen: 'Never',
    batteryLevel: 0,
    emergencyContact: '+1 (555) 019-2834'
  },
  latestSensor: disconnectedSensorData,
  recentObstacles: [],
  latestLocation: {
    deviceId: 'NEXUS-SBS-001',
    latitude: 0,
    longitude: 0,
    timestamp: 'No GPS Fix'
  },
  recentAlerts: [],
  systemHealth: {
    cameraFps: 0,
    sonarLatencyMs: 0,
    inferenceTimeMs: 0,
    signalStrengthDbm: 0
  }
};

interface StickContextType {
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  isDeviceConnected: boolean;
  firebaseConnected: boolean;
  rawDeviceData: DeviceTelemetryData | null;
  dashboard: DashboardSummary;
  sensorData: SensorDataPayload;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  triggerObstacle: (objName: string, dist: number, confidence?: number) => void;
  clearObstacle: () => void;
  refreshData: () => Promise<void>;
  simulateAlert: (type: 'vibration' | 'buzzer' | 'emergency_sos') => void;
  saveDeviceTelemetry: (data: Partial<DeviceTelemetryData>) => Promise<void>;
  triggerSOS: (active: boolean, message?: string) => Promise<void>;
  activeNav: string;
  setActiveNav: (nav: string) => void;
}

const StickDataContext = createContext<StickContextType | undefined>(undefined);

export const StickDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Demo mode is false by default so we never fake live readings unless explicitly requested
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isDeviceConnected, setIsDeviceConnected] = useState<boolean>(false);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(false);
  const [rawDeviceData, setRawDeviceData] = useState<DeviceTelemetryData | null>(null);

  const [dashboard, setDashboard] = useState<DashboardSummary>(disconnectedDashboard);
  const [sensorData, setSensorData] = useState<SensorDataPayload>(disconnectedSensorData);
  const [isMuted, setIsMutedState] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<string>('home');

  const setIsMuted = useCallback((val: boolean) => {
    setIsMutedState(val);
    soundSynth.setMuted(val);
  }, []);

  // Listen to Firebase Realtime Database /device path
  useEffect(() => {
    if (isDemoMode) {
      // If user toggles demo mode, populate demo state
      setDashboard(defaultDemoDashboard);
      setSensorData(defaultDemoDashboard.latestSensor);
      setIsDeviceConnected(true);
      return;
    }

    const unsubscribe = subscribeToDeviceData(
      (data) => {
        setFirebaseConnected(true);
        if (data && (data.frontDistance !== null || data.leftDistance !== null || data.rightDistance !== null || data.lastUpdated || data.isOnline)) {
          setRawDeviceData(data);
          setIsDeviceConnected(data.isOnline !== false);

          const front = data.frontDistance !== undefined ? data.frontDistance : (data.distance ?? null);
          const left = data.leftDistance ?? null;
          const right = data.rightDistance ?? null;
          const primaryDist = front ?? left ?? right ?? null;

          const isSosTriggered = Boolean(
            data.sosStatus === 'triggered' || 
            data.sosStatus === 'active' || 
            data.sosStatus === true || 
            data.sosStatus === '1'
          );

          let alertLevel: 'none' | 'vibration' | 'buzzer' | 'dual' = 'none';
          if (isSosTriggered) {
            alertLevel = 'dual';
          } else if (primaryDist !== null && primaryDist < 0.8) {
            alertLevel = 'dual';
          } else if (primaryDist !== null && primaryDist < 1.5) {
            alertLevel = 'vibration';
          } else if (primaryDist !== null && primaryDist < 2.0) {
            alertLevel = 'buzzer';
          }

          const updatedSensor: SensorDataPayload = {
            deviceId: data.deviceId || 'NEXUS-SBS-001',
            distance: primaryDist,
            frontDistance: front,
            leftDistance: left,
            rightDistance: right,
            object: data.obstacleStatus || (isSosTriggered ? 'EMERGENCY SOS' : (primaryDist !== null && primaryDist < 1.5 ? 'Obstacle In Path' : 'Clear Corridor')),
            confidence: 0.98,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
            gpsStatus: data.gpsStatus || (data.latitude ? 'connected' : 'no_fix'),
            simStatus: data.simStatus || 'connected',
            esp32CamStatus: data.esp32CamStatus || 'online',
            obstacleStatus: data.obstacleStatus || 'clear',
            sosStatus: isSosTriggered ? 'triggered' : 'normal',
            battery: data.batteryLevel ?? data.battery ?? null,
            alert: alertLevel,
            timestamp: data.lastUpdated ? String(data.lastUpdated) : new Date().toISOString()
          };

          setSensorData(updatedSensor);
          setDashboard(prev => ({
            ...prev,
            device: {
              ...prev.device,
              status: data.isOnline === false ? 'offline' : 'online',
              batteryLevel: updatedSensor.battery ?? 0,
              lastSeen: data.lastUpdated ? String(data.lastUpdated) : new Date().toISOString()
            },
            latestSensor: updatedSensor,
            latestLocation: {
              deviceId: data.deviceId || 'NEXUS-SBS-001',
              latitude: data.latitude ?? 0,
              longitude: data.longitude ?? 0,
              timestamp: data.lastUpdated ? String(data.lastUpdated) : new Date().toISOString()
            }
          }));

          // Trigger sound feedback
          if (isSosTriggered) {
            soundSynth.playHazardBuzzer();
          } else if (primaryDist !== null && primaryDist < 1.0) {
            soundSynth.playSonarPing(primaryDist);
          }
        } else {
          // No real hardware data published yet. Keep explicit unavailable state.
          setIsDeviceConnected(false);
          setRawDeviceData(null);
          setSensorData(disconnectedSensorData);
          setDashboard(disconnectedDashboard);
        }
      },
      (error) => {
        console.warn('[Firebase RTDB] Device subscriber notice:', error);
        setFirebaseConnected(false);
        setIsDeviceConnected(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isDemoMode]);

  // Demo simulator loop (ONLY runs if user manually activated Demo mode)
  useEffect(() => {
    if (!isDemoMode) return;

    const interval = setInterval(() => {
      const currentDist = sensorData.distance ?? 1.8;
      const next = generateDemoSensorData(currentDist);
      setSensorData(next);
      setDashboard(prev => ({
        ...prev,
        latestSensor: next,
        device: {
          ...prev.device,
          status: 'online',
          lastSeen: new Date().toISOString()
        }
      }));

      if (next.distance && next.distance < 1.0) {
        soundSynth.playSonarPing(next.distance);
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [isDemoMode, sensorData.distance]);

  // Refresh data function
  const refreshData = useCallback(async () => {
    if (isDemoMode) {
      setDashboard(defaultDemoDashboard);
      setSensorData(defaultDemoDashboard.latestSensor);
      return;
    }
    try {
      const res = await api.getDashboard('SBS-001');
      if (res.success && res.data) {
        setDashboard(res.data);
        if (res.data.latestSensor) {
          setSensorData(res.data.latestSensor);
        }
      }
    } catch {
      // In live mode with Firebase, subscription keeps data updated
    }
  }, [isDemoMode]);

  // Save telemetry under /device
  const saveDeviceTelemetry = useCallback(async (data: Partial<DeviceTelemetryData>) => {
    await firebaseSaveDeviceData(data);
  }, []);

  // Trigger SOS under /device
  const triggerSOS = useCallback(async (active: boolean, message?: string) => {
    await firebaseSetDeviceSOS(active, message);
    if (active) {
      soundSynth.playHazardBuzzer();
    }
  }, []);

  // Trigger Obstacle for testing
  const triggerObstacle = useCallback((objName: string, dist: number, confidence: number = 0.96) => {
    const alertType = dist < 0.9 ? 'dual' : dist < 1.6 ? 'vibration' : 'buzzer';
    const newSensor: SensorDataPayload = {
      deviceId: 'NEXUS-SBS-001',
      distance: dist,
      frontDistance: dist,
      leftDistance: dist > 1 ? dist - 0.2 : dist,
      rightDistance: dist > 1 ? dist + 0.3 : dist,
      object: objName,
      confidence,
      latitude: 11.0168,
      longitude: 76.9558,
      battery: 82,
      alert: alertType,
      timestamp: new Date().toISOString()
    };

    const newObstacle: ObstacleRecord = {
      id: `obs-${Date.now()}`,
      deviceId: 'NEXUS-SBS-001',
      label: objName,
      distance: dist,
      confidence,
      dangerLevel: dist < 1.0 ? 'high' : dist < 1.8 ? 'medium' : 'low',
      boundingBox: { x: 28, y: 15, width: 44, height: 70 },
      detectedAt: new Date().toISOString()
    };

    const newAlert: AlertRecord = {
      id: `al-${Date.now()}`,
      deviceId: 'NEXUS-SBS-001',
      type: alertType === 'dual' ? 'buzzer' : (alertType as 'vibration' | 'buzzer'),
      severity: dist < 1.0 ? 'critical' : 'warning',
      message: `Direct warning: ${objName.toUpperCase()} detected at ${dist}m`,
      acknowledged: false,
      timestamp: new Date().toISOString()
    };

    setSensorData(newSensor);
    setDashboard(prev => ({
      ...prev,
      latestSensor: newSensor,
      recentObstacles: [newObstacle, ...prev.recentObstacles.slice(0, 4)],
      recentAlerts: [newAlert, ...prev.recentAlerts.slice(0, 4)]
    }));

    // Also update Firebase /device with this test obstacle
    firebaseUpdateDeviceTelemetry({
      frontDistance: dist,
      obstacleStatus: objName,
      isOnline: true
    }).catch(console.warn);

    if (dist < 1.0) {
      soundSynth.playHazardBuzzer();
    } else {
      soundSynth.playSonarPing(dist);
    }
  }, []);

  const clearObstacle = useCallback(() => {
    const clearSensor: SensorDataPayload = {
      deviceId: 'NEXUS-SBS-001',
      distance: 3.5,
      frontDistance: 3.5,
      leftDistance: 3.5,
      rightDistance: 3.5,
      object: 'clear path',
      confidence: 0.99,
      latitude: 11.0168,
      longitude: 76.9558,
      battery: 82,
      alert: 'none',
      timestamp: new Date().toISOString()
    };
    setSensorData(clearSensor);
    setDashboard(prev => ({
      ...prev,
      latestSensor: clearSensor
    }));

    firebaseUpdateDeviceTelemetry({
      frontDistance: 3.5,
      obstacleStatus: 'clear'
    }).catch(console.warn);

    soundSynth.playClick();
  }, []);

  const simulateAlert = useCallback((type: 'vibration' | 'buzzer' | 'emergency_sos') => {
    if (type === 'buzzer') {
      soundSynth.playHazardBuzzer();
    } else if (type === 'vibration') {
      soundSynth.playHapticPulse();
    } else {
      soundSynth.playHazardBuzzer();
      soundSynth.playHapticPulse();
    }

    if (type === 'emergency_sos') {
      firebaseSetDeviceSOS(true, 'PANIC SOS BUTTON PRESSED ON CANE').catch(console.warn);
    }
  }, []);

  return (
    <StickDataContext.Provider
      value={{
        isDemoMode,
        setIsDemoMode,
        isDeviceConnected,
        firebaseConnected,
        rawDeviceData,
        dashboard,
        sensorData,
        isMuted,
        setIsMuted,
        triggerObstacle,
        clearObstacle,
        refreshData,
        simulateAlert,
        saveDeviceTelemetry,
        triggerSOS,
        activeNav,
        setActiveNav
      }}
    >
      {children}
    </StickDataContext.Provider>
  );
};

export const useStickData = () => {
  const context = useContext(StickDataContext);
  if (!context) {
    throw new Error('useStickData must be used within a StickDataProvider');
  }
  return context;
};
