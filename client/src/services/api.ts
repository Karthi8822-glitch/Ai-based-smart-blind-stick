import { 
  SensorDataPayload, 
  DeviceInfo, 
  ObstacleRecord, 
  LocationRecord, 
  AlertRecord, 
  DashboardSummary,
  RoboflowInferenceResponse,
  VisionSample
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Realistic Fallback / Mock Data Generator for when backend is offline or Demo Mode is toggled
export const generateDemoSensorData = (prevDistance: number = 1.8): SensorDataPayload => {
  // subtle drift or scenario jumps
  const objects = ['person', 'pedestrian', 'bench', 'bicycle', 'staircase', 'curb', 'wall'];
  const chosenObj = objects[Math.floor(Math.random() * objects.length)];
  const distance = Math.max(0.4, Math.min(3.8, Number((prevDistance + (Math.random() * 0.4 - 0.2)).toFixed(1))));
  
  let alert: 'none' | 'vibration' | 'buzzer' | 'dual' = 'none';
  if (distance < 0.8) alert = 'dual';
  else if (distance < 1.5) alert = 'vibration';
  else if (distance < 2.0) alert = 'buzzer';

  return {
    deviceId: 'SBS-001',
    distance,
    object: chosenObj,
    confidence: Number((0.92 + Math.random() * 0.07).toFixed(2)),
    latitude: 11.0168 + (Math.random() * 0.0004 - 0.0002),
    longitude: 76.9558 + (Math.random() * 0.0004 - 0.0002),
    battery: 82,
    alert,
    timestamp: new Date().toISOString()
  };
};

export const defaultDemoDashboard: DashboardSummary = {
  device: {
    deviceId: 'SBS-001',
    name: 'Nexus Vision Cane V2',
    status: 'online',
    firmwareVersion: 'v2.4.1-ai-edge',
    lastSeen: new Date().toISOString(),
    batteryLevel: 82,
    emergencyContact: '+1 (555) 019-2834'
  },
  latestSensor: {
    deviceId: 'SBS-001',
    distance: 1.8,
    object: 'person',
    confidence: 0.97,
    latitude: 11.0168,
    longitude: 76.9558,
    battery: 82,
    alert: 'vibration',
    timestamp: new Date().toISOString()
  },
  recentObstacles: [
    {
      id: 'obs-1',
      deviceId: 'SBS-001',
      label: 'Pedestrian Walking',
      distance: 1.8,
      confidence: 0.97,
      dangerLevel: 'medium',
      boundingBox: { x: 35, y: 20, width: 30, height: 65 },
      detectedAt: new Date(Date.now() - 3000).toISOString()
    },
    {
      id: 'obs-2',
      deviceId: 'SBS-001',
      label: 'Granite Planter',
      distance: 2.1,
      confidence: 0.94,
      dangerLevel: 'low',
      boundingBox: { x: 10, y: 55, width: 40, height: 35 },
      detectedAt: new Date(Date.now() - 15000).toISOString()
    },
    {
      id: 'obs-3',
      deviceId: 'SBS-001',
      label: 'Parked Bicycle',
      distance: 2.4,
      confidence: 0.91,
      dangerLevel: 'low',
      boundingBox: { x: 55, y: 40, width: 25, height: 40 },
      detectedAt: new Date(Date.now() - 45000).toISOString()
    }
  ],
  latestLocation: {
    deviceId: 'SBS-001',
    latitude: 11.0168,
    longitude: 76.9558,
    altitude: 432,
    speed: 1.1,
    address: 'Metropolitan Tech Center, 4th Avenue Way',
    timestamp: new Date().toISOString()
  },
  recentAlerts: [
    {
      id: 'al-1',
      deviceId: 'SBS-001',
      type: 'vibration',
      severity: 'warning',
      message: 'Haptic pulse triggered for approaching pedestrian at 1.8m',
      acknowledged: true,
      timestamp: new Date(Date.now() - 4000).toISOString()
    },
    {
      id: 'al-2',
      deviceId: 'SBS-001',
      type: 'buzzer',
      severity: 'info',
      message: 'Sonar pulse: 2.1m obstacle detected on left traversal axis',
      acknowledged: true,
      timestamp: new Date(Date.now() - 22000).toISOString()
    },
    {
      id: 'al-3',
      deviceId: 'SBS-001',
      type: 'vibration',
      severity: 'info',
      message: 'Surface elevation change detected (Step down curb 12cm)',
      acknowledged: true,
      timestamp: new Date(Date.now() - 65000).toISOString()
    }
  ],
  systemHealth: {
    cameraFps: 28,
    sonarLatencyMs: 14,
    inferenceTimeMs: 42,
    signalStrengthDbm: -64
  }
};

// API Service Functions
export const api = {
  // Auth
  async login(email: string, password: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return await res.json();
    } catch {
      // Mock login for offline preview
      return {
        success: true,
        token: 'mock-jwt-token-demo',
        user: { id: 'u1', name: 'Demo Caregiver', email, role: 'caregiver' }
      };
    }
  },

  async register(name: string, email: string, password: string, role: string = 'caregiver') {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      return await res.json();
    } catch {
      return {
        success: true,
        token: 'mock-jwt-token-demo',
        user: { id: 'u1', name, email, role }
      };
    }
  },

  // Device status
  async getDeviceStatus(deviceId: string = 'SBS-001'): Promise<{ success: boolean; data: DeviceInfo }> {
    try {
      const res = await fetch(`${API_BASE_URL}/device/status?deviceId=${deviceId}`);
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch {
      return { success: true, data: defaultDemoDashboard.device };
    }
  },

  async registerDevice(deviceData: Partial<DeviceInfo>) {
    try {
      const res = await fetch(`${API_BASE_URL}/device/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData)
      });
      return await res.json();
    } catch {
      return { success: true, data: { ...defaultDemoDashboard.device, ...deviceData } };
    }
  },

  // Sensor telemetry
  async getLatestSensors(deviceId: string = 'SBS-001'): Promise<{ success: boolean; data: SensorDataPayload }> {
    try {
      const res = await fetch(`${API_BASE_URL}/sensors/latest?deviceId=${deviceId}`);
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch {
      return { success: true, data: generateDemoSensorData() };
    }
  },

  async postSensorData(payload: SensorDataPayload) {
    try {
      const res = await fetch(`${API_BASE_URL}/sensors/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch {
      return { success: true, message: 'Sensor payload recorded (local/demo)' };
    }
  },

  // Obstacles
  async getObstacles(deviceId: string = 'SBS-001', limit: number = 10): Promise<{ success: boolean; data: ObstacleRecord[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/obstacles?deviceId=${deviceId}&limit=${limit}`);
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch {
      return { success: true, data: defaultDemoDashboard.recentObstacles };
    }
  },

  async postObstacle(obstacle: Partial<ObstacleRecord>) {
    try {
      const res = await fetch(`${API_BASE_URL}/obstacles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obstacle)
      });
      return await res.json();
    } catch {
      return { success: true, data: obstacle };
    }
  },

  // Location
  async getLatestLocation(deviceId: string = 'SBS-001'): Promise<{ success: boolean; data: LocationRecord }> {
    try {
      const res = await fetch(`${API_BASE_URL}/location/latest?deviceId=${deviceId}`);
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch {
      return { success: true, data: defaultDemoDashboard.latestLocation };
    }
  },

  // Alerts
  async getAlerts(deviceId: string = 'SBS-001'): Promise<{ success: boolean; data: AlertRecord[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts?deviceId=${deviceId}`);
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch {
      return { success: true, data: defaultDemoDashboard.recentAlerts };
    }
  },

  async postAlert(alert: Partial<AlertRecord>) {
    try {
      const res = await fetch(`${API_BASE_URL}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      });
      return await res.json();
    } catch {
      return { success: true, data: alert };
    }
  },

  // Full unified dashboard
  async getDashboard(deviceId: string = 'SBS-001'): Promise<{ success: boolean; data: DashboardSummary }> {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard?deviceId=${deviceId}`);
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch {
      return { success: true, data: defaultDemoDashboard };
    }
  },

  // Roboflow Multi-Model Vision (pedestrian-viewer/4, vechile-zleex/2, fall-detection-ca3o8/4)
  async inferRoboflow(payload: {
    image?: string;
    sampleName?: string;
    imageUrl?: string;
    modelId?: string;
    syncObstacles?: boolean;
    deviceId?: string;
  }): Promise<{ success: boolean; data: RoboflowInferenceResponse }> {
    try {
      const res = await fetch(`${API_BASE_URL}/vision/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncObstacles: true,
          deviceId: 'SBS-001',
          ...payload,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Inference failed with status ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      console.warn('Backend inference failed, falling back to simulated high-fidelity response:', err.message);
      
      // Fallback for offline demo or unhosted models
      const requestedModel = payload.modelId || 'pedestrian-viewer/4';
      const isSidewalkSample = payload.sampleName === '3.jpg' || !payload.sampleName;

      let fallbackClass = isSidewalkSample ? 'sidewalk' : 'verge';
      let fallbackConfidence = 0.95;
      let fallbackSafety: 'SAFE' | 'CAUTION' | 'CRITICAL' = isSidewalkSample ? 'SAFE' : 'CAUTION';
      let fallbackGuidance = 'Navigable sidewalk detected. Safe walking corridor confirmed.';
      let fallbackSpeech = 'Navigable sidewalk confirmed ahead. Safe to proceed.';
      let fallbackBox = isSidewalkSample
        ? { left: 50.5, top: 51.6, width: 49.4, height: 48.4 }
        : { left: 15.0, top: 40.0, width: 35.0, height: 45.0 };

      if (requestedModel.includes('people-detection')) {
        fallbackClass = 'person';
        fallbackConfidence = 0.912;
        fallbackSafety = 'CAUTION';
        fallbackGuidance = 'Pedestrian detected ahead at ~1.8m.';
        fallbackSpeech = 'Caution: Pedestrian detected ahead at 1.8 meters.';
        fallbackBox = { left: 38.0, top: 22.0, width: 24.0, height: 68.0 };
      } else if (requestedModel.includes('object-detection')) {
        fallbackClass = 'barrier';
        fallbackConfidence = 0.887;
        fallbackSafety = 'CAUTION';
        fallbackGuidance = 'Low-level obstacle barrier detected ahead at ~1.4m.';
        fallbackSpeech = 'Caution: Barrier detected ahead at 1.4 meters.';
        fallbackBox = { left: 42.0, top: 45.0, width: 28.0, height: 35.0 };
      } else if (requestedModel.includes('vechile')) {
        fallbackClass = 'Truck';
        fallbackConfidence = 0.745;
        fallbackSafety = 'CRITICAL';
        fallbackGuidance = 'Traffic hazard: Vehicle detected ahead at ~1.2m. Stand clear!';
        fallbackSpeech = 'Warning: Vehicle detected at 1.2 meters. Stay alert!';
        fallbackBox = { left: 18.0, top: 15.0, width: 45.0, height: 65.0 };
      } else if (requestedModel.includes('fall-detection')) {
        fallbackClass = 'clear';
        fallbackSafety = 'SAFE';
        fallbackGuidance = 'Normal traversal posture verified. No fall incident detected.';
        fallbackSpeech = 'Path clear. No fall incidents detected.';
      }

      const hasPreds = !requestedModel.includes('fall-detection');

      return {
        success: true,
        data: {
          inferenceId: `inf-sim-${Date.now()}`,
          model: requestedModel,
          processingTimeMs: 42,
          imageDimensions: { width: 2752, height: 1536 },
          predictionsCount: hasPreds ? 1 : 0,
          predictions: hasPreds
            ? [
                {
                  id: 'pred-sim-1',
                  class: fallbackClass,
                  confidence: fallbackConfidence,
                  x: 1200,
                  y: 800,
                  width: 500,
                  height: 600,
                  safetyStatus: fallbackSafety,
                  estimatedDistance: 1.8,
                  guidanceText: fallbackGuidance,
                  boxPercent: fallbackBox,
                  mask_format: 'polygon',
                },
              ]
            : [],
          summary: {
            hasObstacles: fallbackSafety === 'CRITICAL' || fallbackSafety === 'CAUTION',
            hasNavigablePath: isSidewalkSample && fallbackSafety === 'SAFE',
            primarySafetyStatus: fallbackSafety,
            speechAnnouncement: fallbackSpeech,
          },
          raw: {
            inference_id: `inf-sim-${Date.now()}`,
            time: 0.042,
            predictions: [],
          },
        },
      };
    }
  },

  async getVisionSamples(): Promise<{ success: boolean; data: VisionSample[] }> {
    try {
      const res = await fetch(`${API_BASE_URL}/vision/samples`);
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch {
      return {
        success: true,
        data: [
          {
            id: 'sample-3',
            filename: '3.jpg',
            title: 'Sidewalk Traversal & Path Margin',
            description: 'Primary urban walkway scene featuring concrete pavement, curb boundary, and open walking corridor.',
            category: 'Sidewalk / Path Navigation',
            imageUrl: '/assets/3.jpg',
            expectedClasses: ['sidewalk', 'verge'],
          },
          {
            id: 'sample-1',
            filename: 'road-crossing.jpg',
            title: 'Pedestrian Crossing & Street Traversal',
            description: 'Ground-level path scanning along sidewalk edge and asphalt transition zone.',
            category: 'Corridor Inspection',
            imageUrl: '/assets/road-crossing.jpg',
            expectedClasses: ['sidewalk', 'curb'],
          },
          {
            id: 'sample-2',
            filename: 'walking-on-stairs.jpg',
            title: 'Walking on Stairs',
            description: 'Staircase descent and elevation changes with step edge and handrail scanning.',
            category: 'Elevation Transition',
            imageUrl: '/assets/walking-on-stairs.jpg',
            expectedClasses: ['obstacle', 'staircase'],
          },
          {
            id: 'frame-001',
            filename: 'detecting-pothole.jpg',
            title: 'Detecting pothole',
            description: 'Surface pothole and fractured asphalt scanning for ground elevation and terrain safety.',
            category: 'Surface Hazard',
            imageUrl: '/assets/detecting-pothole.jpg',
            expectedClasses: ['obstacle', 'pothole'],
          },
        ],
      };
    }
  },

  async getVisionStatus(): Promise<{
    success: boolean;
    model: string;
    backend: string;
    endpoint: string;
    type: string;
    authConfigured: boolean;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/vision/status`);
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch {
      return {
        success: true,
        model: 'pedestrian-viewer/4',
        backend: 'Roboflow Serverless Cloud API (v1.5.0+)',
        endpoint: 'https://serverless.roboflow.com/pedestrian-viewer/4',
        type: 'Instance Segmentation',
        authConfigured: true,
      };
    }
  },

  async getLatestVisionDetection(deviceId: string = 'nexus-01'): Promise<{
    success: boolean;
    data: any;
  }> {
    try {
      const res = await fetch(`${API_BASE_URL}/vision/latest?deviceId=${encodeURIComponent(deviceId)}`);
      if (!res.ok) throw new Error('API fetch failed');
      return await res.json();
    } catch {
      return { success: false, data: null };
    }
  },
};
