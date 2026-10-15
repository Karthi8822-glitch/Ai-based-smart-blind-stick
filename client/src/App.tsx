import React, { useEffect, useState, useRef } from 'react';
import Lenis from 'lenis';
import { StickDataProvider } from './context/StickDataContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { StorySection } from './components/StorySection';
import { ProblemSection } from './components/ProblemSection';
import { TechnologySection } from './components/TechnologySection';
import { HowItWorks } from './components/HowItWorks';
import { AIVisionSection } from './components/AIVisionSection';
import { HardwareSection } from './components/HardwareSection';
import { LiveDashboard } from './components/LiveDashboard';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { BackgroundCinematic } from './components/BackgroundCinematic';

export function AppContent() {
  const [activeSection, setActiveSection] = useState<string>('home');
  const lenisRef = useRef<Lenis | null>(null);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    // Track scroll position to update active navbar state
    const handleScroll = () => {
      const sections = [
        'home',
        'story',
        'problem',
        'technology',
        'how-it-works',
        'ai-vision',
        'hardware',
        'dashboard',
        'about',
        'contact',
      ];

      const scrollPos = window.scrollY + 200;
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
      lenis.destroy();
    };
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(element, { offset: -60, duration: 1.2 });
      } else {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="relative min-h-screen bg-[#07080a] text-zinc-100 font-sans selection:bg-white selection:text-black">
      {/* Background Architectural Tech Grid & Radial Glows */}
      <div className="fixed inset-0 bg-tech-grid opacity-20 pointer-events-none z-0" />
      <div className="fixed inset-0 noise-overlay opacity-25 pointer-events-none z-0" />

      {/* Fixed Cinematic Animated Background (Video Loop + Scroll Frames) */}
      <BackgroundCinematic currentSection={activeSection} />

      {/* Navigation */}
      <Navbar onNavigate={scrollToSection} activeSection={activeSection} />

      {/* Main Content Sections */}
      <main className="relative z-10">
        <div id="home">
          <Hero
            onExploreTech={() => scrollToSection('technology')}
            onHowItWorks={() => scrollToSection('how-it-works')}
          />
        </div>

        <div id="story">
          <StorySection />
        </div>

        <div id="problem">
          <ProblemSection />
        </div>

        <div id="technology">
          <TechnologySection />
        </div>

        <div id="how-it-works">
          <HowItWorks />
        </div>

        <div id="ai-vision">
          <AIVisionSection />
        </div>

        <div id="hardware">
          <HardwareSection />
        </div>

        <div id="dashboard">
          <LiveDashboard />
        </div>

        <div id="about">
          <AboutSection />
        </div>

        <div id="contact">
          <ContactSection />
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <StickDataProvider>
      <AppContent />
    </StickDataProvider>
  );
}
