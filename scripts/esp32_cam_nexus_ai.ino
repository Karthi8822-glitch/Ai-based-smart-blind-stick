/**
 * =========================================================================================
 * Nexus Smart Blind Stick - ESP32-CAM AI Vision Optical Edge Firmware
 * =========================================================================================
 * 
 * Hardware Target:
 *   - AI-Thinker ESP32-CAM (ESP32-S + OV2640 2MP Camera Sensor + On-board Flash LED)
 * 
 * Purpose:
 *   - Captures real-time camera frames (JPEG VGA/SVGA 640x480)
 *   - Securely transmits image buffer directly to the Nexus AI backend (/api/vision/capture)
 *   - Authenticates via 'x-device-id' and 'x-device-key'
 *   - Receives real-time guidance text and obstacle severity from inference engine
 * 
 * Pinout (AI-Thinker OV2640 Standard):
 *   PWDN: 32, RESET: -1, XCLK: 0, SIOD: 26, SIOC: 27
 *   Y9: 35, Y8: 34, Y7: 39, Y6: 36, Y5: 21, Y4: 19, Y3: 18, Y2: 5
 *   VSYNC: 25, HREF: 23, PCLK: 22, FLASH LED: 4
 * =========================================================================================
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClient.h>

// -----------------------------------------------------------------------------------------
// 1. NETWORK & CREDENTIAL CONFIGURATION
// -----------------------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server endpoint configuration (use your computer's local LAN IP for local testing, e.g. 192.168.1.50)
const char* SERVER_HOST   = "192.168.1.100";  // IP of the computer running 'server'
const int   SERVER_PORT   = 5001;
const char* CAPTURE_PATH  = "/api/vision/capture";

// Device Authentication Credentials
const char* DEVICE_ID     = "nexus-01";
const char* DEVICE_KEY    = "nexus-sbs-device-credential-token";

// Frame Capture Interval (milliseconds)
const unsigned long CAPTURE_INTERVAL_MS = 4000;  // Capture and analyze frame every 4 seconds

// Optional: Flash LED illumination during capture
#define USE_FLASH_LED false
#define FLASH_LED_PIN 4

// -----------------------------------------------------------------------------------------
// 2. AI-THINKER ESP32-CAM PIN DEFINITIONS
// -----------------------------------------------------------------------------------------
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

unsigned long lastCaptureTime = 0;

// -----------------------------------------------------------------------------------------
// 3. CAMERA INITIALIZATION
// -----------------------------------------------------------------------------------------
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Optimize based on PSRAM availability
  if (psramFound()) {
    Serial.println(F("[Camera] PSRAM Detected! Configuring SVGA 800x600 high quality buffer."));
    config.frame_size   = FRAMESIZE_VGA;  // 640x480: optimal for fast inference & low latency
    config.jpeg_quality = 12;             // 0-63, lower is higher quality
    config.fb_count     = 2;              // Double buffer for smooth capture
  } else {
    Serial.println(F("[Camera] No PSRAM detected. Using internal DRAM (VGA 640x480)."));
    config.frame_size   = FRAMESIZE_VGA;
    config.jpeg_quality = 15;
    config.fb_count     = 1;
  }

  // Camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[Camera Error] esp_camera_init failed with error 0x%x\n", err);
    return false;
  }

  // Sensor adjustments for blind stick forward perspective
  sensor_t *s = esp_camera_sensor_get();
  if (s != NULL) {
    s->set_brightness(s, 1);   // -2 to 2
    s->set_contrast(s, 1);     // -2 to 2
    s->set_saturation(s, 0);   // -2 to 2
    s->set_whitebal(s, 1);     // 0 = disable, 1 = enable
    s->set_awb_gain(s, 1);     // 0 = disable, 1 = enable
    s->set_wb_mode(s, 0);      // 0 to 4 - 0: Auto, 1: Sunny, 2: Cloudy, 3: Office, 4: Home
  }

  Serial.println(F("[Camera] OV2640 Optical Sensor Initialized Successfully!"));
  return true;
}

// -----------------------------------------------------------------------------------------
// 4. CAPTURE AND TRANSMIT FRAME TO BACKEND
// -----------------------------------------------------------------------------------------
bool captureAndSendFrame() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[Network] WiFi not connected. Skipping capture."));
    return false;
  }

#if USE_FLASH_LED
  digitalWrite(FLASH_LED_PIN, HIGH);
  delay(50);
#endif

  Serial.println(F("\n[Capture] Grabbing frame buffer from OV2640..."));
  unsigned long captureStart = millis();

  camera_fb_t *fb = esp_camera_fb_get();

#if USE_FLASH_LED
  digitalWrite(FLASH_LED_PIN, LOW);
#endif

  if (!fb) {
    Serial.println(F("[Capture Error] Frame capture failed! Null buffer returned."));
    return false;
  }

  Serial.printf("[Capture] Frame acquired: %u bytes in %lu ms (%dx%d)\n",
                fb->len, millis() - captureStart, fb->width, fb->height);

  // Validate buffer size before upload (< 5MB limit)
  if (fb->len > 5242880) {
    Serial.println(F("[Upload Error] Frame size exceeds 5MB upload limit."));
    esp_camera_fb_return(fb);
    return false;
  }

  // Connect to Nexus REST API Server
  WiFiClient client;
  client.setTimeout(15000);  // 15 seconds connection timeout

  Serial.printf("[Network] Connecting to backend server: %s:%d...\n", SERVER_HOST, SERVER_PORT);
  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.println(F("[Network Error] Connection to backend server failed!"));
    esp_camera_fb_return(fb);
    return false;
  }

  // Construct HTTP POST Request with Authentication Headers
  Serial.println(F("[Network] Sending HTTP POST request with JPEG binary payload..."));
  client.printf("POST %s HTTP/1.1\r\n", CAPTURE_PATH);
  client.printf("Host: %s:%d\r\n", SERVER_HOST, SERVER_PORT);
  client.println(F("User-Agent: ESP32-CAM-Nexus-BlindStick/2.4"));
  client.println(F("Content-Type: image/jpeg"));
  client.printf("Content-Length: %u\r\n", fb->len);
  client.printf("x-device-id: %s\r\n", DEVICE_ID);
  client.printf("x-device-key: %s\r\n", DEVICE_KEY);
  client.println(F("Connection: close\r\n"));

  // Stream raw JPEG bytes in 1024-byte packets
  size_t totalWritten = 0;
  size_t chunkSize = 1024;
  const uint8_t *buf = fb->buf;
  size_t remaining = fb->len;

  unsigned long uploadStart = millis();
  while (remaining > 0) {
    size_t toWrite = (remaining > chunkSize) ? chunkSize : remaining;
    size_t written = client.write(buf + totalWritten, toWrite);
    if (written == 0) {
      Serial.println(F("[Network Error] Socket write stalled!"));
      break;
    }
    totalWritten += written;
    remaining -= written;
  }

  Serial.printf("[Network] Payload uploaded: %u bytes in %lu ms\n", totalWritten, millis() - uploadStart);

  // Return the frame buffer to the driver as quickly as possible
  esp_camera_fb_return(fb);

  // Read Response Status & Headers
  unsigned long respWaitStart = millis();
  while (client.connected() && !client.available()) {
    if (millis() - respWaitStart > 15000) {
      Serial.println(F("[Timeout] Server response timed out (>15s)!"));
      client.stop();
      return false;
    }
    delay(10);
  }

  // Parse HTTP Status Line
  String statusLine = client.readStringUntil('\n');
  Serial.printf("[Server Response] %s\n", statusLine.c_str());

  // Check if 200 OK
  bool isSuccess = statusLine.indexOf("200 OK") >= 0;

  // Skip headers to body
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line == "\r" || line.length() == 0) {
      break;
    }
  }

  // Read response payload
  String responseBody = client.readString();
  Serial.println(F("--- AI Inference JSON Result ---"));
  if (responseBody.length() > 250) {
    Serial.println(responseBody.substring(0, 250) + "... [truncated]");
  } else {
    Serial.println(responseBody);
  }

  client.stop();
  return isSuccess;
}

// -----------------------------------------------------------------------------------------
// 5. ARDUINO SETUP & LOOP
// -----------------------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println(F("\n======================================================="));
  Serial.println(F("🦯 Nexus Smart Blind Stick - ESP32-CAM AI Vision Node"));
  Serial.println(F("======================================================="));

#if USE_FLASH_LED
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);
#endif

  // 1. Initialize OV2640 Camera
  if (!initCamera()) {
    Serial.println(F("[Fatal] Camera init failed. Halting system. Check ribbon cable."));
    while (true) {
      delay(1000);
    }
  }

  // 2. Connect to WiFi
  Serial.printf("[WiFi] Connecting to %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(F("."));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[WiFi] Connected successfully!"));
    Serial.print(F("[WiFi] IP Address: "));
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(F("\n[WiFi Warning] Connection failed. Will retry in loop."));
  }

  Serial.println(F("[System] ESP32-CAM AI Vision ready. Starting frame capture loop...\n"));
}

void loop() {
  // Maintain WiFi Connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WiFi] Reconnecting..."));
    WiFi.disconnect();
    WiFi.reconnect();
    delay(3000);
    return;
  }

  unsigned long currentMillis = millis();
  if (currentMillis - lastCaptureTime >= CAPTURE_INTERVAL_MS) {
    lastCaptureTime = currentMillis;
    captureAndSendFrame();
  }

  delay(50);
}
