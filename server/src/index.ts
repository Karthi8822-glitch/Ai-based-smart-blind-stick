import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, isDbConnected } from './config/db';
import { checkSupabaseConnection, isSupabaseConnected } from './config/supabase';
import authRoutes from './routes/authRoutes';
import deviceRoutes from './routes/deviceRoutes';
import sensorRoutes from './routes/sensorRoutes';
import obstacleRoutes from './routes/obstacleRoutes';
import locationRoutes from './routes/locationRoutes';
import alertRoutes from './routes/alertRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import visionRoutes from './routes/visionRoutes';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp', 'application/octet-stream'],
  limit: '5mb',
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health / Welcome Check
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ONLINE',
    project: 'Nexus AI Smart Blind Stick REST API',
    version: '2.4.1',
    supabaseConnected: isSupabaseConnected(),
    database: isSupabaseConnected()
      ? 'Supabase PostgreSQL Cloud'
      : isDbConnected()
      ? 'MongoDB Connected'
      : 'Resilient In-Memory Mode',
    endpoints: {
      auth: ['POST /api/auth/register', 'POST /api/auth/login'],
      device: ['GET /api/device/status', 'POST /api/device/register'],
      sensors: ['GET /api/sensors/latest', 'POST /api/sensors/data'],
      obstacles: ['GET /api/obstacles', 'POST /api/obstacles'],
      location: ['GET /api/location/latest', 'POST /api/location'],
      alerts: ['GET /api/alerts', 'POST /api/alerts'],
      dashboard: ['GET /api/dashboard'],
      vision: [
        'POST /api/vision/infer (Roboflow pedestrian-viewer/4 instance segmentation)',
        'GET /api/vision/samples',
        'GET /api/vision/status',
      ],
    },
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: isSupabaseConnected()
      ? 'Supabase PostgreSQL'
      : isDbConnected()
      ? 'MongoDB Connected'
      : 'Resilient In-Memory Mode',
    supabaseConnected: isSupabaseConnected(),
    mongoConnected: isDbConnected(),
    roboflowModel: process.env.ROBOFLOW_MODEL_ID || 'pedestrian-viewer/4',
    roboflowConfigured: Boolean(process.env.ROBOFLOW_API_KEY),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/obstacles', obstacleRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/vision', visionRoutes);

// Centralized Error Handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  // Check Supabase connection
  await checkSupabaseConnection();

  // Connect to MongoDB if available (fallback)
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Nexus AI Smart Blind Stick Server running on port ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`⚡ Supabase DB: ${isSupabaseConnected() ? 'CONNECTED (PostgreSQL Cloud)' : 'OFFLINE'}`);
    console.log(`🛡️  MongoDB Status: ${isDbConnected() ? 'CONNECTED' : 'STANDBY / FALLBACK'}`);
    console.log(`======================================================\n`);
  });
};

startServer();
