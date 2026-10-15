import React from 'react';
import { motion } from 'framer-motion';

interface SectionTitleProps {
  number?: string;
  tag?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  number,
  tag,
  title,
  subtitle,
  align = 'left',
  className = '',
}) => {
  const alignClass = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }[align];

  return (
    <div className={`flex flex-col mb-16 md:mb-24 ${alignClass} ${className}`}>
      {/* Editorial Meta Tag */}
      {(number || tag) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 mb-4 text-xs font-mono tracking-widest text-zinc-400 uppercase"
        >
          {number && <span className="text-zinc-500 font-semibold">{number}</span>}
          {number && tag && <span className="h-1 w-1 rounded-full bg-zinc-700" />}
          {tag && <span className="tracking-[0.25em]">{tag}</span>}
        </motion.div>
      )}

      {/* Large Editorial Heading */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="font-display font-medium text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight text-white leading-[1.08] max-w-4xl"
      >
        {title}
      </motion.h2>

      {/* Subtitle / Narrative */}
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 text-base sm:text-lg text-slate-400 font-normal leading-relaxed max-w-2xl font-sans"
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
};
