# NOVOS AI — Smart Blind Stick

> **Next-Generation Assistive Mobility System with Ultrasonic Sonar, Edge AI Computer Vision, and Haptic Feedback.**
> Inspired by minimal editorial product aesthetics, generous whitespace, large architectural typography, and responsive real-time telemetry.

---

## 🌟 Project Overview

**NOVOS AI** is an advanced assistive technology project designed to empower visually impaired travelers with proactive spatial perception. Traditional walking canes rely entirely on physical ground contact, making it impossible to detect head-height barriers, moving cyclists, or drops before direct collision. 

NOVOS combines:
- **HC-SR04 Dual Ultrasonic Sonar**: 40 kHz acoustic time-of-flight ranging with millimeter accuracy.
- **ESP32-CAM Optical Neural Module**: Edge computer vision using quantized TensorFlow Lite models to identify people, vehicles, obstacles, and staircases.
- **Precision ERM Haptic Motor**: Directional vibration pulses delivered directly into the ergonomic grip.
- **Frequency-Modulated Acoustic Buzzer**: Variable duty-cycle tones that shift from 400 Hz blips to 2.4 kHz hazard warnings.
- **NEO-6M Satellite Navigation GPS**: Continuous geofencing, route tracking, and caregiver emergency alerts.
- **Full-Stack IoT Telemetry Platform**: Real-time REST API, WebSocket-ready architecture, and an editorial interactive web portal.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite 8](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) + Custom Obsidian/Titanium Theme
- **Motion & Transitions**: [Framer Motion](https://www.framer.com/motion/)
- **Smooth Scrolling**: [Lenis](https://github.com/darkroomengineering/lenis)
- **3D Visualization**: [Three.js](https://threejs.org/) Interactive Canvas with Custom Lighting & Sonar Shaders
- **Audio Synthesizer**: Web Audio API (real-time distance-modulated sonar pings, hazard alarms, and haptic sub-bass rumble)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (v18+)
- **Server**: [Express.js](https://expressjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **Database**: [MongoDB](https://www.mongodb.com/) via [Mongoose](https://mongoosejs.com/) (with an automated in-memory fallback layer for offline/demo reliability)
- **Authentication**: JSON Web Tokens (JWT) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Security**: CORS, parameter validation, environment isolation

---

## 📁 Repository Structure

```text
AI smart blind stick/
├── client/                     # Vite + React + TypeScript Frontend
│   ├── public/
│   │   └── assets/             # Studio photography (1.jpg, 2.jpg, 3.jpg) and 40-frame sequence
│   │       └── frames/         # 40-frame LiDAR pulse sequence (ezgif-frame-001.jpg to 040.jpg)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Sticky/compact navigation with audio & mode switches
│   │   │   ├── Hero.tsx               # Full-screen editorial hero with 3 view modes
│   │   │   ├── FrameScrollCanvas.tsx  # Interactive 40-frame canvas scrubber
│   │   │   ├── Stick3DViewer.tsx      # Three.js 3D cane model with sonar pulse
│   │   │   ├── StorySection.tsx       # Large editorial statement & 3.jpg photo
│   │   │   ├── ProblemSection.tsx     # The Challenge (Obstacles, Distance, Feedback)
│   │   │   ├── TechnologySection.tsx  # 6 Subsystems & macro 2.jpg photo
│   │   │   ├── HowItWorks.tsx         # 5-step animated sequence (01 to 05)
│   │   │   ├── AIVisionSection.tsx    # Roboflow pedestrian-viewer/4 Instance Segmentation HUD, Polygon Masks & Live Webcam
│   │   │   ├── HardwareSection.tsx    # Pinouts, circuits, and full hardware specs
│   │   │   ├── LiveDashboard.tsx      # Real-time telemetry, Sonar Radar, GPS map
│   │   │   ├── AboutSection.tsx       # Research mission & engineering details
│   │   │   ├── ContactSection.tsx     # Interactive inquiry & schematics request
│   │   │   ├── Footer.tsx             # Architecture tags & academic credits
│   │   │   └── ui/                    # Reusable Button, Cards, SectionTitle, Reveals
│   │   ├── context/
│   │   │   └── StickDataContext.tsx  # Live telemetry state & alert dispatcher
│   │   ├── services/
│   │   │   └── api.ts                 # Full REST API client with fallback simulation
│   │   ├── utils/
│   │   │   └── soundSynth.ts          # Web Audio API sonar & buzzer synthesizer
│   │   ├── App.tsx
│   │   └── index.css
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                     # Express + TypeScript REST API Backend
│   ├── src/
│   │   ├── config/
│   │   │   └── db.ts                  # Resilient MongoDB connection manager
│   │   ├── controllers/               # Auth, Device, Sensors, Obstacles, Location, Alerts, Dashboard
│   │   ├── middleware/                # JWT authMiddleware and errorHandler
│   │   ├── models/                    # User, Device, SensorData, Obstacle, Location, Alert, AIDetection
│   │   ├── routes/                    # Modular Express routes
│   │   ├── services/
│   │   │   └── dataService.ts         # Hybrid Mongoose & in-memory data store
│   │   └── index.ts                   # Express server entry point
│   ├── .env.example
│   ├── tsconfig.json
│   └── package.json
│
├── 1.jpg                       # Studio pedestal photograph
├── 2.jpg                       # Macro optical lens & circuit photography
├── 3.jpg                       # Urban contextual field-test photography
├── frames/                     # Source 40-frame sequence images
├── package.json                # Root monorepo script coordinator
└── README.md                   # Complete documentation
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher (`node -v`)
- **npm**: `v9.0.0` or higher (`npm -v`)
- **MongoDB** *(Optional)*: If running locally or via MongoDB Atlas; the server will automatically fallback to an in-memory resilient data layer if MongoDB is not active!

### 2. Install Dependencies
Run the install command from the root directory:
```bash
npm run install:all
```
*(Or install in both folders: `cd client && npm install && cd ../server && npm install`)*

---

## 🚀 Running the Application

### Option A: Run Both Frontend & Backend Concurrently (Recommended)
From the project root:
```bash
npm run dev
```
- **Frontend URL**: `http://localhost:5173`
- **Backend API URL**: `http://localhost:5001`

### Option B: Run Individually
In one terminal (Backend):
```bash
cd server
npm run dev
```

In a second terminal (Frontend):
```bash
cd client
npm run dev
```

---

## 📡 REST API Documentation

Base URL: `http://localhost:5001/api`

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new caregiver or researcher | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token | No |
| `GET` | `/api/device/status?deviceId=SBS-001` | Retrieve device online state & battery | No |
| `POST` | `/api/device/register` | Register new Smart Blind Stick hardware | No |
| `GET` | `/api/sensors/latest?deviceId=SBS-001` | Fetch latest real-time sensor reading | No |
| `POST` | `/api/sensors/data` | Ingest sensor telemetry from ESP32 | No |
| `GET` | `/api/obstacles?deviceId=SBS-001` | Retrieve detected obstacles feed | No |
| `POST` | `/api/obstacles` | Log an AI-detected obstacle | No |
| `GET` | `/api/location/latest?deviceId=SBS-001` | Get current GPS satellite coordinates | No |
| `POST` | `/api/vision/infer` | Run Roboflow `pedestrian-viewer/4` instance segmentation | No |
| `GET` | `/api/vision/samples` | List available pedestrian & walkway scenarios | No |
| `GET` | `/api/vision/status` | Check Roboflow model status & configuration | No |
| `POST` | `/api/location` | Update stick geolocation coordinates | No |
| `GET` | `/api/alerts?deviceId=SBS-001` | Fetch warning & incident alerts | No |
| `POST` | `/api/alerts` | Queue a buzzer / vibration alert | No |
| `GET` | `/api/dashboard?deviceId=SBS-001` | Unified telemetry summary payload | No |

### Sample Telemetry Ingestion Payload (`POST /api/sensors/data`)
```json
{
  "deviceId": "SBS-001",
  "distance": 1.8,
  "object": "person",
  "confidence": 0.97,
  "latitude": 11.0168,
  "longitude": 76.9558,
  "battery": 82,
  "alert": "vibration"
}
```

---

## 👁️ Roboflow AI Model Integration: `pedestrian-viewer/4`

The project integrates the Roboflow **`pedestrian-viewer/4`** Instance Segmentation model hosted on Roboflow Serverless Cloud API.

### Features
- **Instance Segmentation**: Outputs precise polygon coordinates (`points: [{x, y}]`) marking exact walkway margins (`sidewalk`), borders (`verge`), obstacles, and pedestrians.
- **Secure Key Management**: API key is loaded securely from the backend environment variable `ROBOFLOW_API_KEY` in `server/.env` and never exposed to the client or version control.
- **Header Authentication**: Requests are authenticated via `Authorization: Bearer <KEY>` header (compatible with inference v1.5.0+).
- **Spatial Telemetry & Obstacle Sync**: Predictions are analyzed for distance and danger status, automatically triggering audio sonar pings, text-to-speech guidance, and synchronizing with the Smart Blind Stick's live obstacle feed.

### 1. Run Inference via CLI
Run the model on any local image or remote URL using the built-in runner:

```bash
# Run on default sample (3.jpg)
npm run inference

# Or specify any local file or URL:
node scripts/run-inference.js 3.jpg
node scripts/run-inference.js 1.jpg
node scripts/run-inference.js https://images.unsplash.com/photo-1519741497674-611481863552?w=800
```

### 2. Run Inference via Website
Navigate to the **Edge Neural Perception** section (`#ai-vision`) on `http://localhost:5173`:
1. **Select Scenarios**: Click between presets like **Sidewalk Traversal (3.jpg)**, **Road Crossing (1.jpg)**, **Urban Margin (2.jpg)**, or **Verge Margin (Frame 001)**.
2. **Upload Custom Photos**: Click **Upload Photo** to test your own street or corridor images.
3. **Live Camera Mode**: Activate your webcam to stream real-time video, snap frames, or enable continuous auto-scanning.
4. **Interactive HUD**: View the glowing SVG segmentation polygon masks, bounding boxes, range estimation, and auditory sonar pings.
5. **Inspect Raw JSON**: Click **Inspect Raw Roboflow JSON** to open the developer telemetry drawer with complete API payload and copy-to-clipboard functionality.

---

## 🔌 Hardware Circuit & Wiring Architecture

```text
                  +-----------------------------------+
                  |        ESP32 DUAL-CORE BRAIN      |
                  |             (240 MHz)             |
                  +-----------------------------------+
                     |         |         |         |
          GPIO 5 (TRIG)   GPIO 19    GPIO 21    UART2 (16/17)
          GPIO 18 (ECHO)  (PWM)      (PWM/NPN)   (TX/RX)
                     |         |         |         |
                     v         v         v         v
                +---------+ +-------+ +-------+ +-----------+
                | HC-SR04 | | PIEZO | | HAPTIC| | ESP32-CAM |
                |  SONAR  | | BUZZER| | MOTOR | | AI VISION |
                +---------+ +-------+ +-------+ +-----------+
```

1. **HC-SR04 Ultrasonic Sonar**:
   - `TRIG` -> `ESP32 GPIO 5`
   - `ECHO` -> `ESP32 GPIO 18` *(via 1kΩ/2kΩ voltage divider to step 5V down to 3.3V)*
   - `VCC` -> `5V Rail`
   - `GND` -> `Common GND`

2. **Piezo Buzzer**:
   - Positive -> `ESP32 GPIO 19` *(with 100Ω current limiting resistor)*
   - Negative -> `Common GND`

3. **Vibration Motor**:
   - Positive -> `3.3V Rail`
   - Negative -> Collector of `2N2222 NPN Transistor`
   - Base of 2N2222 -> `ESP32 GPIO 21` *(via 1kΩ base resistor)*
   - Emitter -> `Common GND`
   - Flyback Diode: `1N4001` across motor terminals

4. **ESP32-CAM (AI Vision)**:
   - `TX` -> `ESP32 GPIO 16 (RX2)`
   - `RX` -> `ESP32 GPIO 17 (TX2)`
   - `VCC` -> `5V Regulated Rail`
   - `GND` -> `Common GND`

5. **NEO-6M GPS Module**:
   - `TX` -> `ESP32 GPIO 4`
   - `RX` -> `ESP32 GPIO 2`
   - `VCC` -> `3.3V Rail`
   - `GND` -> `Common GND`

---

## ⚙️ Environment Variables

### Server (`server/.env`)
```ini
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/smart-blind-stick
JWT_SECRET=novos_ai_smart_blind_stick_secure_key_2026_jwt_token
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
DEFAULT_DEVICE_ID=SBS-001
```

### Client (`client/.env`)
```ini
VITE_API_URL=http://localhost:5001/api
```

---

## 📦 Production Build & Deployment

To generate optimized production bundles:
```bash
# Build both client and server
npm run build

# Preview client build locally
npm run client:preview

# Start production backend server
npm run server
```

---

## 🎓 Academic Capstone Credits
- **Project**: AI Smart Blind Stick (NOVOS)
- **Domain**: Assistive Robotics & Edge Artificial Intelligence
- **Year**: Class of 2026
