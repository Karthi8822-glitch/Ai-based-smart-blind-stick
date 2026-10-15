export interface SensorDataPayload {
  deviceId: string;
  distance: number | null; // in meters (e.g. 1.8), null when disconnected
  leftDistance?: number | null;
  rightDistance?: number | null;
  frontDistance?: number | null;
  object: string; // e.g. "person", "chair", "wall", "stairs", "bicycle", "none"
  confidence: number; // 0 to 1 (e.g. 0.97)
  latitude: number | null;
  longitude: number | null;
  gpsStatus?: 'connected' | 'searching' | 'no_fix' | 'offline' | string;
  simStatus?: 'connected' | 'roaming' | 'no_sim' | 'offline' | string;
  esp32CamStatus?: 'online' | 'streaming' | 'offline' | 'error' | string;
  obstacleStatus?: 'clear' | 'detected' | 'caution' | 'critical' | string;
  sosStatus?: 'normal' | 'triggered' | 'active' | boolean | string;
  battery: number | null; // percentage 0 - 100, null when disconnected
  alert: 'none' | 'vibration' | 'buzzer' | 'dual' | string;
  timestamp?: string | Date;
}

export interface DeviceTelemetryData {
  leftDistance: number | null;
  frontDistance: number | null;
  rightDistance: number | null;
  latitude: number | null;
  longitude: number | null;
  gpsStatus: 'connected' | 'searching' | 'no_fix' | 'offline' | string;
  simStatus: 'connected' | 'roaming' | 'no_sim' | 'offline' | string;
  esp32CamStatus: 'online' | 'streaming' | 'offline' | 'error' | string;
  obstacleStatus: 'clear' | 'detected' | 'caution' | 'critical' | string;
  sosStatus: 'normal' | 'triggered' | 'active' | boolean | string;
  batteryLevel?: number | null;
  battery?: number | null;
  lastUpdated?: string | number | null;
  deviceId?: string;
  isOnline?: boolean;
  [key: string]: any;
}

export interface DeviceInfo {
  deviceId: string;
  name: string;
  status: 'online' | 'offline' | 'standby';
  firmwareVersion: string;
  lastSeen: string;
  batteryLevel: number;
  ownerId?: string;
  emergencyContact?: string;
}

export interface ObstacleRecord {
  id?: string;
  _id?: string;
  deviceId: string;
  label: string;
  distance: number;
  confidence: number;
  dangerLevel: 'low' | 'medium' | 'high';
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  detectedAt: string;
}

export interface LocationRecord {
  deviceId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  address?: string;
  timestamp: string;
}

export interface AlertRecord {
  id?: string;
  _id?: string;
  deviceId: string;
  type: 'vibration' | 'buzzer' | 'emergency_sos' | 'fall_detection' | 'low_battery';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  acknowledged: boolean;
  timestamp: string;
}

export interface DashboardSummary {
  device: DeviceInfo;
  latestSensor: SensorDataPayload;
  recentObstacles: ObstacleRecord[];
  latestLocation: LocationRecord;
  recentAlerts: AlertRecord[];
  systemHealth: {
    cameraFps: number;
    sonarLatencyMs: number;
    inferenceTimeMs: number;
    signalStrengthDbm: number;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'caregiver' | 'user' | 'researcher' | 'admin';
  assignedDeviceId?: string;
  token?: string;
}

// Roboflow Instance Segmentation Perception Types
export interface RoboflowPrediction {
  id: string;
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  safetyStatus: 'SAFE' | 'CAUTION' | 'CRITICAL';
  estimatedDistance: number;
  guidanceText: string;
  boxPercent: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  pointsPercent?: Array<{ x: number; y: number }>;
  points?: Array<{ x: number; y: number }>;
  mask_format?: string;
  class_id?: number;
  detection_id?: string;
}

export interface RoboflowInferenceResponse {
  inferenceId: string;
  model: string;
  processingTimeMs: number;
  imageDimensions: {
    width: number;
    height: number;
  };
  predictionsCount: number;
  predictions: RoboflowPrediction[];
  summary: {
    hasObstacles: boolean;
    hasNavigablePath: boolean;
    primarySafetyStatus: 'SAFE' | 'CAUTION' | 'CRITICAL';
    speechAnnouncement: string;
  };
  raw: any;
}

export interface VisionSample {
  id: string;
  filename: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  expectedClasses: string[];
}
