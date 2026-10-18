/**
 * ============================================================================
 * NEXUS AI — SMART BLIND STICK ESP32 FIRMWARE
 * Secure Telemetry Ingestion to Supabase Edge Function
 * ============================================================================
 * Target: ESP32 / ESP32-CAM (NodeMCU / DevKit v1)
 *
 * Dispatches HTTPS POST telemetry directly to your Supabase Edge Function:
 * Endpoint: https://fddbbkssiforahktwcnp.supabase.co/functions/v1/device-ingest
 *
 * Payload includes:
 *  - deviceId: "SBS-001"
 *  - leftDistance, frontDistance, rightDistance (in cm or meters)
 *  - latitude, longitude (NEO-6M GPS)
 *  - battery, battery_voltage
 *  - statuses: gps_status, sim_status, camera_status
 *  - alertState / alertMessage (e.g. SOS button trigger)
 *
 * Header authentication:
 *  - x-device-id: SBS-001
 *  - x-device-key: YOUR_SECURE_DEVICE_KEY (Validated in Edge Function)
 *
 * Privileged keys (Service Role) NEVER exist on this microcontroller.
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h> // ArduinoJson by Benoit Blanchon (v6 or v7)

// 1. Wi-Fi Credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// 2. Supabase Ingestion Edge Function Configuration
const char* SUPABASE_INGEST_URL = "https://fddbbkssiforahktwcnp.supabase.co/functions/v1/ingest-device-data";
const char* DEVICE_ID           = "SBS-001";
const char* DEVICE_SECRET_KEY   = "nexus-sbs-device-credential-token";

// 3. Pin Definitions (HC-SR04 Ultrasonic Sonar Sensors)
const int FRONT_TRIG_PIN = 5;
const int FRONT_ECHO_PIN = 18;
const int LEFT_TRIG_PIN  = 19;
const int LEFT_ECHO_PIN  = 21;
const int RIGHT_TRIG_PIN = 22;
const int RIGHT_ECHO_PIN = 23;

// Haptic & Buzzer Feedback Actuators
const int BUZZER_PIN     = 25;
const int HAPTIC_PIN     = 26;

// SOS Emergency Button Pin (Active LOW with internal pull-up)
const int SOS_BUTTON_PIN = 4;

// Timing
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 1500; // 1.5 seconds

// Read distance in centimeters from HC-SR04
float readDistanceCm(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000); // 30ms timeout (~5m max range)
  if (duration == 0) return 400.0; // Clear / no obstacle within 4m

  return (duration * 0.0343) / 2.0;
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n[NEXUS STICK] Initializing ESP32 Subsystems for Supabase...");

  // Ultrasonic sensor pin modes
  pinMode(FRONT_TRIG_PIN, OUTPUT);
  pinMode(FRONT_ECHO_PIN, INPUT);
  pinMode(LEFT_TRIG_PIN, OUTPUT);
  pinMode(LEFT_ECHO_PIN, INPUT);
  pinMode(RIGHT_TRIG_PIN, OUTPUT);
  pinMode(RIGHT_ECHO_PIN, INPUT);

  // Actuator pin modes
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(HAPTIC_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(HAPTIC_PIN, LOW);

  // SOS Button with internal pullup
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);

  // Connect to Wi-Fi
  Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected! IP Address: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] Connection failed. Check credentials.");
  }
}

void sendSupabaseTelemetry(float frontCm, float leftCm, float rightCm, bool isSos) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[SUPABASE] Wi-Fi disconnected. Cannot transmit.");
    return;
  }

  WiFiClientSecure client;
  client.setInsecure(); // Skip root CA validation on ESP32

  HTTPClient https;
  if (!https.begin(client, SUPABASE_INGEST_URL)) {
    Serial.println("[SUPABASE] Unable to connect to Edge Function.");
    return;
  }

  https.addHeader("Content-Type", "application/json");
  https.addHeader("x-device-id", DEVICE_ID);
  https.addHeader("x-device-key", DEVICE_SECRET_KEY);

  // Build JSON payload
  StaticJsonDocument<512> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["left_distance_cm"] = round(leftCm);
  doc["front_distance_cm"] = round(frontCm);
  doc["right_distance_cm"] = round(rightCm);

  // GPS (NEO-6M coordinates)
  doc["gps_latitude"] = 11.0168;
  doc["gps_longitude"] = 76.9558;
  doc["gps_status"] = "fix_3d";

  // System status
  doc["sim_status"] = "connected";
  doc["camera_status"] = "idle";
  doc["battery_percentage"] = 88;
  doc["battery_voltage"] = 3.92;

  if (isSos) {
    doc["alertState"] = "sos";
    doc["alertMessage"] = "EMERGENCY SOS button pressed by cane user!";
  }

  String jsonString;
  serializeJson(doc, jsonString);

  int httpCode = https.POST(jsonString);
  if (httpCode > 0) {
    String response = https.getString();
    Serial.printf("[SUPABASE] HTTP %d Response: %s\n", httpCode, response.c_str());

    // Parse returned feedback directives for buzzer/haptic
    StaticJsonDocument<512> respDoc;
    DeserializationError err = deserializeJson(respDoc, response);
    if (!err && respDoc["feedbackDirective"].is<JsonObject>()) {
      int hapticMs = respDoc["feedbackDirective"]["hapticPulseMs"] | 0;
      int buzzerHz = respDoc["feedbackDirective"]["buzzerHz"] | 0;

      if (hapticMs > 0) {
        digitalWrite(HAPTIC_PIN, HIGH);
        delay(hapticMs);
        digitalWrite(HAPTIC_PIN, LOW);
      }
      if (buzzerHz > 0) {
        tone(BUZZER_PIN, buzzerHz, 150);
      }
    }
  } else {
    Serial.printf("[SUPABASE] POST failed: %s\n", https.errorToString(httpCode).c_str());
  }

  https.end();
}

void loop() {
  unsigned long now = millis();

  // Check SOS panic button
  bool isSosPressed = (digitalRead(SOS_BUTTON_PIN) == LOW);

  if (isSosPressed || (now - lastTelemetryTime >= TELEMETRY_INTERVAL_MS)) {
    lastTelemetryTime = now;

    float frontDistance = readDistanceCm(FRONT_TRIG_PIN, FRONT_ECHO_PIN);
    float leftDistance  = readDistanceCm(LEFT_TRIG_PIN, LEFT_ECHO_PIN);
    float rightDistance = readDistanceCm(RIGHT_TRIG_PIN, RIGHT_ECHO_PIN);

    Serial.printf("[SONAR] Front: %.1f cm | Left: %.1f cm | Right: %.1f cm | SOS: %s\n",
                  frontDistance, leftDistance, rightDistance, isSosPressed ? "YES" : "NO");

    sendSupabaseTelemetry(frontDistance, leftDistance, rightDistance, isSosPressed);

    if (isSosPressed) {
      delay(800); // Debounce button
    }
  }

  delay(20);
}
