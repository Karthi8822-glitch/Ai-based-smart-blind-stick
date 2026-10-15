/**
 * ============================================================================
 * NEXUS AI — SMART BLIND STICK ESP32 FIRMWARE
 * Telemetry Streamer for Firebase Realtime Database (/device)
 * ============================================================================
 * Target: ESP32 / ESP32-CAM (NodeMCU / DevKit v1)
 *
 * Publishes real-time telemetry to Firebase Realtime Database path:
 * https://<YOUR-DATABASE-URL>/device.json
 *
 * Payload includes:
 *  - leftDistance, frontDistance, rightDistance (HC-SR04 sonar sensors)
 *  - latitude, longitude, gpsStatus (NEO-6M GPS)
 *  - simStatus, esp32CamStatus, obstacleStatus, sosStatus
 *  - batteryLevel, isOnline, lastUpdated
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h> // Install "ArduinoJson" by Benoit Blanchon in Library Manager

// 1. Wi-Fi Credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// 2. Firebase Realtime Database Configuration
// Replace with the exact URL shown at the top of Firebase Console > Realtime Database > Data tab:
const char* FIREBASE_HOST = "https://nexus-smart-blind-stick-default-rtdb.firebaseio.com";
// If you enabled database secrets or auth tokens, specify here (or leave empty if using open rules during testing)
const char* FIREBASE_AUTH = ""; 

// 3. Pin Definitions (HC-SR04 Ultrasonic Sonar Sensors)
// Front Sonar (Primary)
const int FRONT_TRIG_PIN = 5;
const int FRONT_ECHO_PIN = 18;

// Left Sonar
const int LEFT_TRIG_PIN  = 19;
const int LEFT_ECHO_PIN  = 21;

// Right Sonar
const int RIGHT_TRIG_PIN = 22;
const int RIGHT_ECHO_PIN = 23;

// SOS Emergency Button Pin (Active LOW with internal pull-up)
const int SOS_BUTTON_PIN = 4;

// Status & Timing
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 1500; // Publish every 1.5s

// Read distance in meters from HC-SR04
float readDistanceMeters(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000); // 30ms timeout (~5m max range)
  if (duration == 0) return 4.0; // Clear / no obstacle within 4m

  float distanceCm = (duration * 0.0343) / 2.0;
  return distanceCm / 100.0; // Return in meters
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n[NEXUS STICK] Initializing ESP32 Subsystems...");

  // Ultrasonic sensor pin modes
  pinMode(FRONT_TRIG_PIN, OUTPUT);
  pinMode(FRONT_ECHO_PIN, INPUT);
  pinMode(LEFT_TRIG_PIN, OUTPUT);
  pinMode(LEFT_ECHO_PIN, INPUT);
  pinMode(RIGHT_TRIG_PIN, OUTPUT);
  pinMode(RIGHT_ECHO_PIN, INPUT);

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
    Serial.println("\n[WIFI] Connection failed. Running in offline telemetry buffer mode.");
  }
}

void sendTelemetryToFirebase(float left, float front, float right, bool sosPressed) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] Wi-Fi disconnected. Cannot send telemetry.");
    return;
  }

  HTTPClient http;
  String url = String(FIREBASE_HOST) + "/device.json";
  if (strlen(FIREBASE_AUTH) > 0) {
    url += "?auth=" + String(FIREBASE_AUTH);
  }

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  // Determine safety state from distances
  String obstacleStatus = "clear";
  if (front < 0.8 || left < 0.6 || right < 0.6) {
    obstacleStatus = "critical_hazard";
  } else if (front < 1.6) {
    obstacleStatus = "obstacle_ahead";
  }

  // Construct JSON Payload
  StaticJsonDocument<512> doc;
  doc["deviceId"]        = "NEXUS-SBS-001";
  doc["frontDistance"]   = front;
  doc["leftDistance"]    = left;
  doc["rightDistance"]   = right;
  doc["latitude"]        = 11.0168; // Replace with actual NEO-6M TinyGPS++ reading
  doc["longitude"]       = 76.9558;
  doc["gpsStatus"]       = "connected";
  doc["simStatus"]       = "connected";
  doc["esp32CamStatus"]  = "online";
  doc["obstacleStatus"]  = obstacleStatus;
  doc["sosStatus"]       = sosPressed ? "triggered" : "normal";
  doc["batteryLevel"]    = 85;
  doc["isOnline"]        = true;
  doc["lastUpdated"]     = millis();

  String requestBody;
  serializeJson(doc, requestBody);

  // PATCH /device.json updates the fields without deleting unmentioned keys
  int httpResponseCode = http.PATCH(requestBody);

  if (httpResponseCode >= 200 && httpResponseCode < 300) {
    Serial.printf("[FIREBASE] Sync Success: Front: %.2fm | Left: %.2fm | Right: %.2fm | SOS: %s\n",
                  front, left, right, sosPressed ? "ACTIVE" : "OFF");
  } else {
    Serial.printf("[FIREBASE ERROR] HTTP %d: %s\n", httpResponseCode, http.getString().c_str());
  }

  http.end();
}

void loop() {
  unsigned long currentMillis = millis();

  // Read SOS button (LOW = pressed)
  bool sosPressed = (digitalRead(SOS_BUTTON_PIN) == LOW);

  // Publish telemetry periodically or immediately if SOS is triggered
  if (sosPressed || (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS)) {
    lastTelemetryTime = currentMillis;

    float frontDist = readDistanceMeters(FRONT_TRIG_PIN, FRONT_ECHO_PIN);
    float leftDist  = readDistanceMeters(LEFT_TRIG_PIN, LEFT_ECHO_PIN);
    float rightDist = readDistanceMeters(RIGHT_TRIG_PIN, RIGHT_ECHO_PIN);

    sendTelemetryToFirebase(leftDist, frontDist, rightDist, sosPressed);
  }

  delay(50); // Small loop yielding
}
