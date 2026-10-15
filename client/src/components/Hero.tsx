import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, Sparkles, Sliders, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import { FrameScrollCanvas } from './FrameScrollCanvas';
import { Stick3DViewer } from './Stick3DViewer';

interface HeroProps {
  onExploreTech: () => void;
  onHowItWorks: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreTech, onHowItWorks }) => {
  const [visualMode, setVisualMode] = useState<'video' | 'frames' | '3d' | 'still'>('video');

  return (
    <section className="relative min-h-screen flex flex-col justify-between pt-28 md:pt-36 pb-12 px-6 sm:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Top Editorial Index Tag */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="flex items-center justify-between border-b border-white/10 pb-4 mb-8 text-xs font-mono tracking-widest text-zinc-400 uppercase"
      >
        <div className="flex items-center gap-3">
          <span className="text-zinc-300 font-semibold">01</span>
          <span className="h-1 w-1 rounded-full bg-zinc-700" />
          <span>AUTONOMOUS ASSISTIVE MOBILITY</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-zinc-500">
          <span>ESP32-CAM NEURAL EDGE</span>
          <span className="text-zinc-700">/</span>
          <span>ULTRASONIC 40KHZ SONAR</span>
        </div>
      </motion.div>

      {/* Main Grid: Headline & Interactive Cane Visual */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center my-auto">
        {/* Left Column: Typography & CTAs (5 cols) */}
        <div className="lg:col-span-6 flex flex-col z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1 }}
          >
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-400 mb-4 inline-block">
              ENGINEERED FOR INDEPENDENCE
            </span>
            <h1 className="font-display font-medium text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-white uppercase leading-[0.95] mb-6">
              SEE THE WORLD
              <br />
              <span className="text-zinc-400">
                WITHOUT LIMITS.
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-xl mb-10 font-sans"
          >
            An AI-powered smart blind stick designed to detect obstacles, understand
            surroundings and provide immediate feedback.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="flex flex-wrap items-center gap-4"
          >
            <Button
              variant="primary"
              size="lg"
              onClick={onExploreTech}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Explore Technology
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={onHowItWorks}
            >
              See How It Works
            </Button>
          </motion.div>

          {/* Quick Hardware Spec Strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="grid grid-cols-3 gap-6 mt-14 pt-8 border-t border-white/10"
          >
            <div>
              <div className="font-mono text-xl sm:text-2xl font-medium text-white">40 kHz</div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mt-1">
                Ultrasonic Sonar
              </div>
            </div>
            <div>
              <div className="font-mono text-xl sm:text-2xl font-medium text-white">&lt; 15 ms</div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mt-1">
                Tactile Latency
              </div>
            </div>
            <div>
              <div className="font-mono text-xl sm:text-2xl font-medium text-white">97.4%</div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mt-1">
                AI Precision
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Interactive Cane Visual Viewport (6 cols) */}
        <div className="lg:col-span-6 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            {/* Visual Mode Selector Tabs */}
            <div className="flex items-center justify-end gap-2 mb-3">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mr-1">
                HERO VIEW:
              </span>
              <button
                onClick={() => setVisualMode('video')}
                className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors border ${
                  visualMode === 'video'
                    ? 'bg-white text-black font-semibold border-white'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                }`}
              >
                Cinematic Film
              </button>
              <button
                onClick={() => setVisualMode('frames')}
                className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors border ${
                  visualMode === 'frames'
                    ? 'bg-white text-black font-semibold border-white'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                }`}
              >
                LiDAR Pulse
              </button>
              <button
                onClick={() => setVisualMode('3d')}
                className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors border ${
                  visualMode === '3d'
                    ? 'bg-white text-black font-semibold border-white'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                }`}
              >
                3D Cane
              </button>
              <button
                onClick={() => setVisualMode('still')}
                className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors border ${
                  visualMode === 'still'
                    ? 'bg-white text-black font-semibold border-white'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                }`}
              >
                Macro Still
              </button>
            </div>

            {/* Display Active Hero View */}
            <div className="relative rounded-none overflow-hidden shadow-2xl shadow-black/80">
              {visualMode === 'video' && (
                <div className="relative h-[460px] sm:h-[540px] md:h-[600px] bg-black border border-white/10 overflow-hidden group">
                  <video
                    src="/assets/stick-video.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-xs font-mono text-zinc-300">
                    <span className="uppercase tracking-widest bg-black/80 backdrop-blur-md px-3 py-1.5 border border-white/10 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      OFFICIAL PRODUCT FILM • 1080P CINEMATIC
                    </span>
                    <span className="hidden sm:inline-block bg-black/80 backdrop-blur-md px-3 py-1.5 border border-white/10 text-zinc-300">
                      AUTONOMOUS MOBILITY
                    </span>
                  </div>
                </div>
              )}

              {visualMode === 'frames' && (
                <FrameScrollCanvas className="h-[460px] sm:h-[540px] md:h-[600px]" autoPlay={true} />
              )}

              {visualMode === '3d' && (
                <Stick3DViewer className="h-[460px] sm:h-[540px] md:h-[600px]" />
              )}

              {visualMode === 'still' && (
                <div className="relative h-[460px] sm:h-[540px] md:h-[600px] bg-black border border-white/10 overflow-hidden group">
                  <img
                    src="/assets/1.jpg"
                    alt="Nexus AI Smart Cane Studio Product"
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-xs font-mono text-zinc-300">
                    <span className="uppercase tracking-widest bg-black/80 backdrop-blur-md px-3 py-1.5 border border-white/10">
                      CARBON FIBER CHASSIS • MONOLITHIC PEDESTAL
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Scroll Indicator */}
      <div className="flex items-center justify-between pt-8 border-t border-white/5 text-xs font-mono text-zinc-500">
        <span className="uppercase tracking-widest">SCROLL TO DISCOVER THE ARCHITECTURE</span>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex items-center gap-2 text-zinc-400"
        >
          <span>EXPLORE</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        </motion.div>
      </div>
    </section>
  );
};
