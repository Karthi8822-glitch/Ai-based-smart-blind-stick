import React from 'react';
import { ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative z-10 border-t border-white/15 bg-[#07080a] pt-20 pb-32 sm:pb-36 px-6 sm:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Editorial Row */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 pb-16 border-b border-white/15">
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-300 font-semibold block mb-3">
              COLLEGE CAPSTONE ENGINEERING PROJECT
            </span>
            <h2 className="font-display font-medium text-3xl sm:text-5xl text-white tracking-tight uppercase">
              AI SMART BLIND STICK
            </h2>
            <p className="text-zinc-200 text-sm sm:text-base mt-3 max-w-md font-sans leading-relaxed">
              An assistive mobility system uniting dual-core microcontrollers, ultrasonic sonar, edge neural vision, and haptic feedback.
            </p>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-2.5 text-xs font-mono uppercase tracking-widest text-white px-5 py-3 border border-white/20 hover:border-white bg-white/5 hover:bg-white/15 transition-all shadow-sm"
          >
            <span className="font-semibold">Back to Zenith</span>
            <ArrowUp className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Middle Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 py-14 border-b border-white/10 text-xs font-mono">
          <div>
            <span className="text-white font-bold uppercase tracking-wider block mb-4 text-xs">SUBSYSTEMS</span>
            <ul className="space-y-2.5 text-zinc-200 text-xs">
              <li className="hover:text-white transition-colors">ESP32 Dual-Core</li>
              <li className="hover:text-white transition-colors">HC-SR04 Ultrasonic Sonar</li>
              <li className="hover:text-white transition-colors">ESP32-CAM Edge Vision</li>
              <li className="hover:text-white transition-colors">SIM800L GSM Module</li>
              <li className="hover:text-white transition-colors">Coin Haptic Motor</li>
              <li className="hover:text-white transition-colors">NEO-6M Satellite GPS</li>
            </ul>
          </div>

          <div>
            <span className="text-white font-bold uppercase tracking-wider block mb-4 text-xs">SOFTWARE STACK</span>
            <ul className="space-y-2.5 text-zinc-200 text-xs">
              <li className="hover:text-white transition-colors">React 19 & TypeScript</li>
              <li className="hover:text-white transition-colors">Vite & Tailwind CSS</li>
              <li className="hover:text-white transition-colors">Three.js & Canvas Scrubber</li>
              <li className="hover:text-white transition-colors">Lenis Smooth Scrolling</li>
              <li className="hover:text-white transition-colors">Node.js & Express REST</li>
              <li className="hover:text-white transition-colors">MongoDB & Mongoose</li>
            </ul>
          </div>

          <div>
            <span className="text-white font-bold uppercase tracking-wider block mb-4 text-xs">API ENDPOINTS</span>
            <ul className="space-y-2.5 text-zinc-200 font-mono text-xs">
              <li className="hover:text-white transition-colors">POST /api/sensors/data</li>
              <li className="hover:text-white transition-colors">GET /api/sensors/latest</li>
              <li className="hover:text-white transition-colors">GET /api/dashboard</li>
              <li className="hover:text-white transition-colors">GET /api/location/latest</li>
              <li className="hover:text-white transition-colors">POST /api/obstacles</li>
              <li className="hover:text-white transition-colors">POST /api/alerts</li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="text-zinc-200 font-medium">
            © {new Date().getFullYear()} Nexus — Smart Blind Cane Research Platform.
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
            <span>Engineered with passion for universal accessibility</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
