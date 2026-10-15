import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Menu, X, Radio } from 'lucide-react';
import { useStickData } from '../context/StickDataContext';

interface NavbarProps {
  onNavigate: (sectionId: string) => void;
  activeSection: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, activeSection }) => {
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const { isMuted, setIsMuted, isDemoMode, setIsDemoMode } = useStickData();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'home', label: 'Overview' },
    { id: 'story', label: 'Story' },
    { id: 'problem', label: 'Challenge' },
    { id: 'technology', label: 'Technology' },
    { id: 'how-it-works', label: 'Process' },
    { id: 'ai-vision', label: 'AI Vision' },
    { id: 'hardware', label: 'Hardware' },
    { id: 'dashboard', label: 'Live Data' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
  ];

  const handleLinkClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'py-3.5 bg-[#07080a]/90 backdrop-blur-xl border-b border-white/[0.08]'
          : 'py-6 md:py-8 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 flex items-center justify-between">
        {/* Minimal Clean Brand */}
        <button
          onClick={() => handleLinkClick('home')}
          className="flex items-center gap-3 text-left group"
        >
          <div className="w-2 h-2 rounded-full bg-white transition-transform group-hover:scale-125" />
          <div className="flex flex-col">
            <span className="font-display font-medium text-sm sm:text-base tracking-[0.18em] text-white uppercase">
              Nexus
            </span>
            <span className="text-[9px] font-mono tracking-widest text-zinc-400 uppercase -mt-0.5">
              Smart Cane
            </span>
          </div>
        </button>

        {/* Minimal Desktop Links */}
        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleLinkClick(item.id)}
                className={`text-[11px] font-mono tracking-widest uppercase transition-colors relative py-1 ${
                  isActive
                    ? 'text-white font-medium'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-white" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Minimal Tooling Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Audio Feedback Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-full border transition-all ${
              isMuted
                ? 'border-white/10 text-zinc-500 hover:text-zinc-300 bg-white/[0.02]'
                : 'border-white/20 text-white bg-white/10'
            }`}
            title={isMuted ? 'Unmute Sonar' : 'Mute Sonar'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Mode Switch: Demo vs Live API */}
          <button
            onClick={() => setIsDemoMode(!isDemoMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-mono tracking-wider uppercase text-zinc-300 transition-colors"
          >
            <Radio className={`w-3 h-3 ${isDemoMode ? 'text-zinc-400' : 'text-emerald-400'}`} />
            <span>{isDemoMode ? 'Sim' : 'Live'}</span>
          </button>

          {/* Clean Minimal CTA */}
          <button
            onClick={() => handleLinkClick('dashboard')}
            className="px-4 py-1.5 bg-white text-black hover:bg-zinc-200 text-xs font-mono font-medium uppercase tracking-wider rounded-full transition-all active:scale-95"
          >
            Telemetry
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-zinc-300 hover:text-white border border-white/10 rounded bg-white/[0.02]"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#07080a]/98 backdrop-blur-2xl border-b border-white/10 px-6 py-8 mt-3 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => handleLinkClick(item.id)}
                className={`text-left text-xs font-mono tracking-widest uppercase py-2 border-b border-white/5 transition-colors ${
                  activeSection === item.id ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10 text-xs font-mono">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="flex items-center gap-2 text-zinc-400 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{isMuted ? 'Muted' : 'Audio On'}</span>
            </button>

            <button
              onClick={() => setIsDemoMode(!isDemoMode)}
              className="flex items-center gap-2 text-zinc-300 bg-white/5 px-3 py-1.5 border border-white/10 rounded-full"
            >
              <Radio className={`w-3 h-3 ${isDemoMode ? 'text-zinc-400' : 'text-emerald-400'}`} />
              <span>{isDemoMode ? 'Sim Mode' : 'Live API'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
