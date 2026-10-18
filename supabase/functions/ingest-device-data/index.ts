import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * CORS Configuration
 * The ESP32 firmware directly makes HTTP POST calls without browser CORS.
 * Standard CORS headers are provided so browser-based test consoles / caregiver portals
 * can also interact with the endpoint safely.
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id, x-device-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

/**
 * Constant-time string comparison to prevent timing attacks on device credentials
 */
function secureCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * SHA-256 hash helper for checking optional per-device registered keys in the database
 */
async function sha256Hex(key: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Allowed enumeration values
const ALLOWED_OBSTACLE_LEVELS = new Set(["clear", "caution", "warning", "critical"]);
const ALLOWED_GPS_STATUSES = new Set(["connected", "searching", "no_fix", "fix_2d", "fix_3d", "offline"]);
const ALLOWED_SIM_STATUSES = new Set(["connected", "roaming", "no_sim", "disconnected", "offline"]);
const ALLOWED_CAMERA_STATUSES = new Set(["online", "streaming", "idle", "error", "offline"]);
const ALLOWED_ALERT_STATES = new Set(["none", "vibration", "buzzer", "dual", "sos"]);

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized: {
    deviceId: string;
    leftDistanceCm: number;
    frontDistanceCm: number;
    rightDistanceCm: number;
    obstacleLevel: string;
    gpsLatitude: number | null;
    gpsLongitude: number | null;
    gpsStatus: string;
    simStatus: string;
    cameraStatus: string;
    batteryVoltage: number | null;
    batteryPercentage: number;
    alertState: string;
    alertMessage?: string;
    timestamp: string;
    isSosEvent: boolean;
  };
}

/**
 * Strict validator for incoming device telemetry payloads
 */
function validateAndSanitizePayload(body: any, headerDeviceId?: string | null): ValidationResult {
  const errors: string[] = [];

  // 1. Device ID validation (Preserve exact casing, e.g. nexus-01 or SBS-001)
  const rawDeviceId = (headerDeviceId || body.deviceId || body.device_id || "").toString().trim();
  const deviceIdRegex = /^[A-Za-z0-9_-]{3,64}$/;
  if (!rawDeviceId) {
    errors.push("Missing device identifier (deviceId or x-device-id header).");
  } else if (!deviceIdRegex.test(rawDeviceId)) {
    errors.push(`Invalid deviceId '${rawDeviceId}'. Must be alphanumeric with hyphens or underscores (3-64 chars).`);
  }

  // Helper for numeric distance parsing and range checking (0cm to 500cm)
  const parseDistance = (val: any, fieldName: string): number => {
    if (val === undefined || val === null) return 0;
    const num = Number(val);
    if (isNaN(num) || !isFinite(num)) {
      errors.push(`${fieldName} must be a valid finite number.`);
      return 0;
    }
    if (num < 0 || num > 500) {
      errors.push(`${fieldName} value ${num} is out of physical range (0 - 500 cm).`);
      return 0;
    }
    return Math.round(num * 10) / 10;
  };

  const leftDistanceCm = parseDistance(
    body.left_distance_cm !== undefined ? body.left_distance_cm : body.leftDistance,
    "left_distance_cm"
  );

  // Allow frontDistance in cm or distance in meters if provided as decimal
  let rawFront = body.front_distance_cm !== undefined ? body.front_distance_cm : body.frontDistance;
  if (rawFront === undefined && typeof body.distance === "number" && body.distance <= 5.0) {
    rawFront = body.distance * 100;
  }
  const frontDistanceCm = parseDistance(rawFront, "front_distance_cm");

  const rightDistanceCm = parseDistance(
    body.right_distance_cm !== undefined ? body.right_distance_cm : body.rightDistance,
    "right_distance_cm"
  );

  // 2. Proximity-derived obstacle level calculation
  const effectiveMin = Math.min(
    frontDistanceCm > 0 ? frontDistanceCm : 500,
    leftDistanceCm > 0 ? leftDistanceCm : 500,
    rightDistanceCm > 0 ? rightDistanceCm : 500
  );

  let calculatedObstacleLevel = "clear";
  let calculatedAlertState = "none";

  if (effectiveMin < 60) {
    calculatedObstacleLevel = "critical";
    calculatedAlertState = "dual";
  } else if (effectiveMin < 120) {
    calculatedObstacleLevel = "warning";
    calculatedAlertState = "vibration";
  } else if (effectiveMin < 180) {
    calculatedObstacleLevel = "caution";
    calculatedAlertState = "buzzer";
  }

  // 3. Status enumerations
  let obstacleLevel = (body.obstacle_level || body.obstacleLevel || calculatedObstacleLevel).toString().toLowerCase();
  if (!ALLOWED_OBSTACLE_LEVELS.has(obstacleLevel)) {
    errors.push(`Invalid obstacle_level '${obstacleLevel}'. Allowed: ${Array.from(ALLOWED_OBSTACLE_LEVELS).join(", ")}`);
    obstacleLevel = calculatedObstacleLevel;
  }

  let gpsStatus = (body.gps_status || body.gpsStatus || "no_fix").toString().toLowerCase();
  if (!ALLOWED_GPS_STATUSES.has(gpsStatus)) {
    errors.push(`Invalid gps_status '${gpsStatus}'. Allowed: ${Array.from(ALLOWED_GPS_STATUSES).join(", ")}`);
    gpsStatus = "no_fix";
  }

  let simStatus = (body.sim_status || body.simStatus || "connected").toString().toLowerCase();
  if (!ALLOWED_SIM_STATUSES.has(simStatus)) {
    errors.push(`Invalid sim_status '${simStatus}'. Allowed: ${Array.from(ALLOWED_SIM_STATUSES).join(", ")}`);
    simStatus = "connected";
  }

  let cameraStatus = (body.camera_status || body.cameraStatus || "idle").toString().toLowerCase();
  if (!ALLOWED_CAMERA_STATUSES.has(cameraStatus)) {
    errors.push(`Invalid camera_status '${cameraStatus}'. Allowed: ${Array.from(ALLOWED_CAMERA_STATUSES).join(", ")}`);
    cameraStatus = "idle";
  }

  // 4. Emergency SOS detection
  const isSosEvent = Boolean(
    body.sos === true ||
    body.sosStatus === "triggered" ||
    body.sosStatus === "active" ||
    body.alert === "sos" ||
    body.alert_state === "sos" ||
    body.event === "emergency_sos"
  );

  let alertState = isSosEvent ? "sos" : (body.alert_state || body.alert || calculatedAlertState).toString().toLowerCase();
  if (!ALLOWED_ALERT_STATES.has(alertState)) {
    errors.push(`Invalid alert_state '${alertState}'. Allowed: ${Array.from(ALLOWED_ALERT_STATES).join(", ")}`);
    alertState = "none";
  }

  // 5. GPS coordinates validation
  let gpsLatitude: number | null = null;
  const rawLat = body.gps_latitude !== undefined ? body.gps_latitude : body.latitude;
  if (rawLat !== undefined && rawLat !== null) {
    const lat = Number(rawLat);
    if (isNaN(lat) || !isFinite(lat) || lat < -90 || lat > 90) {
      errors.push(`Invalid latitude '${rawLat}'. Must be a number between -90.0 and +90.0.`);
    } else {
      gpsLatitude = lat;
    }
  }

  let gpsLongitude: number | null = null;
  const rawLng = body.gps_longitude !== undefined ? body.gps_longitude : body.longitude;
  if (rawLng !== undefined && rawLng !== null) {
    const lng = Number(rawLng);
    if (isNaN(lng) || !isFinite(lng) || lng < -180 || lng > 180) {
      errors.push(`Invalid longitude '${rawLng}'. Must be a number between -180.0 and +180.0.`);
    } else {
      gpsLongitude = lng;
    }
  }

  // 6. Battery validation
  let batteryPercentage = 100;
  const rawBat = body.battery_percentage !== undefined ? body.battery_percentage : (body.battery !== undefined ? body.battery : body.batteryLevel);
  if (rawBat !== undefined && rawBat !== null) {
    const bat = Number(rawBat);
    if (isNaN(bat) || !isFinite(bat) || bat < 0 || bat > 100) {
      errors.push(`Invalid battery percentage '${rawBat}'. Must be a number between 0 and 100.`);
    } else {
      batteryPercentage = Math.round(bat);
    }
  }

  let batteryVoltage: number | null = null;
  if (body.battery_voltage !== undefined && body.battery_voltage !== null) {
    const volt = Number(body.battery_voltage);
    if (isNaN(volt) || !isFinite(volt) || volt < 0 || volt > 15) {
      errors.push(`Invalid battery voltage '${body.battery_voltage}'. Must be a number between 0.0 and 15.0 V.`);
    } else {
      batteryVoltage = Math.round(volt * 100) / 100;
    }
  }

  // 7. Timestamp validation
  let timestamp = new Date().toISOString();
  if (body.timestamp) {
    const parsed = new Date(body.timestamp);
    if (isNaN(parsed.getTime())) {
      errors.push(`Invalid timestamp format '${body.timestamp}'. Must be a valid ISO-8601 string or Unix timestamp.`);
    } else {
      const nowMs = Date.now();
      const payloadMs = parsed.getTime();
      // Allow at most 1 hour clock drift in future, and reject older than 30 days
      if (payloadMs > nowMs + 3600000) {
        errors.push(`Timestamp is too far in the future: ${body.timestamp}`);
      } else if (payloadMs < nowMs - 30 * 86400000) {
        errors.push(`Timestamp is older than 30 days: ${body.timestamp}`);
      } else {
        timestamp = parsed.toISOString();
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      deviceId: rawDeviceId,
      leftDistanceCm,
      frontDistanceCm,
      rightDistanceCm,
      obstacleLevel,
      gpsLatitude,
      gpsLongitude,
      gpsStatus: gpsLatitude !== null && gpsStatus === "no_fix" ? "fix_3d" : gpsStatus,
      simStatus,
      cameraStatus,
      batteryVoltage,
      batteryPercentage,
      alertState,
      alertMessage: body.alertMessage || body.message || undefined,
      timestamp,
      isSosEvent,
    },
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight for web callers
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Restrict to HTTP POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed. Use HTTP POST.",
      }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // 1. Load Server Secrets
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const configuredDeviceKey = Deno.env.get("DEVICE_INGEST_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[ingest-device-data] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Internal server configuration error: Supabase environment keys missing.",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!configuredDeviceKey) {
      console.warn("[ingest-device-data] Notice: DEVICE_INGEST_KEY secret is not set in environment. Falling back to per-device database credential check.");
    }

    // 2. Parse JSON body safely
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Malformed request payload: Body must be valid JSON.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body || typeof body !== "object") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Malformed request payload: Expected JSON object.",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 3. Extract and verify Device Credential
    // Accepts credential from header 'x-device-key', 'Authorization: Bearer <token>', or JSON body
    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.substring(7).trim() : "";
    const headerKey = req.headers.get("x-device-key")?.trim() || "";
    const bodyKey = (body.deviceKey || body.device_key || body.apiKey || body.api_key || "").toString().trim();
    const providedCredential = headerKey || bearerToken || bodyKey;

    if (!providedCredential) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized: Missing device credential. Supply via 'x-device-key' header or Bearer authorization.",
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Compare with the dedicated Edge Function secret
    const isMasterKeyMatch = Boolean(configuredDeviceKey && configuredDeviceKey.length >= 8) && secureCompare(providedCredential, configuredDeviceKey);

    // Initialize Server-Side Supabase Client (bypasses RLS to write system telemetry)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Validate and Sanitize payload fields
    const headerDeviceId = req.headers.get("x-device-id");
    const validation = validateAndSanitizePayload(body, headerDeviceId);

    if (!validation.isValid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Validation failed for sensor payload.",
          validation_errors: validation.errors,
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { sanitized } = validation;

    // 5. Verify against device in database if master key didn't match
    if (!isMasterKeyMatch) {
      const { data: deviceRecord, error: devQueryError } = await supabase
        .from("devices")
        .select("id, device_id, api_key_hash")
        .ilike("device_id", sanitized.deviceId)
        .maybeSingle();

      if (devQueryError) {
        console.error("[ingest-device-data] Database error checking device:", devQueryError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Database error while validating device authentication.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }

      if (deviceRecord?.device_id) {
        sanitized.deviceId = deviceRecord.device_id;
      }

      if (!deviceRecord || !deviceRecord.api_key_hash) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized: Invalid device credential.",
          }),
          { status: 401, headers: corsHeaders }
        );
      }

      const providedHash = await sha256Hex(providedCredential);
      if (!secureCompare(providedHash, deviceRecord.api_key_hash)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unauthorized: Invalid device credential.",
          }),
          { status: 401, headers: corsHeaders }
        );
      }
    }

    // 6. Ensure device profile exists in 'devices' table
    const { data: existingDevice } = await supabase
      .from("devices")
      .select("id, status")
      .eq("device_id", sanitized.deviceId)
      .maybeSingle();

    if (!existingDevice) {
      await supabase.from("devices").insert({
        device_id: sanitized.deviceId,
        name: body.deviceName || `Nexus Cane (${sanitized.deviceId})`,
        status: "online",
        battery_level: sanitized.batteryPercentage,
        last_seen: sanitized.timestamp,
        metadata: {
          auto_provisioned_at: sanitized.timestamp,
          source: "ingest-device-data",
        },
      });
    } else {
      await supabase
        .from("devices")
        .update({
          status: "online",
          last_seen: sanitized.timestamp,
          battery_level: sanitized.batteryPercentage,
          updated_at: new Date().toISOString(),
        })
        .eq("device_id", sanitized.deviceId);
    }

    // 7. Update singleton latest reading in 'live_sensor_data'
    const liveRecord = {
      device_id: sanitized.deviceId,
      left_distance_cm: sanitized.leftDistanceCm,
      front_distance_cm: sanitized.frontDistanceCm,
      right_distance_cm: sanitized.rightDistanceCm,
      obstacle_level: sanitized.obstacleLevel,
      gps_latitude: sanitized.gpsLatitude,
      gps_longitude: sanitized.gpsLongitude,
      gps_status: sanitized.gpsStatus,
      sim_status: sanitized.simStatus,
      camera_status: sanitized.cameraStatus,
      battery_voltage: sanitized.batteryVoltage,
      battery_percentage: sanitized.batteryPercentage,
      alert_state: sanitized.alertState,
      timestamp: sanitized.timestamp,
      updated_at: new Date().toISOString(),
    };

    const { error: liveError } = await supabase
      .from("live_sensor_data")
      .upsert(liveRecord, { onConflict: "device_id" });

    if (liveError) {
      console.error("[ingest-device-data] Failed to upsert live_sensor_data:", liveError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to update live sensor reading.",
          details: liveError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // 8. Insert historical telemetry log in 'sensor_history'
    const historyRecord = {
      device_id: sanitized.deviceId,
      left_distance_cm: sanitized.leftDistanceCm,
      front_distance_cm: sanitized.frontDistanceCm,
      right_distance_cm: sanitized.rightDistanceCm,
      obstacle_level: sanitized.obstacleLevel,
      gps_latitude: sanitized.gpsLatitude,
      gps_longitude: sanitized.gpsLongitude,
      battery_voltage: sanitized.batteryVoltage,
      battery_percentage: sanitized.batteryPercentage,
      timestamp: sanitized.timestamp,
    };

    const { error: histError } = await supabase
      .from("sensor_history")
      .insert(historyRecord);

    if (histError) {
      console.warn("[ingest-device-data] Failed to append sensor_history:", histError);
    }

    // 9. Location breadcrumb record (if GPS fix available)
    if (sanitized.gpsLatitude !== null && sanitized.gpsLongitude !== null) {
      await supabase.from("locations").insert({
        device_id: sanitized.deviceId,
        latitude: sanitized.gpsLatitude,
        longitude: sanitized.gpsLongitude,
        timestamp: sanitized.timestamp,
      });
    }

    // 10. Record alerts ONLY when supported by actual readings or an explicit event
    let alertCreated = false;
    let createdAlertInfo: any = null;

    if (sanitized.isSosEvent) {
      // Explicit SOS Panic Button Trigger
      const { data: newAlert } = await supabase.from("alerts").insert({
        device_id: sanitized.deviceId,
        type: "emergency_sos",
        severity: "critical",
        message: sanitized.alertMessage || "EMERGENCY SOS: Panic signal activated on cane",
        gps_latitude: sanitized.gpsLatitude,
        gps_longitude: sanitized.gpsLongitude,
        acknowledged: false,
        timestamp: sanitized.timestamp,
      }).select().maybeSingle();

      alertCreated = true;
      createdAlertInfo = newAlert;
    } else if (sanitized.obstacleLevel === "critical") {
      // Verified critical obstacle reading (< 60 cm)
      const minCm = Math.min(
        sanitized.frontDistanceCm > 0 ? sanitized.frontDistanceCm : 500,
        sanitized.leftDistanceCm > 0 ? sanitized.leftDistanceCm : 500,
        sanitized.rightDistanceCm > 0 ? sanitized.rightDistanceCm : 500
      );
      const { data: newAlert } = await supabase.from("alerts").insert({
        device_id: sanitized.deviceId,
        type: "hazard",
        severity: "critical",
        message: `CRITICAL PROXIMITY: Immediate hazard at ${minCm} cm`,
        gps_latitude: sanitized.gpsLatitude,
        gps_longitude: sanitized.gpsLongitude,
        acknowledged: false,
        timestamp: sanitized.timestamp,
      }).select().maybeSingle();

      alertCreated = true;
      createdAlertInfo = newAlert;
    } else if (sanitized.obstacleLevel === "warning") {
      // Verified warning obstacle reading (< 120 cm)
      const minCm = Math.min(
        sanitized.frontDistanceCm > 0 ? sanitized.frontDistanceCm : 500,
        sanitized.leftDistanceCm > 0 ? sanitized.leftDistanceCm : 500,
        sanitized.rightDistanceCm > 0 ? sanitized.rightDistanceCm : 500
      );
      const { data: newAlert } = await supabase.from("alerts").insert({
        device_id: sanitized.deviceId,
        type: "obstacle",
        severity: "warning",
        message: `Proximity Warning: Approaching object at ${minCm} cm`,
        gps_latitude: sanitized.gpsLatitude,
        gps_longitude: sanitized.gpsLongitude,
        acknowledged: false,
        timestamp: sanitized.timestamp,
      }).select().maybeSingle();

      alertCreated = true;
      createdAlertInfo = newAlert;
    } else if (sanitized.batteryPercentage <= 15) {
      // Verified low battery event
      const { data: newAlert } = await supabase.from("alerts").insert({
        device_id: sanitized.deviceId,
        type: "low_battery",
        severity: "warning",
        message: `Low Battery Warning: Cane battery is at ${sanitized.batteryPercentage}%`,
        gps_latitude: sanitized.gpsLatitude,
        gps_longitude: sanitized.gpsLongitude,
        acknowledged: false,
        timestamp: sanitized.timestamp,
      }).select().maybeSingle();

      alertCreated = true;
      createdAlertInfo = newAlert;
    }

    // 11. Return successful response with ingestion summary
    return new Response(
      JSON.stringify({
        success: true,
        message: "Telemetry ingested successfully.",
        data: {
          deviceId: sanitized.deviceId,
          timestamp: sanitized.timestamp,
          distances: {
            left_cm: sanitized.leftDistanceCm,
            front_cm: sanitized.frontDistanceCm,
            right_cm: sanitized.rightDistanceCm,
          },
          obstacleLevel: sanitized.obstacleLevel,
          alertState: sanitized.alertState,
          battery: sanitized.batteryPercentage,
          alertCreated,
          alert: createdAlertInfo ? { id: createdAlertInfo.id, type: createdAlertInfo.type, severity: createdAlertInfo.severity } : null,
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("[ingest-device-data] Unhandled exception:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error occurred while processing telemetry.",
        message: err?.message || String(err),
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
