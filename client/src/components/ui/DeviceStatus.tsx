import React from 'react';
import { Wifi, WifiOff, Battery, Radio } from 'lucide-react';
import { DeviceInfo } from '../../types';

interface DeviceStatusProps {
  device: DeviceInfo;
  isDemoMode: boolean;
  isDeviceConnected?: boolean;
  className?: string;
}

export const DeviceStatus: React.FC<DeviceStatusProps> = ({
  device,
  isDemoMode,
  isDeviceConnected = false,
  className = '',
}) => {
  const isOnline = isDemoMode || isDeviceConnected;

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
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80 relative" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-medium text-white text-lg tracking-tight">
              {device.name}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 bg-white/5 px-2 py-0.5 border border-white/10">
              {device.deviceId}
            </span>
            <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border ${
              isOnline 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}>
              {isDemoMode ? 'SIMULATOR ACTIVE' : isOnline ? 'FIREBASE RTDB: CONNECTED' : 'DISCONNECTED / AWAITING ESP32'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Firmware {device.firmwareVersion} • {isOnline ? `Last signal: ${device.lastSeen}` : 'No active telemetry broadcast detected on /device'}
          </p>
        </div>
      </div>

      {/* Quick stats pills */}
      <div className="flex items-center gap-4 text-xs font-mono">
        <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-full ${
          isOnline ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-zinc-400'
        }`}>
          {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-zinc-400" />}
          <span>{isOnline ? 'ONLINE' : 'DISCONNECTED'}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
          <Battery className={`w-3.5 h-3.5 ${isOnline && device.batteryLevel > 20 ? 'text-zinc-300' : 'text-zinc-500'}`} />
          <span className="text-zinc-300">{isOnline ? `${device.batteryLevel}%` : '--'}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
          <Radio className="w-3.5 h-3.5 text-zinc-300" />
          <span className="text-zinc-300">{isOnline ? 'ESP32 SYNC' : 'STANDBY'}</span>
        </div>
      </div>
    </div>
  );
};
