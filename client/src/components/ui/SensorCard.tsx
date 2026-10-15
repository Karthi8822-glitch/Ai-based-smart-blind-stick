import React from 'react';
import { motion } from 'framer-motion';

interface SensorCardProps {
  name: string;
  code: string;
  status: 'active' | 'standby' | 'alert';
  reading: string | number;
  unit?: string;
  description: string;
  icon?: React.ReactNode;
  onTest?: () => void;
}

export const SensorCard: React.FC<SensorCardProps> = ({
  name,
  code,
  status,
  reading,
  unit,
  description,
  icon,
  onTest,
}) => {
  const statusColors = {
    active: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    standby: 'text-zinc-400 border-zinc-700 bg-zinc-800/40',
    alert: 'text-red-400 border-red-500/30 bg-red-500/10 animate-pulse',
  }[status];

  return (
    <div className="p-6 md:p-8 bg-zinc-950/70 border border-white/10 relative overflow-hidden group hover:border-zinc-500/40 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon && <div className="text-zinc-400 group-hover:text-white transition-colors">{icon}</div>}
          <div>
            <h4 className="font-display font-medium text-white text-base">{name}</h4>
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">{code}</span>
          </div>
        </div>
        <span className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-full border ${statusColors}`}>
          {status}
        </span>
      </div>

      <div className="my-6">
        <div className="flex items-baseline gap-2">
          <motion.span
            key={String(reading)}
            initial={{ opacity: 0.5, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-3xl md:text-4xl font-medium text-white tracking-tight"
          >
            {reading}
          </motion.span>
          {unit && <span className="font-mono text-xs text-zinc-400">{unit}</span>}
        </div>
        <p className="text-xs text-zinc-400 mt-2 font-sans leading-relaxed">{description}</p>
      </div>

      {onTest && (
        <button
          onClick={onTest}
          className="w-full mt-4 py-2 border border-zinc-800 hover:border-zinc-500 text-[11px] font-mono uppercase tracking-widest text-zinc-400 hover:text-white transition-colors bg-white/[0.02] hover:bg-white/5 rounded"
        >
          Send Test Ping
        </button>
      )}
    </div>
  );
};
