import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Cpu, Cable, Activity, ShieldCheck } from 'lucide-react';

export interface HardwareItemProps {
  id: string;
  name: string;
  category: string;
  tag: string;
  purpose: string;
  howItWorks: string;
  connection: string;
  roleInSystem: string;
  specs: { label: string; value: string }[];
  highlightColor?: string;
}

export const HardwareCard: React.FC<HardwareItemProps> = ({
  name,
  category,
  tag,
  purpose,
  howItWorks,
  connection,
  roleInSystem,
  specs,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className="border border-white/10 bg-zinc-950/70 p-8 md:p-10 transition-all duration-300 hover:border-zinc-500/40">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6">
        <div>
          <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase">
            {category} • {tag}
          </span>
          <h3 className="font-display font-medium text-2xl md:text-3xl text-white mt-1">
            {name}
          </h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white uppercase tracking-wider py-1.5 px-3 border border-zinc-700/60 hover:border-zinc-400 rounded-full transition-colors"
        >
          <span>{isExpanded ? 'Hide Specs' : 'Detailed Specs'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Purpose */}
      <p className="text-zinc-300 text-sm md:text-base leading-relaxed mb-8 font-sans">
        {purpose}
      </p>

      {/* 3 Core Editorial Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase tracking-widest mb-2">
            <Activity className="w-3.5 h-3.5 text-zinc-300" />
            <span>How It Works</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{howItWorks}</p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase tracking-widest mb-2">
            <Cable className="w-3.5 h-3.5 text-zinc-300" />
            <span>Pinout Connection</span>
          </div>
          <p className="text-xs text-zinc-400 font-mono leading-relaxed">{connection}</p>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase tracking-widest mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-300" />
            <span>System Role</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{roleInSystem}</p>
        </div>
      </div>

      {/* Collapsible Technical Specs */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {specs.map((s, idx) => (
                <div key={idx} className="p-3 bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{s.label}</div>
                  <div className="text-xs font-mono text-white font-medium mt-1">{s.value}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
