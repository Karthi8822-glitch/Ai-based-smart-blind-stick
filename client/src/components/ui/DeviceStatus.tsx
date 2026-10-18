import React from 'react';
import { Wifi, WifiOff, Battery, Radio, AlertCircle, RefreshCw, Database, Camera } from 'lucide-react';
import { DeviceInfo, ConnectionState } from '../../types';

interface DeviceStatusProps {
  device: DeviceInfo;
  isDemoMode: boolean;
  isDeviceConnected?: boolean;
  isCameraOnline?: boolean;
  connectionState?: ConnectionState;
  dbError?: string | null;
  isStale?: boolean;
  className?: string;
}

export const DeviceStatus: React.FC<DeviceStatusProps> = ({
  device,
  isDemoMode,
  isDeviceConnected = false,
  isCameraOnline = false,
  connectionState = 'connected',
  dbError = null,
  isStale = false,
  className = '',
}) => {
  const isOnline = isDemoMode || (isDeviceConnected && !isStale && connectionState === 'connected');

  // Dynamic status badge based on exact connection & data state
  const getStatusBadge = () => {
    if (isDemoMode) {
      return {
        text: 'DEMO SIMULATOR ACTIVE',
        style: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        dot: 'bg-zinc-400',
      };
    }
    if (connectionState === 'loading') {
      return {
        text: 'CONNECTING TO SUPABASE...',
        style: 'bg-blue-500/10 text-blue-300 border-blue-500/30 animate-pulse',
        dot: 'bg-blue-400 animate-spin',
      };
    }
    if (connectionState === 'error') {
      return {
        text: `DATABASE ERROR: ${dbError ? dbError.slice(0, 32) : 'Query Failed'}`,
        style: 'bg-red-500/20 text-red-300 border-red-500/40',
        dot: 'bg-red-500',
      };
    }
    if (connectionState === 'empty') {
      return {
        text: 'NO SENSOR DATA (AWAITING FIRST PING)',
        style: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-400',
      };
    }
    if (connectionState === 'stale' || isStale) {
      return {
        text: 'STALE DATA: LAST PING > 20s AGO',
        style: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-400',
      };
    }
    if (connectionState === 'disconnected') {
      return {
        text: 'REALTIME DISCONNECTED',
        style: 'bg-zinc-900 text-zinc-400 border-zinc-700',
        dot: 'bg-zinc-600',
      };
    }
    return {
      text: 'SUPABASE REALTIME: LIVE STREAM ACTIVE',
      style: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      dot: 'bg-emerald-400 animate-pulse',
    };
  };

  const badge = getStatusBadge();

  return (
    <div className={`p-6 border border-white/10 bg-zinc-950/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-6 ${className}`}>
      {/* Device Info */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {isOnline ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative" />
            </>
          ) : (
            <div className={`w-2.5 h-2.5 rounded-full relative ${
              connectionState === 'error' ? 'bg-red-500' : isStale ? 'bg-amber-400' : 'bg-zinc-600'
            }`} />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-medium text-white text-lg tracking-tight">
              {device.name}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 bg-white/5 px-2 py-0.5 border border-white/10">
              {device.deviceId}
            </span>
            <span className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 border rounded-full flex items-center gap-1.5 ${badge.style}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {badge.text}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Firmware {device.firmwareVersion} • {device.lastSeen && device.lastSeen !== 'Never' ? `Last telemetry: ${new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : 'No active hardware telemetry detected'}
          </p>
        </div>
      </div>

      {/* Quick stats pills */}
      <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
        <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-full ${
          isOnline ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-zinc-400'
        }`}>
          {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-zinc-400" />}
          <span>{isOnline ? 'ONLINE' : isStale ? 'STALE' : 'STANDBY'}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
          <Battery className={`w-3.5 h-3.5 ${isOnline && device.batteryLevel > 20 ? 'text-zinc-300' : 'text-zinc-500'}`} />
          <span className="text-zinc-300">{device.batteryLevel ? `${device.batteryLevel}%` : '--'}</span>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-full ${
          isCameraOnline ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-zinc-400'
        }`}>
          <Camera className={`w-3.5 h-3.5 ${isCameraOnline ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <span>{isCameraOnline ? 'CAM: ONLINE' : 'CAM: STANDBY'}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-zinc-300">nexus-01</span>
        </div>
      </div>
    </div>
  );
};
