-- Nexus Smart Blind Stick - Supabase Database Initial Migration
-- Migration: 20261018000001_nexus_smart_blind_stick_init.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users table (caregivers and administrators)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'caregiver',
  assigned_device_id TEXT DEFAULT 'SBS-001',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Devices table (registered hardware canes)
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Nexus Smart Blind Stick',
  status TEXT NOT NULL DEFAULT 'offline',
  firmware_version TEXT DEFAULT 'v2.4.1-ai-edge',
  last_seen TIMESTAMPTZ,
  api_key_hash TEXT,
  battery_level NUMERIC DEFAULT 100,
  emergency_contact TEXT DEFAULT '+1 (555) 019-2834',
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_devices_device_id ON public.devices(device_id);

-- 3. Live Sensor Data table (singleton current active telemetry record per device)
CREATE TABLE IF NOT EXISTS public.live_sensor_data (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL REFERENCES public.devices(device_id) ON DELETE CASCADE,
  left_distance_cm NUMERIC NOT NULL DEFAULT 0,
  front_distance_cm NUMERIC NOT NULL DEFAULT 0,
  right_distance_cm NUMERIC NOT NULL DEFAULT 0,
  obstacle_level TEXT NOT NULL DEFAULT 'clear',
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  gps_status TEXT DEFAULT 'no_fix',
  sim_status TEXT DEFAULT 'disconnected',
  camera_status TEXT DEFAULT 'idle',
  battery_voltage NUMERIC,
  battery_percentage NUMERIC DEFAULT 100,
  alert_state TEXT DEFAULT 'none',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_sensor_device_id ON public.live_sensor_data(device_id);

-- 4. Sensor History table (timestamped historical readings for charts)
CREATE TABLE IF NOT EXISTS public.sensor_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES public.devices(device_id) ON DELETE CASCADE,
  left_distance_cm NUMERIC,
  front_distance_cm NUMERIC,
  right_distance_cm NUMERIC,
  obstacle_level TEXT,
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  battery_voltage NUMERIC,
  battery_percentage NUMERIC,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sensor_history_device_timestamp ON public.sensor_history(device_id, timestamp DESC);

-- 5. Alerts table (critical warnings, hazards, and SOS dispatches)
CREATE TABLE IF NOT EXISTS public.alerts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES public.devices(device_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_device_timestamp ON public.alerts(device_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON public.alerts(acknowledged);

-- 6. AI Detections table (Edge vision inferences & pedestrian models)
CREATE TABLE IF NOT EXISTS public.ai_detections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES public.devices(device_id) ON DELETE CASCADE,
  model_name TEXT DEFAULT 'pedestrian-viewer/4',
  label TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  bounding_box JSONB DEFAULT '{}'::jsonb,
  image_url TEXT,
  inference_time_ms INT DEFAULT 35,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_detections_device_timestamp ON public.ai_detections(device_id, timestamp DESC);

-- 7. Obstacles table (backward compatibility for REST API)
CREATE TABLE IF NOT EXISTS public.obstacles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES public.devices(device_id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  distance NUMERIC NOT NULL,
  confidence NUMERIC DEFAULT 0.9,
  danger_level TEXT DEFAULT 'low',
  bounding_box JSONB DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obstacles_device_detected_at ON public.obstacles(device_id, detected_at DESC);

-- 8. Locations table (backward compatibility for REST API)
CREATE TABLE IF NOT EXISTS public.locations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES public.devices(device_id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  altitude NUMERIC DEFAULT 0,
  speed NUMERIC DEFAULT 0,
  address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_device_timestamp ON public.locations(device_id, timestamp DESC);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obstacles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Configure RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profile' AND tablename = 'users') THEN
    CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile' AND tablename = 'users') THEN
    CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view devices' AND tablename = 'devices') THEN
    CREATE POLICY "Authenticated users can view devices" ON public.devices FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view live sensor data' AND tablename = 'live_sensor_data') THEN
    CREATE POLICY "Authenticated users can view live sensor data" ON public.live_sensor_data FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view sensor history' AND tablename = 'sensor_history') THEN
    CREATE POLICY "Authenticated users can view sensor history" ON public.sensor_history FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view alerts' AND tablename = 'alerts') THEN
    CREATE POLICY "Authenticated users can view alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can acknowledge alerts' AND tablename = 'alerts') THEN
    CREATE POLICY "Authenticated users can acknowledge alerts" ON public.alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view ai detections' AND tablename = 'ai_detections') THEN
    CREATE POLICY "Authenticated users can view ai detections" ON public.ai_detections FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view obstacles' AND tablename = 'obstacles') THEN
    CREATE POLICY "Authenticated users can view obstacles" ON public.obstacles FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view locations' AND tablename = 'locations') THEN
    CREATE POLICY "Authenticated users can view locations" ON public.locations FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Enable Realtime publication for live tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices, public.live_sensor_data, public.alerts, public.ai_detections;
ALTER TABLE public.devices REPLICA IDENTITY FULL;
ALTER TABLE public.live_sensor_data REPLICA IDENTITY FULL;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;
ALTER TABLE public.ai_detections REPLICA IDENTITY FULL;

-- Storage: vision-captures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vision-captures',
  'vision-captures',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;
