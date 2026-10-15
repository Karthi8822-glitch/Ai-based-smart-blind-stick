import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Cpu, Brain, Volume2, Footprints, Play, Pause, RotateCcw } from 'lucide-react';
import { SectionTitle } from './ui/SectionTitle';
import { soundSynth } from '../utils/soundSynth';

interface StepItem {
  number: string;
  title: string;
  tag: string;
  summary: string;
  deepDive: string;
  telemetryMetric: string;
  icon: React.ReactNode;
}

export const HowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  const steps: StepItem[] = [
    {
      number: '01',
      title: 'SCAN',
      tag: 'ENVIRONMENT CAPTURE',
      summary: 'Sensors scan the environment.',
      deepDive:
        'Continuous 40kHz ultrasonic sound pulses sweep a 15-degree forward cone up to 4 meters ahead, while the wide-angle camera captures visual light frames at 30 frames per second.',
      telemetryMetric: 'TX: 40,000 Hz • FOV: 15° Ultrasonic / 68° Optical',
      icon: <Radar className="w-5 h-5 text-zinc-300" />,
    },
    {
      number: '02',
      title: 'ANALYZE',
      tag: 'SIGNAL EXTRACTION',
      summary: 'Sensor data is processed.',
      deepDive:
        'Echo return times are calculated into microsecond time-of-flight measurements. The ESP32 eliminates reflections, applies Kalman filtering to remove acoustic noise, and computes exact centimeter distances.',
      telemetryMetric: 'ΔT: 5,247 µs → 0.90 m ± 2mm Kalman filtered',
      icon: <Cpu className="w-5 h-5 text-zinc-300" />,
    },
    {
      number: '03',
      title: 'UNDERSTAND',
      tag: 'NEURAL CLASSIFICATION',
      summary: 'AI identifies detected objects.',
      deepDive:
        'The onboard quantized neural model tags obstacles in real-time—distinguishing between moving humans, static furniture, low curbs, stairways, and vehicles.',
      telemetryMetric: 'TensorFlow Lite Micro: "Person Walking" (97.4%)',
      icon: <Brain className="w-5 h-5 text-zinc-300" />,
    },
    {
      number: '04',
      title: 'ALERT',
      tag: 'MULTI-SENSORY FEEDBACK',
      summary: 'Audio and vibration feedback are activated.',
      deepDive:
        'Distance-scaled haptic vibration pulses directly through the ergonomic grip handle, accompanied by subtle acoustic frequency cues to alert the traveler without auditory overload.',
      telemetryMetric: 'Haptic: ERM Pulse 85Hz • Acoustic: 880Hz Sonar Ping',
      icon: <Volume2 className="w-5 h-5 text-zinc-300" />,
    },
    {
      number: '05',
      title: 'MOVE',
      tag: 'INTUITIVE TRAVERSAL',
      summary: 'The user reacts to the detected obstacle.',
      deepDive:
        'Having received real-time warning before physical impact, the traveler smoothly alters trajectory, side-stepping the obstacle with natural confidence and fluid pace.',
      telemetryMetric: 'Path Cleared • Normal Gait Restored • Latency: 14ms',
      icon: <Footprints className="w-5 h-5 text-zinc-300" />,
    },
  ];

  // Auto-play steps loop
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % steps.length;
        // Trigger subtle sound on alert step
        if (next === 3) {
          soundSynth.playSonarPing(1.2);
        }
        return next;
      });
    }, 4200);

    return () => clearInterval(interval);
  }, [isAutoPlaying, steps.length]);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    setIsAutoPlaying(false);
    if (index === 3) {
      soundSynth.playSonarPing(1.2);
    } else {
      soundSynth.playClick();
    }
  };

  const current = steps[activeStep];

  return (
    <section id="how-it-works" className="py-24 sm:py-32 md:py-40 px-6 sm:px-8 max-w-7xl mx-auto border-t border-white/10">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-16">
        <SectionTitle
          number="05"
          tag="REAL-TIME ARCHITECTURE"
          title="FIVE MILLISECOND-CRITICAL PHASES."
          subtitle="From ultrasonic burst emission to user muscle reaction in under 15 milliseconds."
          className="mb-0"
        />

        {/* Play / Pause Step Animation Controller */}
        <div className="flex items-center gap-2 border border-white/10 p-1.5 bg-zinc-950/80 shrink-0">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoPlaying ? 'Pause Cycle' : 'Play Cycle'}</span>
          </button>
          <button
            onClick={() => {
              setActiveStep(0);
              setIsAutoPlaying(false);
            }}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
            title="Restart at 01"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5-Step Horizontal Sequence Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-10">
        {steps.map((s, idx) => {
          const isActive = activeStep === idx;
          const isPassed = activeStep > idx;
          return (
            <button
              key={s.number}
              onClick={() => handleStepClick(idx)}
              className={`p-5 text-left border transition-all duration-300 relative flex flex-col justify-between group ${
                isActive
                  ? 'bg-white text-black border-white shadow-lg shadow-white/5'
                  : isPassed
                  ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
                  : 'bg-zinc-950/40 border-zinc-900 text-zinc-500 hover:border-zinc-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`font-mono text-xs tracking-widest ${
                      isActive ? 'text-black font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {s.number}
                  </span>
                  <div
                    className={`p-1.5 rounded transition-colors ${
                      isActive ? 'bg-black/10 text-black' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  >
                    {s.icon}
                  </div>
                </div>

                <h4
                  className={`font-display font-medium text-lg tracking-tight mb-1 ${
                    isActive ? 'text-black font-semibold' : 'text-zinc-200'
                  }`}
                >
                  {s.title}
                </h4>
                <p className={`text-xs font-sans line-clamp-2 leading-relaxed ${isActive ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  {s.summary}
                </p>
              </div>

              {/* Active Step Indicator Line */}
              <div className="mt-4 pt-3 border-t border-black/10 w-full">
                <div className="h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  {isActive && (
                    <motion.div
                      layoutId="activeStepBar"
                      className="h-full bg-black"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: isAutoPlaying ? 4.2 : 0.3 }}
                    />
                  )}
                  {isPassed && <div className="h-full w-full bg-zinc-500" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Featured Active Step Detail Canvas */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.number}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35 }}
          className="border border-white/10 bg-zinc-950/70 p-8 md:p-12 relative overflow-hidden backdrop-blur-xl"
        >
          {/* Subtle background phase indicator */}
          <span className="absolute -right-4 -bottom-6 font-display font-bold text-9xl text-white/[0.02] pointer-events-none select-none">
            {current.number}
          </span>

          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4 text-xs font-mono text-zinc-400 tracking-widest uppercase">
              <span>PHASE {current.number} OF 05</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" />
              <span>{current.tag}</span>
            </div>

            <h3 className="font-display font-medium text-3xl sm:text-4xl text-white tracking-tight mb-4">
              {current.title} — {current.summary}
            </h3>

            <p className="text-zinc-300 text-base sm:text-lg leading-relaxed mb-8 font-sans">
              {current.deepDive}
            </p>

            {/* Live Telemetry Code / Hardware Trace */}
            <div className="p-4 bg-black/60 border border-white/10 font-mono text-xs text-zinc-200 flex flex-wrap items-center justify-between gap-4">
              <span className="text-zinc-500 uppercase tracking-widest">ESP32 REAL-TIME REGISTER:</span>
              <span>{current.telemetryMetric}</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
};
