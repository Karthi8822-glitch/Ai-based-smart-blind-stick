import React from 'react';
import { motion } from 'framer-motion';

interface FeatureCardProps {
  number: string;
  title: string;
  description: string;
  metric?: {
    value: string;
    label: string;
  };
  icon?: React.ReactNode;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  number,
  title,
  description,
  metric,
  icon,
}) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group relative p-8 md:p-10 border border-white/10 bg-zinc-950/70 backdrop-blur-xl flex flex-col justify-between h-full transition-colors hover:border-zinc-500/40"
    >
      {/* Top row */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <span className="font-mono text-xs text-zinc-400 tracking-widest">{number}</span>
          {icon && (
            <div className="p-2.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 group-hover:text-white group-hover:border-zinc-400/40 transition-colors">
              {icon}
            </div>
          )}
        </div>

        <h3 className="font-display font-medium text-2xl text-white tracking-tight mb-4 group-hover:text-zinc-100 transition-colors">
          {title}
        </h3>

        <p className="text-zinc-400 text-sm leading-relaxed font-sans">
          {description}
        </p>
      </div>

      {/* Bottom Metric */}
      {metric && (
        <div className="pt-8 mt-8 border-t border-white/5 flex items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-mono">
            {metric.label}
          </span>
          <span className="font-mono font-medium text-lg text-white group-hover:text-zinc-200 transition-colors whitespace-nowrap shrink-0 text-right">
            {metric.value}
          </span>
        </div>
      )}
    </motion.div>
  );
};
