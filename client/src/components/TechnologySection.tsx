import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Eye, Radio, Signal, Compass, Sparkles, Activity } from 'lucide-react';
import { SectionTitle } from './ui/SectionTitle';

interface TechComponent {
  id: string;
  name: string;
  code: string;
  tag: string;
  pins: string;
  purpose: string;
  details: string;
  specs: { label: string; value: string }[];
  icon: React.ReactNode;
}

export const TechnologySection: React.FC = () => {
  const [activeId, setActiveId] = useState<string>('esp32');

  const components: TechComponent[] = [
    {
      id: 'esp32',
      name: 'ESP32 Dual-Core Brain',
      code: 'MCU-NODE-01',
      tag: 'MASTER CONTROLLER',
      pins: 'UART / SPI / I2C / GPIO',
      purpose: 'Coordinates all peripheral sensors, manages neural inference tasks, and streams telemetry.',
      details: 'Powered by a 240MHz dual-core Xtensa LX6 microprocessor with integrated 2.4GHz Wi-Fi and Bluetooth 4.2 BLE. It executes the real-time distance loop in under 12 milliseconds while simultaneously servicing caregiver cloud sockets.',
      specs: [
        { label: 'Clock Speed', value: '240 MHz Dual-Core' },
        { label: 'SRAM', value: '520 KB + 4MB PSRAM' },
        { label: 'Connectivity', value: 'Wi-Fi 802.11 b/g/n + BLE' },
        { label: 'Operating Voltage', value: '3.3V DC Low-Power' },
      ],
      icon: <Cpu className="w-5 h-5 text-zinc-300" />,
    },
    {
      id: 'hc-sr04',
      name: 'HC-SR04 Ultrasonic Array',
      code: 'SONAR-TX-RX',
      tag: 'ACOUSTIC RANGING',
      pins: 'Trig: GPIO 5 | Echo: GPIO 18',
      purpose: 'Transmits 40 kHz ultrasonic bursts to calculate time-of-flight distance to obstacles.',
      details: 'Calculates precise distance between 2cm and 400cm using the speed of sound formula (Distance = Time × 343m/s / 2). It provides blind spots protection even in pitch-black darkness or glare where optical cameras might struggle.',
      specs: [
        { label: 'Ranging Range', value: '2 cm – 400 cm' },
        { label: 'Acoustic Frequency', value: '40 kHz' },
        { label: 'Measurement Angle', value: '15° Focus Beam' },
        { label: 'Precision', value: '± 2 mm Ranging' },
      ],
      icon: <Activity className="w-5 h-5 text-zinc-300" />,
    },
    {
      id: 'esp32-cam',
      name: 'ESP32-CAM AI Vision',
      code: 'OPTIC-OV2640',
      tag: 'NEURAL CLASSIFIER',
      pins: 'D0-D7 / VSYNC / HREF / PCLK',
      purpose: 'Captures high-frame rate visual frames for real-time edge object classification.',
      details: 'Equipped with an OV2640 2-Megapixel camera lens and integrated TF-Lite Micro runtime. Distinguishes between pedestrians, furniture, stairs, vehicles, and pets with over 96% confidence score.',
      specs: [
        { label: 'Resolution', value: 'UXGA 1600x1200 / JPEG' },
        { label: 'Lens Aperture', value: 'f/2.2 Wide Glass' },
        { label: 'Inference Speed', value: '35 ms per inference' },
        { label: 'Flash Illumination', value: 'High-Power LED' },
      ],
      icon: <Eye className="w-5 h-5 text-zinc-300" />,
    },
    {
      id: 'sim800l',
      name: 'SIM800L GSM Module',
      code: 'CELL-GSM-800L',
      tag: 'EMERGENCY CELLULAR',
      pins: 'UART TX/RX | VCC | GND',
      purpose: 'Enables GSM-based emergency communication by sending SMS alerts to a predefined emergency contact when the SOS button is pressed.',
      details: 'Communicates with the ESP32 using UART serial communication and uses the cellular network to transmit emergency messages containing the user\'s alert status and, if available, GPS location.',
      specs: [
        { label: 'Network', value: 'GSM / 2G' },
        { label: 'Communication', value: 'SMS' },
        { label: 'Operating Voltage', value: '3.7–4.2 V' },
        { label: 'Response Time', value: 'Typically a few seconds, depending on network availability' },
        { label: 'Main Function', value: 'Emergency SOS SMS & location alert' },
      ],
      icon: <Signal className="w-5 h-5 text-zinc-300" />,
    },
    {
      id: 'vibration',
      name: 'Precision Haptic Motor',
      code: 'HAPTIC-ERM-02',
      tag: 'TACTILE FEEDBACK',
      pins: 'PWM: GPIO 21 via NPN Driver',
      purpose: 'Delivers subtle directional tactile vibrations straight into the cane handle grip.',
      details: 'Ensures the visually impaired traveler receives sensory feedback without drawing public attention or masking important ambient street acoustics like vehicle engines and footsteps.',
      specs: [
        { label: 'Vibration Rate', value: '11,000 RPM Max' },
        { label: 'Motor Type', value: 'Eccentric Rotating Mass' },
        { label: 'Grip Placement', value: 'Ergonomic Top Shell' },
        { label: 'Drive Circuit', value: '2N2222 Transistor Buffer' },
      ],
      icon: <Radio className="w-5 h-5 text-zinc-300" />,
    },
    {
      id: 'gps',
      name: 'NEO-6M GPS Module',
      code: 'GEO-SAT-06',
      tag: 'GEOLOCATION SATELLITE',
      pins: 'TX: GPIO 16 | RX: GPIO 17',
      purpose: 'Monitors real-time coordinates for remote caregiver dashboard and emergency SOS alerts.',
      details: 'Tracks 50 satellite channels with active patch antenna. Streams latitude and longitude over MQTT/REST to the cloud dashboard, allowing caregivers to monitor safe zones and trigger remote locate beeps.',
      specs: [
        { label: 'Position Accuracy', value: '2.5 m CEP' },
        { label: 'Update Rate', value: '1 Hz to 5 Hz' },
        { label: 'Time-To-First-Fix', value: '27s Cold / 1s Hot' },
        { label: 'Protocol', value: 'NMEA 0183 Standards' },
      ],
      icon: <Compass className="w-5 h-5 text-zinc-300" />,
    },
  ];

  const currentComp = components.find((c) => c.id === activeId) || components[0];

  return (
    <section id="technology" className="py-24 sm:py-32 md:py-40 px-6 sm:px-8 max-w-7xl mx-auto border-t border-white/10">
      <SectionTitle
        number="04"
        tag="INTEGRATED HARDWARE ECOSYSTEM"
        title="PRECISION HARDWARE. SEAMLESS SYNERGY."
        subtitle="Six enterprise-grade electronic subsystems operate concurrently within a monolithic aerospace carbon-fiber shaft."
      />

      {/* Main Split View: Left Macro Photo, Right Component Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        {/* Left Column: Macro Optical Lens Studio Close-up (2.jpg) */}
        <div className="lg:col-span-6 relative border border-white/10 bg-black overflow-hidden flex flex-col justify-between group">
          <div className="relative aspect-[4/3] sm:aspect-[16/10] lg:aspect-auto lg:h-[520px] overflow-hidden">
            <img
              src="/assets/2.jpg"
              alt="Nexus AI Smart Cane Optical Lens and Electronics Macro"
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />

            {/* Overlaid Sensor Callout Badges */}
            <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-200 tracking-widest uppercase">
                OPTICAL CORE • 2MP AI-NAV LENS
              </span>
            </div>

            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-xs font-mono text-zinc-300">
              <span className="bg-black/80 backdrop-blur-md px-3 py-1.5 border border-white/10">
                CERAMIC BEZEL • DUAL STATUS ILLUMINATION
              </span>
              <span className="hidden sm:inline-block bg-black/80 backdrop-blur-md px-3 py-1.5 border border-white/10 text-zinc-300">
                IP67 SEALED
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Hardware Selector & Spec Sheet */}
        <div className="lg:col-span-6 flex flex-col justify-between border border-white/10 bg-zinc-950/70 p-6 sm:p-8 backdrop-blur-xl">
          {/* Component Tabs Bar */}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
              SELECT SUBSYSTEM TO INSPECT:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
              {components.map((c) => {
                const isSelected = activeId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveId(c.id)}
                    className={`flex items-center gap-2 p-3 text-left border transition-all text-xs font-mono uppercase tracking-wider ${
                      isSelected
                        ? 'bg-white text-black font-semibold border-white'
                        : 'bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:border-zinc-600'
                    }`}
                  >
                    <span>{c.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Component Detail Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentComp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-zinc-400 tracking-widest uppercase">
                    {currentComp.tag}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500 bg-white/5 px-2.5 py-1 border border-white/10">
                    {currentComp.code}
                  </span>
                </div>

                <h3 className="font-display font-medium text-2xl sm:text-3xl text-white mb-4">
                  {currentComp.name}
                </h3>

                <p className="text-zinc-300 text-sm leading-relaxed mb-6 font-sans">
                  {currentComp.purpose}
                </p>

                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6 font-sans">
                  {currentComp.details}
                </p>

                {/* Pinout callout */}
                <div className="p-3 bg-white/[0.02] border border-white/10 mb-6 flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 uppercase">Hardware Interface:</span>
                  <span className="text-zinc-200">{currentComp.pins}</span>
                </div>

                {/* Technical Specs matrix */}
                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-white/10">
                  {currentComp.specs.map((s, idx) => (
                    <div
                      key={idx}
                      className={`p-3 bg-black/40 border border-white/5 ${
                        idx === currentComp.specs.length - 1 && currentComp.specs.length % 2 === 1
                          ? 'col-span-2'
                          : ''
                      }`}
                    >
                      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">{s.label}</div>
                      <div className="text-xs font-mono text-white font-medium mt-1">{s.value}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
