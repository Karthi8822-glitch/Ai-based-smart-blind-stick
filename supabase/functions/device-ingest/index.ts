import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id, x-device-key",
  "Content-Type": "application/json",
};

// SHA-256 helper for device credential validation
async function hashKey(key: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed. Use POST." }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration missing." }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));

    // Device credentials from headers or payload body
    const deviceId = (req.headers.get("x-device-id") || body.deviceId || body.device_id || "SBS-001").toUpperCase().trim();
    const deviceKey = req.headers.get("x-device-key") || body.deviceKey || body.apiKey || body.api_key || "";

    if (!deviceId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing device_id." }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Lookup device in database
    const { data: device, error: devError } = await supabase
      .from("devices")
      .select("id, device_id, name, api_key_hash, status")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (devError) {
      return new Response(
        JSON.stringify({ success: false, error: "Database error fetching device.", details: devError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Credential check if device has a registered key hash
    if (device && device.api_key_hash) {
      const hashedProvided = await hashKey(deviceKey);
      if (hashedProvided !== device.api_key_hash) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid device credential." }),
          { status: 401, headers: corsHeaders }
        );
      }
    } else if (!device) {
      // Auto-register device profile
      const defaultHash = deviceKey ? await hashKey(deviceKey) : null;
      await supabase.from("devices").insert({
        device_id: deviceId,
        name: body.deviceName || `Nexus Cane ${deviceId}`,
        status: "online",
        api_key_hash: defaultHash,
        last_seen: new Date().toISOString(),
      });
    }

    // Sanitize distances
    const leftDist = typeof body.left_distance_cm === "number" ? body.left_distance_cm : (typeof body.leftDistance === "number" ? body.leftDistance : 0);
    const frontDist = typeof body.front_distance_cm === "number" ? body.front_distance_cm : (typeof body.frontDistance === "number" ? body.frontDistance : (typeof body.distance === "number" ? body.distance * 100 : 0));
    const rightDist = typeof body.right_distance_cm === "number" ? body.right_distance_cm : (typeof body.rightDistance === "number" ? body.rightDistance : 0);

    const clampDist = (d: number) => Math.max(0, Math.min(500, Math.round(d * 10) / 10));
    const validLeft = clampDist(leftDist);
    const validFront = clampDist(frontDist);
    const validRight = clampDist(rightDist);

    // Hazard distance evaluation
    const minDistance = Math.min(
      validFront > 0 ? validFront : 500,
      validLeft > 0 ? validLeft : 500,
      validRight > 0 ? validRight : 500
    );

    let obstacleLevel = "clear";
    let alertState = "none";

    if (minDistance < 60) {
      obstacleLevel = "critical";
      alertState = "dual";
    } else if (minDistance < 120) {
      obstacleLevel = "warning";
      alertState = "vibration";
    } else if (minDistance < 180) {
      obstacleLevel = "caution";
      alertState = "buzzer";
    }

    if (body.alertState || body.alert) {
      alertState = body.alertState || body.alert;
    }

    // Location fields
    let gpsLat = typeof body.gps_latitude === "number" ? body.gps_latitude : (typeof body.latitude === "number" ? body.latitude : null);
    let gpsLng = typeof body.gps_longitude === "number" ? body.gps_longitude : (typeof body.longitude === "number" ? body.longitude : null);

    if (gpsLat !== null && (gpsLat < -90 || gpsLat > 90)) gpsLat = null;
    if (gpsLng !== null && (gpsLng < -180 || gpsLng > 180)) gpsLng = null;

    // Battery
    let batteryPct = typeof body.battery_percentage === "number" ? body.battery_percentage : (typeof body.battery === "number" ? body.battery : null);
    if (batteryPct !== null) batteryPct = Math.max(0, Math.min(100, Math.round(batteryPct)));

    const batteryVolt = typeof body.battery_voltage === "number" ? Math.max(0, Math.min(12, body.battery_voltage)) : null;

    const gpsStatus = body.gps_status || (gpsLat !== null ? "fix_3d" : "no_fix");
    const simStatus = body.sim_status || "connected";
    const cameraStatus = body.camera_status || "idle";
    const nowIso = new Date().toISOString();

    // 1. Update devices table
    await supabase
      .from("devices")
      .update({
        status: "online",
        last_seen: nowIso,
        battery_level: batteryPct ?? 100,
        updated_at: nowIso,
      })
      .eq("device_id", deviceId);

    // 2. Upsert live_sensor_data (one record per device for instant lookup)
    const livePayload = {
      device_id: deviceId,
      left_distance_cm: validLeft,
      front_distance_cm: validFront,
      right_distance_cm: validRight,
      obstacle_level: obstacleLevel,
      gps_latitude: gpsLat,
      gps_longitude: gpsLng,
      gps_status: gpsStatus,
      sim_status: simStatus,
      camera_status: cameraStatus,
      battery_voltage: batteryVolt,
      battery_percentage: batteryPct ?? 100,
      alert_state: alertState,
      timestamp: nowIso,
      updated_at: nowIso,
    };

    await supabase
      .from("live_sensor_data")
      .upsert(livePayload, { onConflict: "device_id" });

    // 3. Append to sensor_history for time-series charts
    await supabase.from("sensor_history").insert({
      device_id: deviceId,
      left_distance_cm: validLeft,
      front_distance_cm: validFront,
      right_distance_cm: validRight,
      obstacle_level: obstacleLevel,
      gps_latitude: gpsLat,
      gps_longitude: gpsLng,
      battery_voltage: batteryVolt,
      battery_percentage: batteryPct,
      timestamp: nowIso,
    });

    // 4. Record alert event if critical or SOS
    let alertCreated = false;
    if (obstacleLevel === "critical" || alertState === "sos" || body.alertMessage) {
      const alertType = alertState === "sos" ? "sos" : (body.alertType || "obstacle");
      const severity = alertState === "sos" ? "critical" : (obstacleLevel === "critical" ? "critical" : "warning");
      const message = body.alertMessage || (
        alertState === "sos"
          ? "EMERGENCY SOS button pressed by cane user"
          : `Critical obstacle detected at ${minDistance}cm in front path`
      );

      await supabase.from("alerts").insert({
        device_id: deviceId,
        type: alertType,
        severity: severity,
        message: message,
        gps_latitude: gpsLat,
        gps_longitude: gpsLng,
        acknowledged: false,
        timestamp: nowIso,
      });
      alertCreated = true;
    }

    return new Response(
      JSON.stringify({
        success: true,
        deviceId,
        timestamp: nowIso,
        obstacleLevel,
        alertState,
        alertCreated,
        feedbackDirective: {
          buzzerHz: alertState === "dual" ? 2400 : (alertState === "buzzer" ? 1200 : 0),
          hapticPulseMs: alertState === "dual" ? 500 : (alertState === "vibration" ? 250 : 0),
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Unknown error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
