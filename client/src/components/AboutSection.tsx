import React from 'react';
import { SectionTitle } from './ui/SectionTitle';
import { Award, BookOpen, Users, Lightbulb, Code2, Sparkles } from 'lucide-react';

export const AboutSection: React.FC = () => {
  const pillars = [
    {
      title: 'Assistive Independence',
      desc: 'Designed not as a cumbersome gadget, but as an elegant, natural extension of the traveler’s natural sensory apparatus.',
      icon: <Lightbulb className="w-5 h-5 text-zinc-300" />,
    },
    {
      title: 'Edge Neural Computing',
      desc: 'Zero mandatory cloud tethering for safety-critical ranging. Obstacle detection loops run 100% locally on low-power silicon.',
      icon: <Code2 className="w-5 h-5 text-zinc-300" />,
    },
    {
      title: 'Open Academic Architecture',
      desc: 'Built as an extensible research platform combining accessible microcontrollers with modular firmware for future assistive upgrades.',
      icon: <BookOpen className="w-5 h-5 text-zinc-300" />,
    },
  ];

  return (
    <section id="about" className="py-24 sm:py-32 md:py-40 px-6 sm:px-8 max-w-7xl mx-auto border-t border-white/10">
      <SectionTitle
        number="09"
        tag="ACADEMIC ENGINEERING & MISSION"
        title="ABOUT THE NEXUS INITIATIVE."
        subtitle="Bridging cutting-edge robotics and computer vision to empower independent mobility for visually impaired individuals."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-16">
        <div className="lg:col-span-7 space-y-6 text-zinc-300 text-base sm:text-lg leading-relaxed font-sans">
          <p>
            The <strong className="text-white font-medium">AI Smart Blind Stick (Nexus)</strong> is a capstone engineering project designed to address the physical limitations of traditional walking canes. While mechanical canes have aided mobility for centuries, they remain fundamentally reactive—only alerting the traveler when the cane tip physically strikes an object.
          </p>
          <p>
            Our architecture combines dual-phase sensory modalities: high-frequency 40kHz ultrasonic acoustic sonar for centimeter-accurate ranging, paired with an onboard ESP32-CAM neural accelerator running quantized edge vision models.
          </p>
          <p>
            By delivering discreet ergonomic haptic feedback through the handle grip alongside frequency-modulated auditory spatial pings, the device warns travelers of obstacles before physical contact, preserving their momentum and spatial orientation.
          </p>
        </div>

        {/* Project Facts Column */}
        <div className="lg:col-span-5 p-8 border border-white/10 bg-zinc-950/70 backdrop-blur-md">
          <div className="flex items-center gap-3 text-zinc-400 font-mono text-xs uppercase tracking-widest mb-6">
            <Award className="w-4 h-4 text-zinc-400" />
            <span>RESEARCH SPECIFICATION</span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-zinc-500">PROJECT TITLE</span>
              <span className="text-white font-medium">AI Smart Blind Cane</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-zinc-500">DOMAIN</span>
              <span className="text-white font-medium">Assistive IoT & Embedded AI</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-zinc-500">MICROCONTROLLER</span>
              <span className="text-white font-medium">ESP32 Dual-Core 240MHz</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-zinc-500">OPTICAL SENSOR</span>
              <span className="text-white font-medium">OV2640 2MP Camera</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-zinc-500">SONAR RANGE</span>
              <span className="text-white font-medium">2cm to 400cm (±2mm)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-zinc-500">CLOUD SYNC</span>
              <span className="text-zinc-300 font-medium">REST API + WebSockets</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-white/10">
        {pillars.map((p, idx) => (
          <div key={idx} className="p-8 border border-white/10 bg-white/[0.01]">
            <div className="mb-4">{p.icon}</div>
            <h4 className="font-display font-medium text-xl text-white mb-2">{p.title}</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
