import React from 'react';
import { motion } from 'framer-motion';
import { Radar, Gauge, BellRing, AlertCircle, ArrowUpRight, MapPin, Radio, Eye } from 'lucide-react';
import { SectionTitle } from './ui/SectionTitle';
import { FeatureCard } from './ui/FeatureCard';

export const ProblemSection: React.FC = () => {
  const challenges = [
    {
      number: '01 / HAZARDS',
      title: 'Obstacle Detection',
      description:
        'Physical white canes only detect objects upon direct impact. Low branches, open truck doors, signposts, and sudden pedestrians create constant collision hazards.',
      metric: {
        value: '3.5m Cone',
        label: 'Continuous Forward Scan',
      },
      icon: <Radar className="w-5 h-5" />,
    },
    {
      number: '02 / DEPTH',
      title: 'Distance Awareness',
      description:
        'Estimating the closing speed and exact proximity of hazards without vision is disorienting. Centimeter-level ranging provides critical reaction buffer.',
      metric: {
        value: '±2 cm Accuracy',
        label: 'Sonic Time-of-Flight',
      },
      icon: <Gauge className="w-5 h-5" />,
    },
    {
      number: '03 / RESPONSE',
      title: 'Instant Feedback',
      description:
        'Delayed notifications cause accidents. Feedback must bridge sensory channels instantly through dual ergonomic haptic vibration and directional sound cues.',
      metric: {
        value: '< 15 ms Latency',
        label: 'Sensory Reflex Pipeline',
      },
      icon: <BellRing className="w-5 h-5" />,
    },
    {
      number: '04 / ACCURACY',
      title: 'GPS Accuracy',
      description:
        'GPS accuracy – GPS may be less accurate indoors or in areas with weak satellite signals.',
      metric: {
        value: 'Weak Signal',
        label: 'Indoor / Satellite Attenuation',
      },
      icon: <MapPin className="w-5 h-5" />,
    },
    {
      number: '05 / NETWORK',
      title: 'GSM Connectivity',
      description:
        'GSM connectivity – SOS messages depend on mobile network availability.',
      metric: {
        value: 'Carrier Link',
        label: 'Mobile Signal Availability',
      },
      icon: <Radio className="w-5 h-5" />,
    },
    {
      number: '06 / VISION',
      title: 'AI Detection Accuracy',
      description:
        'AI detection accuracy – The AI model may sometimes incorrectly identify objects or miss obstacles.',
      metric: {
        value: 'Model Variance',
        label: 'Detection Misses',
      },
      icon: <Eye className="w-5 h-5" />,
    },
  ];

  return (
    <section id="problem" className="py-24 sm:py-32 md:py-40 px-6 sm:px-8 max-w-7xl mx-auto border-t border-white/10">
      <SectionTitle
        number="03"
        tag="THE CHALLENGE"
        title="NAVIGATING A WORLD BUILT FOR SIGHT."
        subtitle="Everyday transit presents unpredictable barriers that traditional canes miss. Nexus solves six foundational spatial vulnerabilities."
      />

      {/* Editorial Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {challenges.map((c, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: idx * 0.15 }}
          >
            <FeatureCard
              number={c.number}
              title={c.title}
              description={c.description}
              metric={c.metric}
              icon={c.icon}
            />
          </motion.div>
        ))}
      </div>

      {/* Quote / Editorial Divider */}
      <div className="mt-16 p-8 border border-white/10 bg-white/[0.02] flex flex-col md:flex-row items-baseline justify-between gap-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0" />
          <span className="text-xs font-mono text-zinc-300 uppercase tracking-widest">
            OVER 285 MILLION PEOPLE WORLDWIDE LIVE WITH SEVERE VISUAL IMPAIRMENT
          </span>
        </div>
        <span className="text-xs font-mono text-zinc-500">
          WHO GLOBAL SIGHT ACCESSIBILITY INITIATIVE
        </span>
      </div>
    </section>
  );
};
