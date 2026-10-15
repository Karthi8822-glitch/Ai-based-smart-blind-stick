import React from 'react';
import { motion } from 'framer-motion';

interface ImageRevealProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  overlayText?: string;
  priority?: boolean;
}

export const ImageReveal: React.FC<ImageRevealProps> = ({
  src,
  alt,
  className = '',
  aspectRatio = 'aspect-[16/9]',
  overlayText,
  priority = false,
}) => {
  return (
    <div className={`relative overflow-hidden bg-black border border-white/10 group ${aspectRatio} ${className}`}>
      <motion.img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        initial={{ scale: 1.08, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      {/* Editorial Gradient scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

      {overlayText && (
        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-xs font-mono text-zinc-300">
          <span className="uppercase tracking-widest bg-black/80 backdrop-blur-md px-3 py-1.5 border border-white/10">
            {overlayText}
          </span>
        </div>
      )}
    </div>
  );
};
