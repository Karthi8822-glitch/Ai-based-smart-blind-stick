import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Compass, Sparkles } from 'lucide-react';
import { ImageReveal } from './ui/ImageReveal';

export const StorySection: React.FC = () => {
  return (
    <section className="py-24 sm:py-32 md:py-40 px-6 sm:px-8 max-w-7xl mx-auto border-t border-white/10">
      {/* Editorial Category Tag */}
      <div className="flex items-center gap-3 mb-12 text-xs font-mono tracking-widest text-zinc-400 uppercase">
        <span className="text-zinc-500 font-semibold">02</span>
        <span className="h-1 w-1 rounded-full bg-zinc-700" />
        <span>HUMAN-CENTERED MISSION</span>
      </div>

      {/* Large Editorial Statement */}
      <div className="mb-16 md:mb-24">
        <motion.h2
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="font-display font-medium text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-white uppercase leading-[1.04] max-w-6xl"
        >
          &ldquo;WHEN THE WORLD IS HARD TO SEE,
          <br />
          <span className="text-zinc-400">
            TECHNOLOGY CAN HELP YOU
          </span>
          <br />
          FEEL YOUR WAY.&rdquo;
        </motion.h2>
      </div>

      {/* Immersive Editorial Photo with Architectural Hologram Overlays */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="relative overflow-hidden border border-white/10 bg-black mb-16 shadow-2xl"
      >
        <ImageReveal
          src="/assets/3.jpg"
          alt="Visually impaired traveler using Nexus AI Cane in urban courtyard"
          aspectRatio="aspect-[16/9] md:aspect-[21/9]"
          overlayText="FIELD TEST • METROPOLITAN PEDESTRIAN TRAVERSAL • COIMBATORE CAMPUS"
          priority={false}
        />
      </motion.div>

      {/* Editorial Narrative Columns */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16 pt-8 border-t border-white/5">
        <div className="md:col-span-4">
          <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-400 block mb-3">
            THE PHILOSOPHY
          </span>
          <h3 className="font-display font-medium text-2xl text-white">
            Sensory Extension, Not Replacement.
          </h3>
        </div>

        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm md:text-base text-slate-400 leading-relaxed font-sans">
          <p>
            Standard white canes rely exclusively on mechanical surface contact. They cannot warn of head-level overhangs, rapid moving cyclists, or drops before the physical cane touches the edge. Nexus AI introduces a multi-layered acoustic and optical bubble.
          </p>
          <p>
            By combining dual-frequency ultrasonic depth measurement with lightweight edge neural vision, the device parses spatial geometries 30 times per second, translating complex environments into subtle, intuitive vibrations and acoustic spatial cues.
          </p>
        </div>
      </div>
    </section>
  );
};
