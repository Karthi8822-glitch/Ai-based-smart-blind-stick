import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import { 
  getDatabase, 
  Database, 
  ref, 
  set, 
  update, 
  get, 
  onValue, 
  off, 
  serverTimestamp as rtdbServerTimestamp 
} from 'firebase/database';
import { DeviceTelemetryData } from '../types';

/**
 * Reusable Firebase Web App Configuration
 * Reads from Vite environment variables (VITE_FIREBASE_*) with safe client fallback defaults.
 * NOTE: Only client-safe public keys are included. NEVER expose Service Account Private Keys here.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDIX7BLpqm_fbckfNAyk6VJiSNPnF0Moek',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'nexus-smart-blind-stick.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://nexus-smart-blind-stick-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'nexus-smart-blind-stick',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'nexus-smart-blind-stick.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '358098381158',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:358098381158:web:0d69b8750108e55f9fc0a7',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-TMTPDCKR2W'
};

// Initialize or reuse Firebase App singleton instance
export const app: FirebaseApp = getApps().length === 0 
  ? initializeApp(firebaseConfig) 
  : getApp();

// Connect explicitly to Firebase Realtime Database using the actual database URL
export const rtdb: Database = getDatabase(app, firebaseConfig.databaseURL);

// Initialize optional Analytics in browser environments
let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(app);
      }
    })
    .catch((err) => {
      console.warn('[Firebase Analytics] Not available in this environment:', err);
    });
}
export const analytics = analyticsInstance;

// Reference to the canonical /device root path in Realtime Database
const DEVICE_PATH = 'device';
export const deviceRef = ref(rtdb, DEVICE_PATH);

/**
 * 1. Subscribe to real-time updates from the `/device` path.
 * Returns an unsubscribe teardown function.
 *
 * @param callback Called whenever fresh telemetry is written under `/device`
 * @param onError Callback for database read errors (e.g. permission denied)
 */
export function subscribeToDeviceData(
  callback: (data: DeviceTelemetryData | null) => void,
  onError?: (error: Error) => void
): () => void {
  const listener = onValue(
    deviceRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val() as DeviceTelemetryData;
        callback(val);
      } else {
        // No device data published yet
        callback(null);
      }
    },
    (error) => {
      console.error('[Firebase RTDB] Error listening to /device:', error);
      if (onError) onError(error);
    }
  );

  // Return unsubscribe cleanup function
  return () => {
    off(deviceRef, 'value', listener);
  };
}

/**
 * 2. Read current `/device` data once (one-shot fetch).
 */
export async function getDeviceDataOnce(): Promise<DeviceTelemetryData | null> {
  try {
    const snapshot = await get(deviceRef);
    if (snapshot.exists()) {
      return snapshot.val() as DeviceTelemetryData;
    }
    return null;
  } catch (error) {
    console.error('[Firebase RTDB] Failed to read /device once:', error);
    throw error;
  }
}

/**
 * 3. Overwrite/save complete device payload under `/device`.
 * Includes left, front, right distances, GPS, SIM, ESP32-CAM, obstacle, and SOS status.
 */
export async function saveDeviceData(data: Partial<DeviceTelemetryData>): Promise<void> {
  try {
    const payload: DeviceTelemetryData = {
      leftDistance: data.leftDistance ?? null,
      frontDistance: data.frontDistance ?? null,
      rightDistance: data.rightDistance ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      gpsStatus: data.gpsStatus || 'offline',
      simStatus: data.simStatus || 'offline',
      esp32CamStatus: data.esp32CamStatus || 'offline',
      obstacleStatus: data.obstacleStatus || 'clear',
      sosStatus: data.sosStatus || 'normal',
      batteryLevel: data.batteryLevel ?? data.battery ?? null,
      battery: data.battery ?? data.batteryLevel ?? null,
      lastUpdated: new Date().toISOString(),
      deviceId: data.deviceId || 'NEXUS-SBS-001',
      isOnline: data.isOnline ?? true,
      ...data
    };

    await set(deviceRef, payload);
  } catch (error) {
    console.error('[Firebase RTDB] Failed to save device data:', error);
    throw error;
  }
}

/**
 * 4. Partially update specific fields under `/device`.
 */
export async function updateDeviceTelemetry(partialData: Partial<DeviceTelemetryData>): Promise<void> {
  try {
    const updates = {
      ...partialData,
      lastUpdated: new Date().toISOString()
    };
    await update(deviceRef, updates);
  } catch (error) {
    console.error('[Firebase RTDB] Failed to update telemetry:', error);
    throw error;
  }
}

/**
 * 5. Trigger or clear SOS emergency status under `/device`.
 */
export async function setDeviceSOS(active: boolean, alertMessage?: string): Promise<void> {
  try {
    await update(deviceRef, {
      sosStatus: active ? 'triggered' : 'normal',
      sosMessage: alertMessage || (active ? 'EMERGENCY SOS DISPATCHED' : 'NORMAL'),
      sosTimestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Firebase RTDB] Failed to set SOS state:', error);
    throw error;
  }
}

export default {
  app,
  rtdb,
  analytics,
  firebaseConfig,
  deviceRef,
  subscribeToDeviceData,
  getDeviceDataOnce,
  saveDeviceData,
  updateDeviceTelemetry,
  setDeviceSOS
};
