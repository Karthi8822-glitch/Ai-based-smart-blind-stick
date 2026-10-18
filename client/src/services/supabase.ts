import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fddbbkssiforahktwcnp.supabase.co';
export const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'sb_publishable_eCu2svQDFV71vi4D4QBuDg_PVDf-wPT';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export type LiveSensorRow = Database['public']['Tables']['live_sensor_data']['Row'];
export type AlertRow = Database['public']['Tables']['alerts']['Row'];
export type DeviceRow = Database['public']['Tables']['devices']['Row'];
export type SensorHistoryRow = Database['public']['Tables']['sensor_history']['Row'];
export type AIDetectionRow = Database['public']['Tables']['ai_detections']['Row'];

export const DEFAULT_DEVICE_ID = 'nexus-01';

/**
 * Helper to check if a telemetry timestamp is considered stale.
 * Default staleness threshold is 20 seconds.
 */
export const isTelemetryStale = (
  timestamp?: string | Date | null,
  thresholdMs: number = 20000
): boolean => {
  if (!timestamp) return true;
  const time = new Date(timestamp).getTime();
  if (isNaN(time)) return true;
  return Date.now() - time > thresholdMs;
};

/**
 * Fetch the latest live sensor record for the specified device (default: nexus-01).
 */
export const fetchLatestLiveSensor = async (
  deviceId: string = DEFAULT_DEVICE_ID
): Promise<{ data: LiveSensorRow | null; error: Error | null }> => {
  try {
    const targetId = deviceId.trim();
    const { data, error } = await supabase
      .from('live_sensor_data')
      .select('*')
      .ilike('device_id', targetId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
};

/**
 * Fetch device record for the specified device.
 */
export const fetchDeviceDetails = async (
  deviceId: string = DEFAULT_DEVICE_ID
): Promise<{ data: DeviceRow | null; error: Error | null }> => {
  try {
    const targetId = deviceId.trim();
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .ilike('device_id', targetId)
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
};

/**
 * 1. Subscribe to Live Sensor Data updates via Supabase Realtime
 * Subscribes to INSERT and UPDATE changes on the `live_sensor_data` table.
 * Automatically loads the latest record on initial subscribe.
 */
export const subscribeToSupabaseLiveSensor = (
  deviceId: string = DEFAULT_DEVICE_ID,
  onUpdate: (payload: LiveSensorRow) => void,
  onError?: (err: Error) => void,
  onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR' | string) => void
): (() => void) => {
  const targetId = deviceId.trim();
  const lowerId = targetId.toLowerCase();
  const upperId = targetId.toUpperCase();
  const channelName = `realtime:live_sensor:${lowerId}-${Date.now()}`;

  // Step 1: Fetch initial state immediately on mount
  fetchLatestLiveSensor(targetId).then(({ data, error }) => {
    if (error && onError) {
      onError(error);
    } else if (data) {
      onUpdate(data);
    }
  });

  // Step 2: Subscribe to live INSERT and UPDATE changes
  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'live_sensor_data',
        filter: lowerId === upperId ? `device_id=eq.${lowerId}` : `device_id=in.(${lowerId},${upperId})`,
      },
      (payload) => {
        if (payload.new) {
          onUpdate(payload.new as LiveSensorRow);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_sensor_data',
        filter: lowerId === upperId ? `device_id=eq.${lowerId}` : `device_id=in.(${lowerId},${upperId})`,
      },
      (payload) => {
        if (payload.new) {
          onUpdate(payload.new as LiveSensorRow);
        }
      }
    )
    .subscribe((status) => {
      if (onStatusChange) {
        onStatusChange(status);
      }
      if (status === 'CHANNEL_ERROR' && onError) {
        onError(new Error(`Supabase Realtime channel error on ${channelName}`));
      }
    });

  // Step 3: Return clean teardown function
  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * 2. Subscribe to Safety Alerts via Supabase Realtime
 */
export const subscribeToSupabaseAlerts = (
  deviceId: string = DEFAULT_DEVICE_ID,
  onNewAlert: (alert: AlertRow) => void,
  onError?: (err: Error) => void
): (() => void) => {
  const targetId = deviceId.trim();
  const lowerId = targetId.toLowerCase();
  const upperId = targetId.toUpperCase();
  const channelName = `realtime:alerts:${lowerId}-${Date.now()}`;

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
        filter: lowerId === upperId ? `device_id=eq.${lowerId}` : `device_id=in.(${lowerId},${upperId})`,
      },
      (payload) => {
        if (payload.new) {
          onNewAlert(payload.new as AlertRow);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' && onError) {
        onError(new Error(`Supabase Realtime alert channel error on ${channelName}`));
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * 3. Fetch Historical Telemetry in strictly CHRONOLOGICAL order for charts.
 * Queries the latest records from Supabase and reverses them into chronological order (oldest to newest).
 */
export const fetchSensorHistoryChronological = async (
  deviceId: string = DEFAULT_DEVICE_ID,
  limit: number = 30
): Promise<SensorHistoryRow[]> => {
  const targetId = deviceId.trim();
  const { data, error } = await supabase
    .from('sensor_history')
    .select('*')
    .ilike('device_id', targetId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[Supabase] fetchSensorHistoryChronological error:', error.message);
    return [];
  }

  // Reverse so the array is in strictly ascending chronological order (left -> right on timeline)
  return (data || []).slice().reverse();
};

export const fetchSensorHistory = fetchSensorHistoryChronological;

/**
 * 4. Ingest Telemetry directly via the Edge Function
 */
export const sendTelemetryToEdgeFunction = async (payload: {
  deviceId: string;
  deviceKey?: string;
  leftDistance?: number;
  frontDistance?: number;
  rightDistance?: number;
  latitude?: number;
  longitude?: number;
  battery?: number;
  alert?: string;
  alertState?: string;
  alertMessage?: string;
  obstacleLevel?: string;
  gpsStatus?: string;
  simStatus?: string;
  cameraStatus?: string;
  [key: string]: any;
}) => {
  const functionUrl = `${SUPABASE_URL}/functions/v1/ingest-device-data`;
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': payload.deviceId,
      'x-device-key': payload.deviceKey || '',
    },
    body: JSON.stringify(payload),
  });

  return await response.json();
};

/**
 * 5. Helper to check if camera is genuinely online and verified within threshold.
 * Never fabricate online status without verified frames. Default: 30 seconds.
 */
export const isCameraVerifiedOnline = (
  cameraStatus?: string | null,
  timestamp?: string | Date | null,
  thresholdMs: number = 30000
): boolean => {
  if (cameraStatus !== 'online') return false;
  if (!timestamp) return false;
  const time = new Date(timestamp).getTime();
  if (isNaN(time)) return false;
  return Date.now() - time <= thresholdMs;
};

/**
 * 6. Fetch latest AI detections from Supabase
 */
export const fetchLatestAIDetections = async (
  deviceId: string = DEFAULT_DEVICE_ID,
  limit: number = 10
): Promise<AIDetectionRow[]> => {
  try {
    const targetId = deviceId.trim();
    const { data, error } = await supabase
      .from('ai_detections')
      .select('*')
      .ilike('device_id', targetId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[Supabase] fetchLatestAIDetections notice:', error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.warn('[Supabase] fetchLatestAIDetections error:', err);
    return [];
  }
};

/**
 * 7. Subscribe to real-time AI Detections via Supabase Realtime
 */
export const subscribeToSupabaseAIDetections = (
  deviceId: string = DEFAULT_DEVICE_ID,
  onNewDetection: (detection: AIDetectionRow) => void,
  onError?: (err: Error) => void
): (() => void) => {
  const targetId = deviceId.trim();
  const lowerId = targetId.toLowerCase();
  const upperId = targetId.toUpperCase();
  const channelName = `realtime:ai_detections:${lowerId}-${Date.now()}`;

  // Fetch initial latest detection immediately
  fetchLatestAIDetections(targetId, 1).then((records) => {
    if (records.length > 0) {
      onNewDetection(records[0]);
    }
  });

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_detections',
        filter: lowerId === upperId ? `device_id=eq.${lowerId}` : `device_id=in.(${lowerId},${upperId})`,
      },
      (payload) => {
        if (payload.new) {
          onNewDetection(payload.new as AIDetectionRow);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' && onError) {
        onError(new Error(`Supabase Realtime AI detection channel error on ${channelName}`));
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * 8. Send Camera Frame to Backend for Inference and Storage
 */
export const sendCameraFrameCapture = async (
  imageBlobOrBase64: Blob | string,
  deviceId: string = DEFAULT_DEVICE_ID,
  deviceKey?: string
) => {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5001';
  let body: any;
  let headers: Record<string, string> = {
    'x-device-id': deviceId,
  };
  if (deviceKey) {
    headers['x-device-key'] = deviceKey;
  }

  if (typeof imageBlobOrBase64 === 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ image: imageBlobOrBase64, deviceId });
  } else {
    headers['Content-Type'] = imageBlobOrBase64.type || 'image/jpeg';
    body = imageBlobOrBase64;
  }

  const response = await fetch(`${serverUrl}/api/vision/capture`, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(errJson.error || `Vision capture failed with status ${response.status}`);
  }

  return await response.json();
};
