import { isDbConnected } from '../config/db';
import { getSupabaseClient, isSupabaseConnected } from '../config/supabase';
import { Device, IDevice } from '../models/Device';
import { SensorData, ISensorData } from '../models/SensorData';
import { Obstacle, IObstacle } from '../models/Obstacle';
import { Location, ILocation } from '../models/Location';
import { Alert, IAlert } from '../models/Alert';

// In-Memory Seed Storage for resilient standalone operation
let memoryDevice = {
  deviceId: 'SBS-001',
  name: 'NOVOS Vision Cane V2',
  status: 'online',
  firmwareVersion: 'v2.4.1-ai-edge',
  lastSeen: new Date(),
  batteryLevel: 82,
  emergencyContact: '+1 (555) 019-2834',
};

let memorySensor: any = {
  deviceId: 'SBS-001',
  distance: 1.8,
  object: 'person',
  confidence: 0.97,
  latitude: 11.0168,
  longitude: 76.9558,
  battery: 82,
  alert: 'vibration',
  timestamp: new Date(),
};

let memoryObstacles: any[] = [
  {
    _id: 'obs-mem-1',
    deviceId: 'SBS-001',
    label: 'Pedestrian Walking',
    distance: 1.8,
    confidence: 0.97,
    dangerLevel: 'medium',
    boundingBox: { x: 38, y: 16, width: 24, height: 68 },
    detectedAt: new Date(Date.now() - 3000),
  },
  {
    _id: 'obs-mem-2',
    deviceId: 'SBS-001',
    label: 'Granite Planter',
    distance: 2.1,
    confidence: 0.94,
    dangerLevel: 'low',
    boundingBox: { x: 12, y: 60, width: 34, height: 26 },
    detectedAt: new Date(Date.now() - 15000),
  },
  {
    _id: 'obs-mem-3',
    deviceId: 'SBS-001',
    label: 'Parked Bicycle',
    distance: 2.4,
    confidence: 0.91,
    dangerLevel: 'low',
    boundingBox: { x: 54, y: 44, width: 18, height: 32 },
    detectedAt: new Date(Date.now() - 45000),
  },
];

let memoryLocation: any = {
  deviceId: 'SBS-001',
  latitude: 11.0168,
  longitude: 76.9558,
  altitude: 432,
  speed: 1.1,
  address: 'Metropolitan Tech Center, 4th Avenue Way',
  timestamp: new Date(),
};

let memoryAlerts: any[] = [
  {
    _id: 'alt-mem-1',
    deviceId: 'SBS-001',
    type: 'vibration',
    severity: 'warning',
    message: 'Haptic pulse triggered for approaching pedestrian at 1.8m',
    acknowledged: true,
    timestamp: new Date(Date.now() - 4000),
  },
  {
    _id: 'alt-mem-2',
    deviceId: 'SBS-001',
    type: 'buzzer',
    severity: 'info',
    message: 'Sonar pulse: 2.1m obstacle detected on left traversal axis',
    acknowledged: true,
    timestamp: new Date(Date.now() - 22000),
  },
  {
    _id: 'alt-mem-3',
    deviceId: 'SBS-001',
    type: 'vibration',
    severity: 'info',
    message: 'Surface elevation change detected (Step down curb 12cm)',
    acknowledged: true,
    timestamp: new Date(Date.now() - 65000),
  },
];

export const dataService = {
  // Device
  async getDevice(deviceId: string = 'SBS-001') {
    const formattedId = deviceId.toUpperCase();
    const supabase = getSupabaseClient();

    // 1. Supabase Postgres
    if (supabase && isSupabaseConnected()) {
      try {
        const { data, error } = await supabase
          .from('devices')
          .select('*')
          .eq('device_id', formattedId)
          .maybeSingle();

        if (data) {
          return {
            id: data.id,
            deviceId: data.device_id,
            name: data.name,
            status: data.status,
            firmwareVersion: data.firmware_version,
            lastSeen: data.last_seen,
            batteryLevel: data.battery_level,
            emergencyContact: data.emergency_contact,
            ownerId: data.owner_id,
          };
        } else {
          // Auto-seed device into Supabase if missing
          const seedPayload = {
            device_id: formattedId,
            name: memoryDevice.name,
            status: memoryDevice.status,
            firmware_version: memoryDevice.firmwareVersion,
            battery_level: memoryDevice.batteryLevel,
            emergency_contact: memoryDevice.emergencyContact,
          };
          const { data: created } = await supabase
            .from('devices')
            .insert(seedPayload)
            .select()
            .single();

          if (created) {
            return {
              id: created.id,
              deviceId: created.device_id,
              name: created.name,
              status: created.status,
              firmwareVersion: created.firmware_version,
              lastSeen: created.last_seen,
              batteryLevel: created.battery_level,
              emergencyContact: created.emergency_contact,
            };
          }
        }
      } catch (err: any) {
        console.warn('[dataService] Supabase getDevice error, fallback:', err.message);
      }
    }

    // 2. MongoDB
    if (isDbConnected()) {
      let dev = await Device.findOne({ deviceId: formattedId });
      if (!dev) {
        dev = await Device.create({ ...memoryDevice, deviceId: formattedId });
      }
      return dev;
    }

    // 3. In-memory
    return { ...memoryDevice, deviceId: formattedId };
  },

  async registerDevice(data: Partial<IDevice> & { firmwareVersion?: string; emergencyContact?: string }) {
    const formattedId = (data.deviceId || 'SBS-001').toUpperCase();
    const supabase = getSupabaseClient();

    // 1. Supabase Postgres
    if (supabase && isSupabaseConnected()) {
      try {
        const payload: Record<string, any> = {
          device_id: formattedId,
          last_seen: new Date().toISOString(),
        };
        if (data.name) payload.name = data.name;
        if (data.status) payload.status = data.status;
        if (data.firmwareVersion) payload.firmware_version = data.firmwareVersion;
        if (data.batteryLevel !== undefined) payload.battery_level = data.batteryLevel;
        if (data.emergencyContact) payload.emergency_contact = data.emergencyContact;
        if (data.ownerId) payload.owner_id = data.ownerId;

        const { data: upserted, error } = await supabase
          .from('devices')
          .upsert(payload, { onConflict: 'device_id' })
          .select()
          .single();

        if (upserted) {
          return {
            id: upserted.id,
            deviceId: upserted.device_id,
            name: upserted.name,
            status: upserted.status,
            firmwareVersion: upserted.firmware_version,
            lastSeen: upserted.last_seen,
            batteryLevel: upserted.battery_level,
            emergencyContact: upserted.emergency_contact,
            ownerId: upserted.owner_id,
          };
        }
      } catch (err: any) {
        console.warn('[dataService] Supabase registerDevice error:', err.message);
      }
    }

    // 2. MongoDB
    if (isDbConnected()) {
      const dev = await Device.findOneAndUpdate(
        { deviceId: formattedId },
        { $set: data },
        { upsert: true, new: true }
      );
      return dev;
    }

    // 3. In-memory
    memoryDevice = { ...memoryDevice, ...data, deviceId: formattedId, lastSeen: new Date() };
    return memoryDevice;
  },

  // Sensors
  async getLatestSensorData(deviceId: string = 'SBS-001') {
    const formattedId = deviceId.toUpperCase();
    const supabase = getSupabaseClient();

    // 1. Supabase Postgres
    if (supabase && isSupabaseConnected()) {
      try {
        const { data, error } = await supabase
          .from('live_sensor_data')
          .select('*')
          .eq('device_id', formattedId)
          .maybeSingle();

        if (data) {
          const frontM = Number((data.front_distance_cm / 100).toFixed(2));
          const leftM = Number((data.left_distance_cm / 100).toFixed(2));
          const rightM = Number((data.right_distance_cm / 100).toFixed(2));

          return {
            id: data.id,
            deviceId: data.device_id,
            distance: frontM,
            frontDistance: frontM,
            leftDistance: leftM,
            rightDistance: rightM,
            object: data.obstacle_level || 'clear',
            confidence: 0.98,
            latitude: Number(data.gps_latitude),
            longitude: Number(data.gps_longitude),
            battery: Number(data.battery_percentage),
            alert: data.alert_state,
            timestamp: data.timestamp,
          };
        }
      } catch (err: any) {
        console.warn('[dataService] Supabase getLatestSensorData error:', err.message);
      }
    }

    // 2. MongoDB
    if (isDbConnected()) {
      const latest = await SensorData.findOne({ deviceId: formattedId }).sort({ timestamp: -1 });
      if (latest) return latest;
    }

    // 3. In-memory
    return memorySensor;
  },

  async saveSensorData(data: any) {
    const formattedId = (data.deviceId || 'SBS-001').toUpperCase();
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    const payload = {
      ...data,
      deviceId: formattedId,
      timestamp,
    };

    const supabase = getSupabaseClient();

    // 1. Supabase Postgres
    if (supabase && isSupabaseConnected()) {
      try {
        const frontCm = data.front_distance_cm ?? (data.distance !== undefined ? Number(data.distance) * 100 : 180);
        const leftCm = data.left_distance_cm ?? 150;
        const rightCm = data.right_distance_cm ?? 160;
        const obstacleLevel = data.obstacle_level || data.object || (frontCm < 60 ? 'critical' : frontCm < 120 ? 'warning' : 'clear');
        const alertState = data.alert || data.alert_state || (frontCm < 60 ? 'dual' : frontCm < 120 ? 'vibration' : 'none');
        const nowIso = timestamp.toISOString();

        await supabase
          .from('live_sensor_data')
          .upsert({
            device_id: formattedId,
            front_distance_cm: frontCm,
            left_distance_cm: leftCm,
            right_distance_cm: rightCm,
            obstacle_level: obstacleLevel,
            gps_latitude: data.latitude !== undefined ? Number(data.latitude) : 11.0168,
            gps_longitude: data.longitude !== undefined ? Number(data.longitude) : 76.9558,
            battery_percentage: data.battery !== undefined ? Number(data.battery) : 85,
            alert_state: alertState,
            timestamp: nowIso,
            updated_at: nowIso,
          }, { onConflict: 'device_id' });

        await supabase
          .from('sensor_history')
          .insert({
            device_id: formattedId,
            front_distance_cm: frontCm,
            left_distance_cm: leftCm,
            right_distance_cm: rightCm,
            obstacle_level: obstacleLevel,
            gps_latitude: data.latitude !== undefined ? Number(data.latitude) : 11.0168,
            gps_longitude: data.longitude !== undefined ? Number(data.longitude) : 76.9558,
            battery_percentage: data.battery !== undefined ? Number(data.battery) : 85,
            timestamp: nowIso,
          });

        await supabase
          .from('devices')
          .update({
            status: 'online',
            last_seen: nowIso,
            battery_level: data.battery !== undefined ? Number(data.battery) : 85,
            updated_at: nowIso,
          })
          .eq('device_id', formattedId);

        return {
          deviceId: formattedId,
          distance: Number((frontCm / 100).toFixed(2)),
          frontDistance: Number((frontCm / 100).toFixed(2)),
          leftDistance: Number((leftCm / 100).toFixed(2)),
          rightDistance: Number((rightCm / 100).toFixed(2)),
          object: obstacleLevel,
          confidence: 0.98,
          latitude: data.latitude !== undefined ? Number(data.latitude) : 11.0168,
          longitude: data.longitude !== undefined ? Number(data.longitude) : 76.9558,
          battery: data.battery !== undefined ? Number(data.battery) : 85,
          alert: alertState,
          timestamp: nowIso,
        };
      } catch (err: any) {
        console.warn('[dataService] Supabase saveSensorData error:', err.message);
      }
    }

    // 2. MongoDB
    if (isDbConnected()) {
      const created = await SensorData.create(payload);
      await Device.findOneAndUpdate(
        { deviceId: formattedId },
        { $set: { lastSeen: new Date(), batteryLevel: payload.battery } }
      );
      return created;
    }

    // 3. In-memory
    memorySensor = payload;
    memoryDevice.lastSeen = new Date();
    if (payload.battery) memoryDevice.batteryLevel = payload.battery;
    return payload;
  },

  // Obstacles
  async getObstacles(deviceId: string = 'SBS-001', limit: number = 10) {
    const formattedId = deviceId.toUpperCase();
    const supabase = getSupabaseClient();

    // 1. Supabase Postgres
    if (supabase && isSupabaseConnected()) {
      try {
        const { data, error } = await supabase
          .from('obstacles')
          .select('*')
          .eq('device_id', formattedId)
          .order('detected_at', { ascending: false })
          .limit(limit);

        if (data && data.length > 0) {
          return data.map((o) => ({
            _id: `obs-sp-${o.id}`,
            id: o.id,
            deviceId: o.device_id,
            label: o.label,
            distance: Number(o.distance),
            confidence: Number(o.confidence),
            dangerLevel: o.danger_level,
            boundingBox: o.bounding_box,
            detectedAt: o.detected_at,
          }));
        }
      } catch (err: any) {
        console.warn('[dataService] Supabase getObstacles error:', err.message);
      }
    }

    // 2. MongoDB
    if (isDbConnected()) {
      return await Obstacle.find({ deviceId: formattedId })
        .sort({ detectedAt: -1 })
        .limit(limit);
    }

    // 3. In-memory
    return memoryObstacles.slice(0, limit);
  },

  async addObstacle(data: any) {
    const formattedId = (data.deviceId || 'SBS-001').toUpperCase();
    const detectedAt = data.detectedAt ? new Date(data.detectedAt) : new Date();
    const supabase = getSupabaseClient();

    // 1. Supabase Postgres
    if (supabase && isSupabaseConnected()) {
      try {
        const row = {
          device_id: formattedId,
          label: data.label,
          distance: Number(data.distance),
          confidence: data.confidence !== undefined ? Number(data.confidence) : 0.9,
          danger_level: data.dangerLevel || (data.distance < 1.0 ? 'high' : data.distance < 1.8 ? 'medium' : 'low'),
          bounding_box: data.boundingBox || {},
          detected_at: detectedAt.toISOString(),
        };

        const { data: inserted, error } = await supabase
          .from('obstacles')
          .insert(row)
          .select()
          .single();

        if (inserted) {
          return {
            _id: `obs-sp-${inserted.id}`,
            id: inserted.id,
            deviceId: inserted.device_id,
            label: inserted.label,
            distance: Number(inserted.distance),
            confidence: Number(inserted.confidence),
            dangerLevel: inserted.danger_level,
            boundingBox: inserted.bounding_box,
            detectedAt: inserted.detected_at,
          };
        }
      } catch (err: any) {
        console.warn('[dataService] Supabase addObstacle error:', err.message);
      }
    }

    // 2. MongoDB
    if (isDbConnected()) {
      return await Obstacle.create({
        ...data,
        deviceId: formattedId,
        detectedAt,
      });
    }

    // 3. In-memory
    const item = { ...data, deviceId: formattedId, detectedAt, _id: `obs-${Date.now()}` };
    memoryObstacles.unshift(item);
    return item;
  },

  // Location
  async getLatestLocation(deviceId: string = 'SBS-001') {
    const formattedId = deviceId.toUpperCase();
    const supabase = getSupabaseClient();

    // 1. Supabase Postgres
    if (supabase && isSupabaseConnected()) {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('device_id', formattedId)
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          return {
            id: data.id,
            deviceId: data.device_id,
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            altitude: Number(data.altitude),
            speed: Number(data.speed),
            address: data.address,
            timestamp: data.timestamp,
          };
        }
      } catch (err: any) {
        console.warn('[dataService] Supabase getLatestLocation error:', err.message);
      }
    }

    // 2. MongoDB
    if (isDbConnected()) {
      const loc = await Location.findOne({ deviceId: formattedId }).sort({ timestamp: -1 });
      if (loc) return loc;
    }

    // 3. In-memory
    return memoryLocation;
  },

  async updateLocation(data: any) {
    const formattedId = (data.deviceId || 'SBS-001').toUpperCase();
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    const supabase = getSupabaseClient();

    // 1. Supabase Postgres
    if (supabase && isSupabaseConnected()) {
      try {
        const row = {
          device_id: formattedId,
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          altitude: data.altitude !== undefined ? Number(data.altitude) : 432,
          speed: data.speed !== undefined ? Number(data.speed) : 1.1,
          address: data.address || 'Metropolitan Tech Center, 4th Avenue Way',
          timestamp: timestamp.toISOString(),
        };

        const { data: inserted, error } = await supabase
          .from('locations')
          .insert(row)
          .select()
          .single();

        if (inserted) {
          return {
            id: inserted.id,
            deviceId: inserted.device_id,
            latitude: Number(inserted.latitude),
            longitude: Number(inserted.longitude),
            altitude: Number(inserted.altitude),
            speed: Number(inserted.speed),
            address: inserted.address,
            timestamp: inserted.timestamp,
          };
        }
      } catch (err: any) {
        console.warn('[dataService] Supabase updateLocation error:', err.message);
      }
    }

    // 2. MongoDB
    if (isDbConnected()) {
      return await Location.create({
        ...data,
        deviceId: formattedId,
        timestamp,
      });
    }

    // 3. In-memory
    memoryLocation = { ...data, deviceId: formattedId, timestamp };
    return memoryLocation;
  },

  // Alerts
  async getAlerts(deviceId: string = 'SBS-001', limit: number = 10) {
    const formattedId = deviceId.toUpperCase();
    const supabase = getSupabaseClient();

    // 1. Supabase Postgres
    if (supabase && isSupabaseConnected()) {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .eq('device_id', formattedId)
          .order('timestamp', { ascending: false })
          .limit(limit);

        if (data && data.length > 0) {
          return data.map((a) => ({
            _id: `alt-sp-${a.id}`,
            id: a.id,
            deviceId: a.device_id,
            type: a.type,
            severity: a.severity,
            message: a.message,
            acknowledged: a.acknowledged,
            timestamp: a.timestamp,
          }));
        }
      } catch (err: any) {
        console.warn('[dataService] Supabase getAlerts error:', err.message);
      }
    }

    // 2. MongoDB
    if (isDbConnected()) {
      return await Alert.find({ deviceId: formattedId })
        .sort({ timestamp: -1 })
        .limit(limit);
    }

    // 3. In-memory
    return memoryAlerts.slice(0, limit);
  },

  async addAlert(data: any) {
    const formattedId = (data.deviceId || 'SBS-001').toUpperCase();
    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    const supabase = getSupabaseClient();

    // 1. Supabase Postgres
    if (supabase && isSupabaseConnected()) {
      try {
        const row = {
          device_id: formattedId,
          type: data.type,
          severity: data.severity || 'warning',
          message: data.message,
          acknowledged: data.acknowledged || false,
          timestamp: timestamp.toISOString(),
        };

        const { data: inserted, error } = await supabase
          .from('alerts')
          .insert(row)
          .select()
          .single();

        if (inserted) {
          return {
            _id: `alt-sp-${inserted.id}`,
            id: inserted.id,
            deviceId: inserted.device_id,
            type: inserted.type,
            severity: inserted.severity,
            message: inserted.message,
            acknowledged: inserted.acknowledged,
            timestamp: inserted.timestamp,
          };
        }
      } catch (err: any) {
        console.warn('[dataService] Supabase addAlert error:', err.message);
      }
    }

    // 2. MongoDB
    if (isDbConnected()) {
      return await Alert.create({
        ...data,
        deviceId: formattedId,
        timestamp,
        acknowledged: false,
      });
    }

    // 3. In-memory
    const item = { ...data, deviceId: formattedId, timestamp, acknowledged: false, _id: `alt-${Date.now()}` };
    memoryAlerts.unshift(item);
    return item;
  },

  // AI Detections
  async recordAIDetection(data: any) {
    const formattedId = (data.deviceId || 'SBS-001').toUpperCase();
    const supabase = getSupabaseClient();

    if (supabase && isSupabaseConnected()) {
      try {
        const row = {
          device_id: formattedId,
          model_name: data.modelName || 'pedestrian-viewer/4',
          label: data.label,
          confidence: Number(data.confidence),
          bounding_box: data.boundingBox || {},
          inference_time_ms: data.inferenceTimeMs || 35,
          timestamp: new Date().toISOString(),
        };
        await supabase.from('ai_detections').insert(row);
      } catch (err: any) {
        console.warn('[dataService] Supabase recordAIDetection error:', err.message);
      }
    }
  },

  // Unified Dashboard Summary
  async getDashboardSummary(deviceId: string = 'SBS-001') {
    const [device, latestSensor, recentObstacles, latestLocation, recentAlerts] = await Promise.all([
      this.getDevice(deviceId),
      this.getLatestSensorData(deviceId),
      this.getObstacles(deviceId, 5),
      this.getLatestLocation(deviceId),
      this.getAlerts(deviceId, 5),
    ]);

    return {
      device,
      latestSensor,
      recentObstacles,
      latestLocation,
      recentAlerts,
      systemHealth: {
        cameraFps: 28,
        sonarLatencyMs: 14,
        inferenceTimeMs: 42,
        signalStrengthDbm: -64,
        storageMode: isSupabaseConnected()
          ? 'Supabase PostgreSQL Cloud'
          : isDbConnected()
          ? 'MongoDB Active'
          : 'Resilient In-Memory',
      },
    };
  },
};
