import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Send, CheckCircle2, Mail, MapPin } from 'lucide-react';
import { soundSynth } from '../utils/soundSynth';

export const ContactSection: React.FC = () => {
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Academic Collaboration',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundSynth.playClick();
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setFormData({ name: '', email: '', subject: 'Academic Collaboration', message: '' });
    }, 4000);
  };

  return (
    <section id="contact" className="py-24 sm:py-32 md:py-40 px-6 sm:px-8 max-w-7xl mx-auto border-t border-white/15">
      {/* High-Contrast Editorial Section Header */}
      <div className="flex flex-col mb-16 md:mb-20 text-left items-start">
        <div className="flex items-center gap-3 mb-4 text-xs font-mono tracking-widest text-zinc-300 uppercase">
          <span className="text-white font-semibold">10</span>
          <span className="h-1 w-1 rounded-full bg-zinc-400" />
          <span className="tracking-[0.25em] text-zinc-200 font-medium">ENGAGE & COLLABORATE</span>
        </div>
        <h2 className="font-display font-medium text-4xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight text-white leading-[1.08] max-w-4xl">
          COLLABORATE & INQUIRE.
        </h2>
        <p className="mt-6 text-base sm:text-lg text-zinc-200 font-normal leading-relaxed max-w-2xl font-sans">
          Connect for hardware schematics, firmware code, academic review, or assistive technology trial requests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Contact Info (5 Cols) */}
        <div className="lg:col-span-5 space-y-8">
          <div className="p-8 border border-white/15 bg-[#0d0e12]/95 backdrop-blur-xl shadow-2xl">
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-zinc-300 font-semibold block mb-3">
              ACADEMIC RESEARCH FACILITY
            </span>
            <h3 className="font-display font-medium text-2xl text-white mb-6">
              Department of Electronics Communication Engineering
            </h3>

            <div className="space-y-4 text-sm font-mono text-zinc-100">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-white shrink-0" />
                <span className="text-zinc-100">project.smartstick@nexus-assist.edu</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-white shrink-0" />
                <span className="text-zinc-100">SNS College of Technology</span>
              </div>
            </div>
          </div>

          <div className="p-6 border border-white/15 bg-[#0d0e12]/95 backdrop-blur-xl shadow-2xl">
            <h4 className="font-mono text-xs text-white uppercase tracking-wider mb-2 font-semibold">
              HARDWARE SCHEMATICS & FIRMWARE
            </h4>
            <p className="text-sm text-zinc-200 font-sans leading-relaxed">
              Complete KiCad circuit schematics, Gerber PCB files, 3D printable STL handle enclosures, and ESP-IDF C++ firmware source are available for educational research.
            </p>
          </div>
        </div>

        {/* Contact Form (7 Cols) */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="p-8 sm:p-10 border border-white/15 bg-[#0d0e12]/95 backdrop-blur-xl shadow-2xl"
          >
            {formSubmitted ? (
              <div className="py-16 text-center flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-4 animate-bounce" />
                <h4 className="font-display font-medium text-2xl text-white mb-2">Message Transmitted</h4>
                <p className="text-zinc-200 text-sm max-w-sm font-sans">
                  Thank you for reaching out. The engineering team will review your inquiry and provide documentation shortly.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono text-zinc-200 uppercase tracking-wider mb-2 font-semibold">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Dr. Eleanor Vance"
                      className="w-full px-4 py-3.5 bg-black/60 border border-white/20 text-white placeholder-zinc-400 text-sm font-sans focus:border-white focus:ring-1 focus:ring-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-200 uppercase tracking-wider mb-2 font-semibold">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.vance@university.edu"
                      className="w-full px-4 py-3.5 bg-black/60 border border-white/20 text-white placeholder-zinc-400 text-sm font-sans focus:border-white focus:ring-1 focus:ring-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-200 uppercase tracking-wider mb-2 font-semibold">
                    Inquiry Subject
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3.5 bg-[#111317] border border-white/20 text-white text-sm font-sans focus:border-white focus:ring-1 focus:ring-white focus:outline-none transition-colors"
                  >
                    <option value="Academic Collaboration" className="bg-[#111317] text-white py-2">Academic Collaboration & Research</option>
                    <option value="Hardware Schematics Request" className="bg-[#111317] text-white py-2">Hardware Schematics & KiCad Request</option>
                    <option value="Firmware Source Code" className="bg-[#111317] text-white py-2">ESP32 Firmware / FreeRTOS Source</option>
                    <option value="Clinical User Trial" className="bg-[#111317] text-white py-2">Assistive Blind Community User Trial</option>
                    <option value="Other" className="bg-[#111317] text-white py-2">Other Technical Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-200 uppercase tracking-wider mb-2 font-semibold">
                    Message Details *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your research inquiry or test environment specifications..."
                    className="w-full px-4 py-3.5 bg-black/60 border border-white/20 text-white placeholder-zinc-400 text-sm font-sans focus:border-white focus:ring-1 focus:ring-white focus:outline-none transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={<Send className="w-3.5 h-3.5" />}
                  className="w-full sm:w-auto"
                >
                  Transmit Inquiry
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};
