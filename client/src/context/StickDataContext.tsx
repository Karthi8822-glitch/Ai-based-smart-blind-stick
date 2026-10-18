import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  SensorDataPayload, 
  DashboardSummary, 
  ObstacleRecord, 
  AlertRecord, 
  DeviceTelemetryData,
  ConnectionState
} from '../types';
import { defaultDemoDashboard, generateDemoSensorData } from '../services/api';
import { 
  subscribeToSupabaseLiveSensor, 
  subscribeToSupabaseAlerts, 
  subscribeToSupabaseAIDetections,
  fetchLatestLiveSensor,
  fetchDeviceDetails,
  fetchSensorHistoryChronological,
  fetchLatestAIDetections,
  isTelemetryStale,
  isCameraVerifiedOnline,
  sendTelemetryToEdgeFunction,
  sendCameraFrameCapture,
  LiveSensorRow,
  SensorHistoryRow,
  AIDetectionRow,
  DEFAULT_DEVICE_ID
} from '../services/supabase';
import { soundSynth } from '../utils/soundSynth';

// Disconnected / Initial State for nexus-01
export const disconnectedSensorData: SensorDataPayload = {
  deviceId: DEFAULT_DEVICE_ID,
  distance: null,
  frontDistance: null,
  leftDistance: null,
  rightDistance: null,
  distanceCm: null,
  frontDistanceCm: null,
  leftDistanceCm: null,
  rightDistanceCm: null,
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
  timestamp: undefined,
  isStale: false
};

export const disconnectedDashboard: DashboardSummary = {
  device: {
    deviceId: DEFAULT_DEVICE_ID,
    name: 'Nexus Cane nexus-01',
    status: 'offline',
    firmwareVersion: 'v2.4.1-ai-edge',
    lastSeen: 'Never',
    batteryLevel: 0,
    emergencyContact: '+1 (555) 019-2834'
  },
  latestSensor: disconnectedSensorData,
  recentObstacles: [],
  latestLocation: {
    deviceId: DEFAULT_DEVICE_ID,
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
  activeDeviceId: string;
  setActiveDeviceId: (id: string) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  isDeviceConnected: boolean;
  supabaseConnected: boolean;
  connectionState: ConnectionState;
  dbError: string | null;
  isStale: boolean;
  historyData: SensorHistoryRow[];
  isLoadingHistory: boolean;
  loadHistory: (deviceId?: string) => Promise<void>;
  rawDeviceData: DeviceTelemetryData | null;
  dashboard: DashboardSummary;
  sensorData: SensorDataPayload;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  triggerObstacle: (objName: string, distCm: number, confidence?: number) => void;
  clearObstacle: () => void;
  refreshData: () => Promise<void>;
  simulateAlert: (type: 'vibration' | 'buzzer' | 'emergency_sos') => void;
  saveDeviceTelemetry: (data: Partial<DeviceTelemetryData>) => Promise<void>;
  sendSupabaseTelemetry: (data: any) => Promise<any>;
  triggerSOS: (active: boolean, message?: string) => Promise<void>;
  latestAIDetections: AIDetectionRow[];
  latestAIDetection: AIDetectionRow | null;
  isCameraOnline: boolean;
  triggerCameraCapture: (imageBlobOrBase64: Blob | string) => Promise<any>;
  activeNav: string;
  setActiveNav: (nav: string) => void;
}

const StickDataContext = createContext<StickContextType | undefined>(undefined);

export const StickDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeDeviceId, setActiveDeviceId] = useState<string>(DEFAULT_DEVICE_ID);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isDeviceConnected, setIsDeviceConnected] = useState<boolean>(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [dbError, setDbError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  const [historyData, setHistoryData] = useState<SensorHistoryRow[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Real AI Detections & Verified Camera State
  const [latestAIDetections, setLatestAIDetections] = useState<AIDetectionRow[]>([]);
  const [latestAIDetection, setLatestAIDetection] = useState<AIDetectionRow | null>(null);
  const [isCameraOnline, setIsCameraOnline] = useState<boolean>(false);

  const [rawDeviceData, setRawDeviceData] = useState<DeviceTelemetryData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary>(disconnectedDashboard);
  const [sensorData, setSensorData] = useState<SensorDataPayload>(disconnectedSensorData);
  const [isMuted, setIsMutedState] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<string>('home');

  const setIsMuted = useCallback((val: boolean) => {
    setIsMutedState(val);
    soundSynth.setMuted(val);
  }, []);

  // Helper to process a live sensor database row into typed sensor state
  const processLiveSensorRow = useCallback((row: LiveSensorRow | null) => {
    if (!row) {
      setConnectionState('empty');
      setIsDeviceConnected(false);
      return;
    }

    const frontCm = row.front_distance_cm !== null && row.front_distance_cm !== undefined ? Number(row.front_distance_cm) : null;
    const leftCm = row.left_distance_cm !== null && row.left_distance_cm !== undefined ? Number(row.left_distance_cm) : null;
    const rightCm = row.right_distance_cm !== null && row.right_distance_cm !== undefined ? Number(row.right_distance_cm) : null;
    const primaryCm = frontCm ?? leftCm ?? rightCm ?? null;

    const stale = isTelemetryStale(row.timestamp, 20000);
    setIsStale(stale);
    setConnectionState(stale ? 'stale' : 'connected');
    setIsDeviceConnected(true);
    setSupabaseConnected(true);
    setDbError(null);

    const isSos = row.alert_state === 'sos';
    let alertLevel: 'none' | 'vibration' | 'buzzer' | 'dual' = 'none';
    if (isSos) alertLevel = 'dual';
    else if (row.alert_state === 'dual' || row.alert_state === 'vibration' || row.alert_state === 'buzzer') {
      alertLevel = row.alert_state;
    } else if (primaryCm !== null && primaryCm < 80) {
      alertLevel = 'dual';
    } else if (primaryCm !== null && primaryCm < 150) {
      alertLevel = 'vibration';
    } else if (primaryCm !== null && primaryCm < 200) {
      alertLevel = 'buzzer';
    }

    const camVerified = isCameraVerifiedOnline(row.camera_status, row.updated_at || row.timestamp, 30000);
    setIsCameraOnline(camVerified);

    const updatedSensor: SensorDataPayload = {
      deviceId: row.device_id,
      distance: primaryCm, // in centimetres (e.g. 185 cm)
      frontDistance: frontCm,
      leftDistance: leftCm,
      rightDistance: rightCm,
      distanceCm: primaryCm,
      frontDistanceCm: frontCm,
      leftDistanceCm: leftCm,
      rightDistanceCm: rightCm,
      object: isSos ? 'EMERGENCY SOS' : (row.obstacle_level === 'critical' ? 'Obstacle Hazard' : (primaryCm !== null && primaryCm < 150 ? 'Obstacle Detected' : 'Clear Corridor')),
      confidence: 0.98,
      latitude: row.gps_latitude,
      longitude: row.gps_longitude,
      gpsStatus: row.gps_status || (row.gps_latitude ? 'fix_3d' : 'no_fix'),
      simStatus: row.sim_status || 'connected',
      esp32CamStatus: camVerified ? 'online' : 'offline',
      obstacleStatus: row.obstacle_level || 'clear',
      sosStatus: isSos ? 'triggered' : 'normal',
      battery: row.battery_percentage ?? null,
      alert: alertLevel,
      timestamp: row.timestamp || new Date().toISOString(),
      isStale: stale
    };

    setSensorData(updatedSensor);
    setRawDeviceData({
      deviceId: row.device_id,
      frontDistance: frontCm,
      leftDistance: leftCm,
      rightDistance: rightCm,
      latitude: row.gps_latitude,
      longitude: row.gps_longitude,
      gpsStatus: row.gps_status || 'connected',
      simStatus: row.sim_status || 'connected',
      esp32CamStatus: camVerified ? 'online' : 'offline',
      obstacleStatus: row.obstacle_level || 'clear',
      sosStatus: isSos ? 'triggered' : 'normal',
      batteryLevel: row.battery_percentage ?? null,
      battery: row.battery_percentage ?? null,
      lastUpdated: row.timestamp || new Date().toISOString(),
      isOnline: !stale
    });

    setDashboard(prev => ({
      ...prev,
      device: {
        ...prev.device,
        deviceId: row.device_id,
        name: `Nexus Cane ${row.device_id}`,
        status: stale ? 'standby' : 'online',
        batteryLevel: updatedSensor.battery ?? prev.device.batteryLevel,
        lastSeen: row.timestamp || new Date().toISOString()
      },
      latestSensor: updatedSensor,
      latestLocation: {
        deviceId: row.device_id,
        latitude: row.gps_latitude ?? 0,
        longitude: row.gps_longitude ?? 0,
        timestamp: row.timestamp || new Date().toISOString()
      }
    }));

    if (isSos) {
      soundSynth.playHazardBuzzer();
    } else if (primaryCm !== null && primaryCm < 100) {
      soundSynth.playSonarPing(primaryCm / 100);
    }
  }, []);

  // Fetch chronological history
  const loadHistory = useCallback(async (deviceId: string = activeDeviceId) => {
    setIsLoadingHistory(true);
    try {
      const records = await fetchSensorHistoryChronological(deviceId, 30);
      setHistoryData(records);
    } catch (err: any) {
      console.warn('[StickDataContext] Error loading chronological sensor history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [activeDeviceId]);

  // Initial load and Realtime subscriptions
  useEffect(() => {
    if (isDemoMode) {
      setDashboard(defaultDemoDashboard);
      setSensorData(defaultDemoDashboard.latestSensor);
      setIsDeviceConnected(true);
      setConnectionState('connected');
      setIsStale(false);
      return;
    }

    setConnectionState('loading');
    setDbError(null);

    // 1. Load initial records for nexus-01
    let isSubscribed = true;

    Promise.all([
      fetchLatestLiveSensor(activeDeviceId),
      fetchDeviceDetails(activeDeviceId),
      loadHistory(activeDeviceId)
    ]).then(([{ data: liveData, error: liveError }, { data: devData, error: devError }]) => {
      if (!isSubscribed) return;

      if (liveError || devError) {
        const errorMsg = (liveError || devError)?.message || 'Database connection error';
        setDbError(errorMsg);
        setConnectionState('error');
        return;
      }

      if (devData) {
        setDashboard(prev => ({
          ...prev,
          device: {
            ...prev.device,
            deviceId: devData.device_id,
            name: devData.name || `Nexus Cane ${devData.device_id}`,
            status: devData.status as any || 'online',
            firmwareVersion: devData.firmware_version || prev.device.firmwareVersion,
            batteryLevel: devData.battery_level ? Number(devData.battery_level) : prev.device.batteryLevel,
            emergencyContact: devData.emergency_contact || prev.device.emergencyContact,
            lastSeen: devData.last_seen || prev.device.lastSeen
          }
        }));
      }

      if (liveData) {
        processLiveSensorRow(liveData);
      } else {
        setConnectionState('empty');
      }
    }).catch(err => {
      if (!isSubscribed) return;
      setDbError(err.message || 'Failed to initialize device data');
      setConnectionState('error');
    });

    // 2. Subscribe to Supabase Realtime changes (INSERT and UPDATE)
    const unsubscribeLive = subscribeToSupabaseLiveSensor(
      activeDeviceId,
      (newRow) => {
        if (!isSubscribed) return;
        processLiveSensorRow(newRow);

        // Also append/refresh chronological history when new row arrives
        setHistoryData(prev => {
          const exists = prev.some(item => item.id === newRow.id || (item.timestamp === newRow.timestamp && item.front_distance_cm === newRow.front_distance_cm));
          if (!exists) {
            const historyItem: SensorHistoryRow = {
              id: newRow.id || Date.now(),
              device_id: newRow.device_id,
              left_distance_cm: newRow.left_distance_cm,
              front_distance_cm: newRow.front_distance_cm,
              right_distance_cm: newRow.right_distance_cm,
              obstacle_level: newRow.obstacle_level,
              gps_latitude: newRow.gps_latitude,
              gps_longitude: newRow.gps_longitude,
              battery_voltage: newRow.battery_voltage,
              battery_percentage: newRow.battery_percentage,
              timestamp: newRow.timestamp
            };
            return [...prev.slice(-29), historyItem];
          }
          return prev;
        });
      },
      (err) => {
        if (!isSubscribed) return;
        console.warn('[Supabase Realtime] subscriber notice:', err);
        setDbError(err.message);
        setConnectionState('error');
      },
      (status) => {
        if (!isSubscribed) return;
        if (status === 'SUBSCRIBED') {
          setSupabaseConnected(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnectionState('disconnected');
        }
      }
    );

    // 3. Subscribe to safety alerts
    const unsubscribeAlerts = subscribeToSupabaseAlerts(
      activeDeviceId, 
      (alert) => {
        if (!isSubscribed) return;
        setDashboard(prev => ({
          ...prev,
          recentAlerts: [
            {
              _id: `alt-sb-${alert.id}`,
              id: String(alert.id),
              deviceId: alert.device_id,
              type: alert.type as any,
              severity: alert.severity as any,
              message: alert.message,
              timestamp: alert.timestamp,
              acknowledged: alert.acknowledged
            },
            ...prev.recentAlerts.slice(0, 9)
          ]
        }));
        if (alert.severity === 'critical' || alert.type === 'sos') {
          soundSynth.playHazardBuzzer();
        }
      },
      (err) => {
        if (!isSubscribed) return;
        console.warn('[Supabase Realtime Alerts] notice:', err);
      }
    );

    // 4. Load initial AI detections from Supabase
    fetchLatestAIDetections(activeDeviceId, 5).then((records) => {
      if (!isSubscribed) return;
      if (records && records.length > 0) {
        setLatestAIDetections(records);
        setLatestAIDetection(records[0]);
        if (records[0].timestamp && isCameraVerifiedOnline('online', records[0].timestamp, 30000)) {
          setIsCameraOnline(true);
        }
      }
    });

    // 5. Subscribe to real-time AI Detections
    const unsubscribeAIDetections = subscribeToSupabaseAIDetections(
      activeDeviceId,
      (newDetection) => {
        if (!isSubscribed) return;
        setLatestAIDetection(newDetection);
        setLatestAIDetections(prev => [newDetection, ...prev.filter(d => d.id !== newDetection.id).slice(0, 9)]);
        setIsCameraOnline(true);
        if (newDetection.label && (newDetection.label.includes('CRITICAL') || newDetection.label.includes('HAZARD'))) {
          soundSynth.playHazardBuzzer();
        }
      },
      (err) => {
        if (!isSubscribed) return;
        console.warn('[Supabase Realtime AI Detections] notice:', err);
      }
    );

    // 6. Teardown / cleanup on component unmount
    return () => {
      isSubscribed = false;
      unsubscribeLive();
      unsubscribeAlerts();
      unsubscribeAIDetections();
    };
  }, [isDemoMode, activeDeviceId, processLiveSensorRow, loadHistory]);

  // Periodic staleness monitor
  useEffect(() => {
    if (isDemoMode) return;

    const interval = setInterval(() => {
      if (sensorData.timestamp) {
        const stale = isTelemetryStale(sensorData.timestamp, 20000);
        setIsStale(stale);
        setConnectionState(prev => {
          if (prev === 'connected' && stale) return 'stale';
          if (prev === 'stale' && !stale) return 'connected';
          return prev;
        });
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isDemoMode, sensorData.timestamp]);

  // Demo simulator loop (ONLY runs if user manually activated Demo mode)
  useEffect(() => {
    if (!isDemoMode) return;

    const interval = setInterval(() => {
      const currentDistM = (sensorData.distance ?? 180) / 100;
      const next = generateDemoSensorData(currentDistM);
      // Map to cm
      const nextCm: SensorDataPayload = {
        ...next,
        distance: next.distance !== null ? Math.round(next.distance * 100) : null,
        frontDistance: next.frontDistance !== null && next.frontDistance !== undefined ? Math.round(next.frontDistance * 100) : null,
        leftDistance: next.leftDistance !== null && next.leftDistance !== undefined ? Math.round(next.leftDistance * 100) : null,
        rightDistance: next.rightDistance !== null && next.rightDistance !== undefined ? Math.round(next.rightDistance * 100) : null,
        distanceCm: next.distance !== null ? Math.round(next.distance * 100) : null,
        frontDistanceCm: next.frontDistance !== null && next.frontDistance !== undefined ? Math.round(next.frontDistance * 100) : null,
        leftDistanceCm: next.leftDistance !== null && next.leftDistance !== undefined ? Math.round(next.leftDistance * 100) : null,
        rightDistanceCm: next.rightDistance !== null && next.rightDistance !== undefined ? Math.round(next.rightDistance * 100) : null,
      };

      setSensorData(nextCm);
      setDashboard(prev => ({
        ...prev,
        latestSensor: nextCm,
        device: {
          ...prev.device,
          status: 'online',
          lastSeen: new Date().toISOString()
        }
      }));

      if (nextCm.distance && nextCm.distance < 100) {
        soundSynth.playSonarPing(nextCm.distance / 100);
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
    setConnectionState('loading');
    setDbError(null);
    try {
      const [{ data: liveData, error: liveError }, { data: devData, error: devError }] = await Promise.all([
        fetchLatestLiveSensor(activeDeviceId),
        fetchDeviceDetails(activeDeviceId),
        loadHistory(activeDeviceId)
      ]);

      if (liveError || devError) {
        setDbError((liveError || devError)?.message || 'Refresh failed');
        setConnectionState('error');
        return;
      }

      if (devData) {
        setDashboard(prev => ({
          ...prev,
          device: {
            ...prev.device,
            status: devData.status as any || 'online',
            batteryLevel: devData.battery_level ? Number(devData.battery_level) : prev.device.batteryLevel,
            lastSeen: devData.last_seen || prev.device.lastSeen
          }
        }));
      }

      if (liveData) {
        processLiveSensorRow(liveData);
      } else {
        setConnectionState('empty');
      }
    } catch (err: any) {
      setDbError(err.message || 'Error refreshing data');
      setConnectionState('error');
    }
  }, [isDemoMode, activeDeviceId, processLiveSensorRow, loadHistory]);

  // Save device telemetry via Supabase Edge Function
  const saveDeviceTelemetry = useCallback(async (data: Partial<DeviceTelemetryData>) => {
    const isSos = Boolean(data.sosStatus === 'triggered' || data.sosStatus === 'active' || data.sosStatus === true);

    await sendTelemetryToEdgeFunction({
      deviceId: data.deviceId || activeDeviceId,
      frontDistance: data.frontDistance ?? undefined,
      leftDistance: data.leftDistance ?? undefined,
      rightDistance: data.rightDistance ?? undefined,
      latitude: data.latitude ?? undefined,
      longitude: data.longitude ?? undefined,
      battery: data.batteryLevel ?? data.battery ?? undefined,
      alert: isSos ? 'sos' : (data.alert || 'none'),
      obstacleLevel: isSos ? 'critical' : (data.obstacleStatus || 'clear'),
      gpsStatus: data.gpsStatus,
      simStatus: data.simStatus,
      cameraStatus: data.esp32CamStatus
    });
  }, [activeDeviceId]);

  // Trigger SOS via Supabase Edge Function
  const triggerSOS = useCallback(async (active: boolean) => {
    await sendTelemetryToEdgeFunction({
      deviceId: activeDeviceId,
      alert: active ? 'sos' : 'none',
      obstacleLevel: active ? 'critical' : 'clear'
    });
    if (active) {
      soundSynth.playHazardBuzzer();
    }
  }, [activeDeviceId]);

  // Trigger Obstacle for testing via Supabase Edge Function
  const triggerObstacle = useCallback((objName: string, distCm: number, confidence: number = 0.96) => {
    const alertType = distCm < 90 ? 'dual' : distCm < 160 ? 'vibration' : 'buzzer';
    const newSensor: SensorDataPayload = {
      deviceId: activeDeviceId,
      distance: distCm,
      frontDistance: distCm,
      leftDistance: distCm > 100 ? distCm - 20 : distCm,
      rightDistance: distCm > 100 ? distCm + 30 : distCm,
      distanceCm: distCm,
      frontDistanceCm: distCm,
      leftDistanceCm: distCm > 100 ? distCm - 20 : distCm,
      rightDistanceCm: distCm > 100 ? distCm + 30 : distCm,
      object: objName,
      confidence,
      latitude: 11.0168,
      longitude: 76.9558,
      battery: 82,
      alert: alertType,
      timestamp: new Date().toISOString(),
      isStale: false
    };

    const newObstacle: ObstacleRecord = {
      id: `obs-${Date.now()}`,
      deviceId: activeDeviceId,
      label: objName,
      distance: distCm / 100,
      confidence,
      dangerLevel: distCm < 100 ? 'high' : distCm < 180 ? 'medium' : 'low',
      boundingBox: { x: 28, y: 15, width: 44, height: 70 },
      detectedAt: new Date().toISOString()
    };

    const newAlert: AlertRecord = {
      id: `al-${Date.now()}`,
      deviceId: activeDeviceId,
      type: alertType === 'dual' ? 'buzzer' : (alertType as 'vibration' | 'buzzer'),
      severity: distCm < 100 ? 'critical' : 'warning',
      message: `Direct warning: ${objName.toUpperCase()} detected at ${distCm}cm`,
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

    sendTelemetryToEdgeFunction({
      deviceId: activeDeviceId,
      frontDistance: distCm,
      obstacleLevel: distCm < 100 ? 'critical' : distCm < 180 ? 'warning' : 'clear',
      alert: alertType === 'dual' ? 'dual' : alertType
    }).catch(console.warn);

    if (distCm < 100) {
      soundSynth.playHazardBuzzer();
    } else {
      soundSynth.playSonarPing(distCm / 100);
    }
  }, [activeDeviceId]);

  const clearObstacle = useCallback(() => {
    const clearSensor: SensorDataPayload = {
      deviceId: activeDeviceId,
      distance: 350,
      frontDistance: 350,
      leftDistance: 350,
      rightDistance: 350,
      distanceCm: 350,
      frontDistanceCm: 350,
      leftDistanceCm: 350,
      rightDistanceCm: 350,
      object: 'clear path',
      confidence: 0.99,
      latitude: 11.0168,
      longitude: 76.9558,
      battery: 82,
      alert: 'none',
      timestamp: new Date().toISOString(),
      isStale: false
    };
    setSensorData(clearSensor);
    setDashboard(prev => ({
      ...prev,
      latestSensor: clearSensor
    }));

    sendTelemetryToEdgeFunction({
      deviceId: activeDeviceId,
      frontDistance: 350,
      leftDistance: 350,
      rightDistance: 350,
      obstacleLevel: 'clear',
      alert: 'none'
    }).catch(console.warn);

    soundSynth.playClick();
  }, [activeDeviceId]);

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
      sendTelemetryToEdgeFunction({
        deviceId: activeDeviceId,
        alert: 'sos',
        obstacleLevel: 'critical'
      }).catch(console.warn);
    }
  }, [activeDeviceId]);

  const sendSupabaseTelemetry = useCallback(async (data: any) => {
    return await sendTelemetryToEdgeFunction(data);
  }, []);

  const triggerCameraCapture = useCallback(async (imageBlobOrBase64: Blob | string) => {
    try {
      const res = await sendCameraFrameCapture(imageBlobOrBase64, activeDeviceId);
      setIsCameraOnline(true);
      return res;
    } catch (err) {
      console.error('[StickDataContext] triggerCameraCapture error:', err);
      throw err;
    }
  }, [activeDeviceId]);

  return (
    <StickDataContext.Provider
      value={{
        activeDeviceId,
        setActiveDeviceId,
        isDemoMode,
        setIsDemoMode,
        isDeviceConnected,
        supabaseConnected,
        connectionState,
        dbError,
        isStale,
        historyData,
        isLoadingHistory,
        loadHistory,
        rawDeviceData,
        dashboard,
        sensorData,
        latestAIDetections,
        latestAIDetection,
        isCameraOnline,
        triggerCameraCapture,
        isMuted,
        setIsMuted,
        triggerObstacle,
        clearObstacle,
        refreshData,
        simulateAlert,
        saveDeviceTelemetry,
        sendSupabaseTelemetry,
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
