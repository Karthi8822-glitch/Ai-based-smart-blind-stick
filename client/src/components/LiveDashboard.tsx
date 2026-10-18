import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff,
  Battery, 
  MapPin, 
  Radio, 
  ShieldAlert, 
  Volume2, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  Navigation,
  Compass,
  Zap,
  Sliders,
  Send,
  Database,
  Cpu,
  Smartphone,
  Eye,
  Camera,
  Layers,
  Sparkles,
  BellRing,
  Clock,
  AlertCircle
} from 'lucide-react';
import { SectionTitle } from './ui/SectionTitle';
import { DashboardCard } from './ui/DashboardCard';
import { DeviceStatus } from './ui/DeviceStatus';
import { HistoricalTelemetryChart } from './HistoricalTelemetryChart';
import { useStickData } from '../context/StickDataContext';
import { soundSynth } from '../utils/soundSynth';

export const LiveDashboard: React.FC = () => {
  const {
    activeDeviceId,
    isDemoMode,
    setIsDemoMode,
    isDeviceConnected,
    supabaseConnected,
    connectionState,
    dbError,
    isStale,
    historyData,
    isLoadingHistory,
    loadHistory,
    rawDeviceData,
    dashboard,
    sensorData,
    latestAIDetection,
    latestAIDetections,
    isCameraOnline,
    triggerCameraCapture,
    triggerObstacle,
    clearObstacle,
    refreshData,
    simulateAlert,
    saveDeviceTelemetry,
    sendSupabaseTelemetry,
    triggerSOS,
    isMuted
  } = useStickData();

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSavingTest, setIsSavingTest] = useState<boolean>(false);
  const [isCapturingTest, setIsCapturingTest] = useState<boolean>(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    soundSynth.playClick();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleTestSaveDevice = async (preset: 'nominal' | 'hazard' | 'sos') => {
    setIsSavingTest(true);
    try {
      if (preset === 'nominal') {
        await saveDeviceTelemetry({
          deviceId: activeDeviceId,
          leftDistance: 280,
          frontDistance: 320,
          rightDistance: 290,
          latitude: 11.0168,
          longitude: 76.9558,
          gpsStatus: 'fix_3d',
          simStatus: 'connected',
          esp32CamStatus: 'online',
          obstacleStatus: 'clear',
          sosStatus: 'normal',
          batteryLevel: 96,
          isOnline: true
        });
      } else if (preset === 'hazard') {
        await saveDeviceTelemetry({
          deviceId: activeDeviceId,
          leftDistance: 60,
          frontDistance: 75,
          rightDistance: 140,
          latitude: 11.0171,
          longitude: 76.9562,
          gpsStatus: 'fix_3d',
          simStatus: 'connected',
          esp32CamStatus: 'streaming',
          obstacleStatus: 'critical_step_down',
          sosStatus: 'normal',
          batteryLevel: 94,
          isOnline: true
        });
      } else if (preset === 'sos') {
        await saveDeviceTelemetry({
          deviceId: activeDeviceId,
          leftDistance: 40,
          frontDistance: 50,
          rightDistance: 40,
          latitude: 11.0165,
          longitude: 76.9552,
          gpsStatus: 'fix_3d',
          simStatus: 'connected',
          esp32CamStatus: 'online',
          obstacleStatus: 'user_fall_detected',
          sosStatus: 'triggered',
          batteryLevel: 89,
          isOnline: true
        });
      }
    } catch (err) {
      console.error('Failed to dispatch test telemetry to Supabase:', err);
    } finally {
      setIsSavingTest(false);
    }
  };

  const handleTestSupabaseEdge = async () => {
    setIsSavingTest(true);
    try {
      await sendSupabaseTelemetry({
        deviceId: activeDeviceId,
        leftDistance: 120,
        frontDistance: 90,
        rightDistance: 135,
        latitude: 11.0168,
        longitude: 76.9558,
        battery: 92,
        alertState: 'vibration'
      });
      soundSynth.playHapticPulse();
    } catch (err) {
      console.warn('[Supabase Test] Dispatched error:', err);
    } finally {
      setIsSavingTest(false);
    }
  };

  const handleTestCameraCapture = async () => {
    setIsCapturingTest(true);
    try {
      const response = await fetch('/assets/3.jpg');
      const blob = await response.blob();
      await triggerCameraCapture(blob);
      soundSynth.playClick();
    } catch (err: any) {
      console.warn('[Camera Capture Test] notice:', err);
    } finally {
      setIsCapturingTest(false);
    }
  };

  const isOnline = isDemoMode || (isDeviceConnected && !isStale && connectionState === 'connected');
  const isSosActive = sensorData.sosStatus === 'triggered' || sensorData.sosStatus === 'active';

  return (
    <section id="dashboard" className="py-24 sm:py-32 md:py-40 px-6 sm:px-8 max-w-7xl mx-auto border-t border-white/10">
      {/* Emergency SOS Banner (Visible when SOS status is triggered) */}
      <AnimatePresence>
        {isSosActive && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-6 bg-red-950/80 border-2 border-red-500 text-red-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl shadow-red-500/20"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-600 rounded-full animate-bounce">
                <BellRing className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-mono text-lg font-bold tracking-wider text-white">
                  EMERGENCY SOS SIGNAL ACTIVE
                </h4>
                <p className="text-sm font-sans text-red-300 mt-0.5">
                  The cane user dispatched an emergency panic beacon. Immediate attention or caregiver verification requested.
                </p>
              </div>
            </div>
            <button
              onClick={() => triggerSOS(false)}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-mono text-xs uppercase tracking-wider rounded border border-red-400 font-semibold transition-all shrink-0"
            >
              Acknowledge & Clear SOS
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Section Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12">
        <SectionTitle
          number="08"
          tag="TELEMETRY CONTROL MATRIX"
          title="REAL-TIME MONITORING."
          subtitle={`Instantaneous synchronization between the physical cane (${activeDeviceId}), edge intelligence, and remote caregiver endpoints via Supabase PostgreSQL & Realtime.`}
          className="mb-0"
        />

        {/* Global Toolbar: Supabase Realtime / Mode / Refresh */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          {/* Supabase Cloud DB Pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded-full border ${
            supabaseConnected 
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
              : 'bg-zinc-900 border-zinc-700 text-zinc-400'
          }`}>
            <Database className="w-3 h-3 text-emerald-400" />
            <span>
              {supabaseConnected 
                ? (isOnline ? 'SUPABASE: REALTIME ACTIVE' : 'SUPABASE: LISTENING') 
                : 'SUPABASE: CONNECTING'}
            </span>
          </div>

          {/* Mode Switcher */}
          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-full border transition-all ${
              isDemoMode
                ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                : 'bg-zinc-900 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isDemoMode ? 'text-zinc-400' : 'text-emerald-400 animate-pulse'}`} />
            <span>{isDemoMode ? 'MODE: DEMO SIMULATOR' : 'MODE: LIVE HARDWARE'}</span>
          </button>

          <button
            onClick={handleManualRefresh}
            className="p-2 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-full transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Device Status Bar */}
      <DeviceStatus 
        device={dashboard.device} 
        isDemoMode={isDemoMode} 
        isDeviceConnected={isDeviceConnected} 
        isCameraOnline={isCameraOnline}
        connectionState={connectionState}
        dbError={dbError}
        isStale={isStale}
        className="mb-8" 
      />

      {/* Connection State Alerts & Banners (Loading, Error, Empty, Stale, Disconnected) */}
      <AnimatePresence>
        {connectionState === 'loading' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-blue-950/40 border border-blue-500/30 text-blue-200 rounded flex items-center justify-between gap-4 font-mono text-xs"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
              <span>CONNECTING TO SUPABASE POSTGRESQL & LOADING LATEST RECORD FOR DEVICE `{activeDeviceId}`...</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">INITIALIZING</span>
          </motion.div>
        )}

        {connectionState === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-red-950/60 border border-red-500/50 text-red-200 rounded flex items-center justify-between gap-4 font-mono text-xs"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">SUPABASE DATABASE ERROR</span>
                <span className="text-red-300 text-[11px] font-sans">{dbError || 'Failed to query live telemetry or authenticate.'}</span>
              </div>
            </div>
            <button 
              onClick={handleManualRefresh}
              className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded text-[11px] font-mono shrink-0 transition-colors"
            >
              Retry Query
            </button>
          </motion.div>
        )}

        {connectionState === 'empty' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-amber-950/40 border border-amber-500/30 text-amber-200 rounded flex items-center justify-between gap-4 font-mono text-xs"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-300 block">NO TELEMETRY RECORD FOR `{activeDeviceId}`</span>
                <span className="text-amber-200/70 text-[11px] font-sans">The live table has no records yet for device {activeDeviceId}. Use the Ingest Console below to publish a ping or connect physical hardware.</span>
              </div>
            </div>
          </motion.div>
        )}

        {(connectionState === 'stale' || isStale) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-amber-950/30 border border-amber-500/30 text-amber-200 rounded flex items-center justify-between gap-4 font-mono text-xs"
          >
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <span className="font-bold text-amber-300 block">STALE TELEMETRY SIGNAL DETECTED</span>
                <span className="text-amber-200/70 text-[11px] font-sans">
                  Last reading timestamp is {sensorData.timestamp ? new Date(sensorData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'over 20 seconds ago'}. Displaying cached telemetry in standby mode.
                </span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase shrink-0">STALE &gt;20s</span>
          </motion.div>
        )}

        {connectionState === 'disconnected' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded flex items-center justify-between gap-4 font-mono text-xs"
          >
            <div className="flex items-center gap-3">
              <WifiOff className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>REALTIME CHANNEL DISCONNECTED • Awaiting reconnection to Supabase Realtime publication...</span>
            </div>
            <button 
              onClick={handleManualRefresh}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-mono shrink-0 transition-colors"
            >
              Reconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tri-Directional Sonar Range Banner (in Centimetres) */}
      <div className="mb-8 p-4 bg-zinc-950/80 border border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Sensor */}
        <div className="p-4 border border-white/5 bg-white/[0.01] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">LEFT SONAR</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">HC-SR04-L</span>
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="font-mono text-2xl sm:text-3xl font-medium text-white tracking-tight">
              {sensorData.leftDistance !== null && sensorData.leftDistance !== undefined 
                ? Math.round(Number(sensorData.leftDistance)) 
                : '--'}
            </span>
            <span className="font-mono text-xs text-zinc-400">cm</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 mt-2">
            {typeof sensorData.leftDistance === 'number' && sensorData.leftDistance < 100 ? '⚠️ OBSTACLE LEFT' : 'CORRIDOR NOMINAL'}
          </span>
        </div>

        {/* Front Sensor */}
        <div className="p-4 border border-white/10 bg-white/[0.03] flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              FRONT PRIMARY SONAR
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">HC-SR04-F</span>
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="font-mono text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {sensorData.distance !== null && sensorData.distance !== undefined 
                ? Math.round(Number(sensorData.distance)) 
                : '--'}
            </span>
            <span className="font-mono text-xs text-zinc-400">cm</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 mt-2">
            {sensorData.distance !== null 
              ? (sensorData.distance < 80 ? 'CRITICAL PROXIMITY HAZARD' : sensorData.distance < 180 ? 'CAUTION ZONE' : 'CLEAR FORWARD PATH')
              : 'AWAITING HARDWARE TELEMETRY'}
          </span>
        </div>

        {/* Right Sensor */}
        <div className="p-4 border border-white/5 bg-white/[0.01] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">RIGHT SONAR</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/5">HC-SR04-R</span>
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="font-mono text-2xl sm:text-3xl font-medium text-white tracking-tight">
              {sensorData.rightDistance !== null && sensorData.rightDistance !== undefined 
                ? Math.round(Number(sensorData.rightDistance)) 
                : '--'}
            </span>
            <span className="font-mono text-xs text-zinc-400">cm</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 mt-2">
            {typeof sensorData.rightDistance === 'number' && sensorData.rightDistance < 100 ? '⚠️ OBSTACLE RIGHT' : 'CORRIDOR NOMINAL'}
          </span>
        </div>
      </div>

      {/* Primary Key Metric Tiles (8-Card Responsive Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {/* Device Status */}
        <div className="p-5 border border-white/10 bg-zinc-950/70 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">DEVICE STATUS</span>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : isStale ? 'bg-amber-400' : 'bg-zinc-600'}`} />
            <span className="font-mono text-xl sm:text-2xl font-medium text-white uppercase tracking-tight">
              {isOnline ? 'ONLINE' : isStale ? 'STALE' : 'STANDBY'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 mt-2">
            DEVICE: {activeDeviceId}
          </span>
        </div>

        {/* Battery */}
        <div className="p-5 border border-white/10 bg-zinc-950/70 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">BATTERY</span>
          <div className="flex items-center gap-2 mt-2">
            <Battery className="w-5 h-5 text-zinc-300" />
            <span className="font-mono text-xl sm:text-2xl font-medium text-white tracking-tight">
              {sensorData.battery !== null ? `${sensorData.battery}%` : '--'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 mt-2">
            {sensorData.battery !== null ? '3.7V LI-ION CELL' : 'NO BATTERY TELEMETRY'}
          </span>
        </div>

        {/* Obstacle Target */}
        <div className="p-5 border border-white/10 bg-zinc-950/70 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">OBSTACLE STATUS</span>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-base sm:text-lg font-medium text-white uppercase tracking-tight truncate">
              {sensorData.obstacleStatus || sensorData.object || 'NO TELEMETRY'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 mt-2">PATH STATE</span>
        </div>

        {/* GPS Satellite Lock */}
        <div className="p-5 border border-white/10 bg-zinc-950/70 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">GPS SATELLITE</span>
          <div className="flex items-center gap-2 mt-2">
            <MapPin className="w-4 h-4 text-zinc-300" />
            <span className="font-mono text-sm sm:text-base font-medium text-white tracking-tight truncate">
              {sensorData.latitude !== null 
                ? `${sensorData.latitude.toFixed(4)}°N` 
                : 'NO FIX'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 mt-2">
            STATUS: {sensorData.gpsStatus?.toUpperCase() || 'OFFLINE'}
          </span>
        </div>

        {/* SIM & Cellular Status */}
        <div className="p-5 border border-white/10 bg-zinc-950/70 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">SIM / CELLULAR</span>
          <div className="flex items-center gap-2 mt-2">
            <Smartphone className="w-4 h-4 text-zinc-300" />
            <span className="font-mono text-sm sm:text-base font-medium text-white tracking-tight uppercase">
              {sensorData.simStatus?.toUpperCase() || 'OFFLINE'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 mt-2">GSM/GPRS MODULE</span>
        </div>

        {/* ESP32-CAM Status */}
        <div className="p-5 border border-white/10 bg-zinc-950/70 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">ESP32-CAM</span>
          <div className="flex items-center gap-2 mt-2">
            <Eye className="w-4 h-4 text-zinc-300" />
            <span className="font-mono text-sm sm:text-base font-medium text-white tracking-tight uppercase">
              {sensorData.esp32CamStatus?.toUpperCase() || 'OFFLINE'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 mt-2">OPTICAL NEURAL EDGE</span>
        </div>

        {/* SOS Alarm State */}
        <div className="p-5 border border-white/10 bg-zinc-950/70 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">SOS STATUS</span>
          <div className="mt-2">
            <span className={`inline-block px-2.5 py-0.5 text-xs font-mono uppercase tracking-wider rounded-full border ${
              isSosActive ? 'bg-red-500/20 text-red-200 border-red-500 animate-pulse font-bold' : 'bg-zinc-900 text-zinc-300 border-zinc-700'
            }`}>
              {isSosActive ? '🚨 SOS TRIGGERED' : 'NORMAL'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 mt-2">PANIC DISPATCH FEED</span>
        </div>

        {/* Supabase Engine & Realtime Protocol */}
        <div className="p-5 border border-white/10 bg-zinc-950/70 flex flex-col justify-between">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">DATABASE ENGINE</span>
          <div className="flex items-center gap-2 mt-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs sm:text-sm font-medium text-white tracking-tight">
              SUPABASE POSTGRES
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 mt-2">REALTIME ACTIVE</span>
        </div>
      </div>

      {/* Historical Telemetry Chart (Chronological order in cm) */}
      <HistoricalTelemetryChart 
        history={historyData}
        isLoading={isLoadingHistory}
        onRefresh={() => loadHistory(activeDeviceId)}
        className="mb-8"
      />

      {/* Main Split: Left Interactive Sonar Radar & GPS, Right Incident Logs & Hardware Trigger Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Interactive Sonar Radar & Geolocation Map (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          {/* Sonar Acoustic Scope Canvas */}
          <DashboardCard
            title="Acoustic Ranging Radar"
            subtitle="Real-time 15° forward sonar sweep visualization with target distance marker in cm"
            tag="SONAR INTERFACE"
          >
            <div className="relative aspect-[16/9] bg-black border border-white/10 overflow-hidden flex items-center justify-center">
              {/* Radar circular rings */}
              <div className="absolute w-[80%] aspect-square rounded-full border border-white/10" />
              <div className="absolute w-[60%] aspect-square rounded-full border border-white/10" />
              <div className="absolute w-[40%] aspect-square rounded-full border border-white/10" />
              <div className="absolute w-[20%] aspect-square rounded-full border border-white/10" />
              
              {/* Radar Sweep Arm */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 origin-center pointer-events-none"
              >
                <div className="w-1/2 h-0.5 bg-gradient-to-r from-transparent to-white/70 origin-left ml-[50%]" />
              </motion.div>

              {/* Dynamic Target Marker based on live sensor distance in cm */}
              {sensorData.distance !== null && sensorData.distance !== undefined ? (
                <motion.div
                  animate={{
                    scale: [1, 1.25, 1],
                    opacity: [0.8, 1, 0.8],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute flex flex-col items-center pointer-events-none"
                  style={{
                    top: `${Math.max(15, Math.min(85, (Math.min(Number(sensorData.distance), 400) / 400) * 80))}%`,
                    left: '52%',
                  }}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-black shadow-lg shadow-white/20" />
                  <span className="font-mono text-[10px] text-white bg-black/90 px-2 py-0.5 border border-white/20 mt-1 uppercase">
                    {sensorData.object} ({Math.round(Number(sensorData.distance))} cm)
                  </span>
                </motion.div>
              ) : (
                <div className="absolute text-center pointer-events-none">
                  <span className="font-mono text-[10px] uppercase text-zinc-500 bg-black/80 px-3 py-1 border border-white/10">
                    AWAITING SENSOR PINGS (STANDBY)
                  </span>
                </div>
              )}

              {/* Radar Bottom Origin (Stick position) */}
              <div className="absolute bottom-4 flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
                <span className="text-[9px] font-mono text-zinc-500 uppercase mt-1">
                  NEXUS CANE ORIGIN
                </span>
              </div>

              {/* Scope Metrics Legend */}
              <div className="absolute top-3 left-3 font-mono text-[10px] text-zinc-400 space-y-0.5 bg-black/80 p-2 border border-white/10">
                <div>SWEEP: 40,000 HZ</div>
                <div>RANGE MAX: 400 CM</div>
                <div>HC-SR04 PROTOCOL: ACTIVE</div>
              </div>
            </div>
          </DashboardCard>

          {/* Real AI Vision & ESP32-CAM Stream Card */}
          <DashboardCard
            title="AI Optical Vision & Camera Telemetry"
            subtitle={
              isCameraOnline
                ? `Verified Online: Active frame reception from ESP32-CAM (${activeDeviceId})`
                : 'Camera in Standby: Awaiting authenticated frame transmission from ESP32-CAM'
            }
            tag="AI VISION ENGINE"
          >
            <div className="space-y-4">
              {/* Camera Status & Diagnostics Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/10 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isCameraOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                  <span className={isCameraOnline ? 'text-emerald-300 font-medium' : 'text-zinc-400'}>
                    STATUS: {isCameraOnline ? 'VERIFIED ONLINE' : 'STANDBY / OFFLINE'}
                  </span>
                </div>
                <div className="text-zinc-500 text-[11px]">
                  MODEL: <span className="text-zinc-300">{latestAIDetection?.model_name || 'pedestrian-viewer/4'}</span>
                </div>
                <div className="text-zinc-500 text-[11px]">
                  LATENCY: <span className="text-zinc-300">{latestAIDetection?.inference_time_ms ? `${latestAIDetection.inference_time_ms}ms` : '--'}</span>
                </div>
              </div>

              {/* Frame View or Standby State */}
              <div className="relative aspect-[16/9] bg-black border border-white/10 overflow-hidden flex items-center justify-center rounded">
                {latestAIDetection?.image_url ? (
                  <div className="relative w-full h-full">
                    <img 
                      src={latestAIDetection.image_url} 
                      alt="ESP32-CAM Live Capture"
                      className="w-full h-full object-cover" 
                    />
                    {/* Real Detection Tag Overlay */}
                    <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-md border border-emerald-500/40 px-3 py-1.5 font-mono text-xs text-emerald-300 flex items-center gap-2 shadow-lg">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{latestAIDetection.label}</span>
                      <span className="text-zinc-400 text-[10px]">
                        ({(Number(latestAIDetection.confidence) * 100).toFixed(1)}% conf)
                      </span>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/85 px-2 py-0.5 text-[10px] font-mono text-zinc-400 border border-white/10">
                      CAPTURED: {new Date(latestAIDetection.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-2 pointer-events-none">
                    <Camera className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="font-mono text-xs text-zinc-400 uppercase tracking-wider">
                      NO VERIFIED CAMERA FRAMES RECEIVED YET
                    </p>
                    <p className="text-[11px] text-zinc-600 max-w-sm mx-auto font-sans">
                      Connect your ESP32-CAM hardware or trigger a sample frame transmission from the test console to view verified inference telemetry.
                    </p>
                  </div>
                )}
              </div>

              {/* Recent Real Detections from Supabase */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  RECENT VERIFIED HAZARD DETECTIONS (SUPABASE AI_DETECTIONS)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {latestAIDetections.length > 0 ? (
                    latestAIDetections.slice(0, 4).map((det) => (
                      <div 
                        key={det.id} 
                        className="p-2.5 bg-zinc-950/80 border border-white/10 text-xs font-mono flex items-center justify-between"
                      >
                        <div className="truncate">
                          <span className="text-white font-medium block truncate">{det.label}</span>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(det.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 border border-emerald-500/30 text-emerald-300 rounded shrink-0">
                          {(Number(det.confidence) * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 p-3 text-center text-xs font-mono text-zinc-500 border border-dashed border-white/10">
                      No detections recorded in public.ai_detections table
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Real-time GPS Location & Map View */}
          <DashboardCard
            title="Satellite Geolocation Tracking"
            subtitle="NEO-6M GPS satellite lock for emergency safe zones & caregiver telemetry"
            tag="GPS LINK"
          >
            <div className="relative aspect-[16/8] bg-black border border-white/10 overflow-hidden p-6 flex flex-col justify-between">
              {/* Architectural Grid overlay resembling satellite map */}
              <div className="absolute inset-0 bg-tech-grid opacity-20 pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-300 font-mono text-xs uppercase font-medium">
                    <Navigation className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{sensorData.latitude !== null ? 'COIMBATORE TECH CAMPUS AREA' : 'GPS POSITION UNAVAILABLE'}</span>
                  </div>
                  <p className="text-white font-mono text-sm mt-1">
                    {sensorData.latitude !== null && sensorData.longitude !== null
                      ? `Lat: ${sensorData.latitude.toFixed(5)}° N • Long: ${sensorData.longitude.toFixed(5)}° E`
                      : 'Lat: -- • Long: -- (Awaiting NEO-6M satellite lock)'}
                  </p>
                </div>

                <span className={`px-2.5 py-1 text-[10px] font-mono uppercase rounded-full border ${
                  sensorData.latitude !== null 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                    : 'bg-white/5 text-zinc-400 border-white/10'
                }`}>
                  {sensorData.latitude !== null ? 'GPS LOCKED' : 'DISCONNECTED'}
                </span>
              </div>

              {/* Pulsing Pin Marker */}
              {sensorData.latitude !== null && (
                <div className="relative z-10 flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-white/20 animate-ping absolute" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  </div>
                  <div className="font-mono text-xs text-zinc-300">
                    <span>Gait Cadence: Steady • Satellites: 8 • Device: {activeDeviceId}</span>
                  </div>
                </div>
              )}
            </div>
          </DashboardCard>
        </div>

        {/* Right: Supabase Test Console & Incident Logs (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          {/* Supabase Ingest Testing Console */}
          <DashboardCard
            title="Supabase Ingest Console"
            subtitle={`Send test telemetry directly to device '${activeDeviceId}' in Supabase PostgreSQL`}
            tag="SUPABASE INGEST"
          >
            <div className="space-y-3">
              <button
                disabled={isSavingTest}
                onClick={() => handleTestSaveDevice('nominal')}
                className="w-full p-3.5 text-left border border-white/10 bg-white/[0.02] hover:bg-emerald-500/10 hover:border-emerald-500/40 text-xs font-mono transition-all flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <span className="text-emerald-300 font-medium block">1. Publish Clear Path (Front: 320cm, Left: 280cm, Right: 290cm)</span>
                  <span className="text-zinc-400 text-[10px]">Updates live_sensor_data and appends to sensor_history</span>
                </div>
                <Send className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                disabled={isSavingTest}
                onClick={() => handleTestSaveDevice('hazard')}
                className="w-full p-3.5 text-left border border-white/10 bg-white/[0.02] hover:bg-amber-500/10 hover:border-amber-500/40 text-xs font-mono transition-all flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <span className="text-amber-300 font-medium block">2. Publish Hazard Step-Down (Front: 75cm, Left: 60cm)</span>
                  <span className="text-zinc-400 text-[10px]">Triggers proximity warnings & alerts table insertion</span>
                </div>
                <Send className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                disabled={isSavingTest}
                onClick={() => handleTestSaveDevice('sos')}
                className="w-full p-3.5 text-left border border-white/10 bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/40 text-xs font-mono transition-all flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <span className="text-red-300 font-medium block">3. Dispatch SOS Emergency Signal (Fall / Panic)</span>
                  <span className="text-zinc-400 text-[10px]">Sets alert_state: &apos;sos&apos; and records critical panic alert</span>
                </div>
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
              </button>

              <button
                disabled={isSavingTest}
                onClick={() => triggerSOS(false)}
                className="w-full p-3 text-left border border-white/5 bg-white/[0.01] hover:bg-white/5 text-xs font-mono transition-all flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <span className="text-zinc-300 font-medium block">4. Reset SOS to Normal</span>
                  <span className="text-zinc-500 text-[10px]">Clears emergency alert state in Supabase</span>
                </div>
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
              </button>

              <button
                disabled={isSavingTest}
                onClick={handleTestSupabaseEdge}
                className="w-full p-3.5 text-left border border-cyan-500/20 bg-cyan-950/20 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-xs font-mono transition-all flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <span className="text-cyan-300 font-medium block">5. Supabase Edge Ingest (Front: 90cm, Left: 120cm)</span>
                  <span className="text-zinc-400 text-[10px]">Triggers /functions/v1/ingest-device-data + Realtime</span>
                </div>
                <Zap className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </button>

              <button
                disabled={isCapturingTest}
                onClick={handleTestCameraCapture}
                className="w-full p-3.5 text-left border border-purple-500/30 bg-purple-950/20 hover:bg-purple-500/10 hover:border-purple-500/50 text-xs font-mono transition-all flex items-center justify-between group disabled:opacity-50"
              >
                <div>
                  <span className="text-purple-300 font-medium block">
                    {isCapturingTest ? 'Transmitting Frame & Running Inference...' : '6. Test ESP32-CAM Frame Ingest (3.jpg)'}
                  </span>
                  <span className="text-zinc-400 text-[10px]">
                    POST /api/vision/capture: Validates bytes, stores in Supabase private bucket & inserts ai_detections
                  </span>
                </div>
                <Camera className={`w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform ${isCapturingTest ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </DashboardCard>

          {/* Recent Sensor Alerts Feed */}
          <DashboardCard
            title="Telemetry Alert Log"
            subtitle={`Asynchronous event stream for ${activeDeviceId}`}
            tag="SYSTEM LOGS"
          >
            <div className="space-y-3 max-h-[280px] overflow-y-auto no-scrollbar">
              {dashboard.recentAlerts.length > 0 ? (
                dashboard.recentAlerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-3 bg-zinc-950/70 border border-white/5 flex items-start gap-3 text-xs font-mono"
                  >
                    <div className="mt-0.5">
                      {al.severity === 'critical' ? (
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                      ) : (
                        <ShieldAlert className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium uppercase tracking-wider">{al.type}</span>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(al.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-[11px] mt-1 font-sans">{al.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs font-mono text-zinc-500 border border-dashed border-white/5">
                  NO ACTIVE ALERTS IN QUEUE
                </div>
              )}
            </div>
          </DashboardCard>
        </div>
      </div>
    </section>
  );
};
