import React from 'react';
import { SectionTitle } from './ui/SectionTitle';
import { HardwareCard, HardwareItemProps } from './ui/HardwareCard';
import { Cpu, ShieldCheck, Download, Share2 } from 'lucide-react';

export const HardwareSection: React.FC = () => {
  const hardwareList: HardwareItemProps[] = [
    {
      id: 'esp32',
      name: 'ESP32 Microcontroller Brain',
      category: 'CENTRAL PROCESSING',
      tag: 'CORE 01',
      purpose:
        'Serves as the high-throughput computing nucleus of the smart stick, orchestrating dual-core sensor pooling, spatial distance calculations, and telemetry broadcasting.',
      howItWorks:
        'Executes asynchronous FreeRTOS tasks across two 32-bit Xtensa cores. Core 0 handles the high-priority ultrasonic pulse and interrupt timing, while Core 1 executes wireless cloud synchronization and user alert dispatch.',
      connection:
        'VCC to 3.3V Regulated Rail | GND to Common System Plane | SPI, I2C, and Hardware UART Buses across 36 GPIO Pins.',
      roleInSystem:
        'Primary system brain. Decides alert severity, triggers PWM motor duty cycles, calculates Kalman distance filtering, and packages telemetry for cloud transmission.',
      specs: [
        { label: 'Processor', value: 'Tensilica LX6 Dual-Core' },
        { label: 'Frequency', value: '240 MHz' },
        { label: 'Memory', value: '520KB SRAM + 4MB Flash' },
        { label: 'Wireless', value: 'Wi-Fi 802.11b/g/n + BLE 4.2' },
      ],
    },
    {
      id: 'ultrasonic',
      name: 'HC-SR04 Ultrasonic Sonar Array',
      category: 'ACOUSTIC RANGING',
      tag: 'CORE 02',
      purpose:
        'Provides precise acoustic distance measurement to solid, transparent, and specular obstacles that optical cameras might fail to detect in direct sunlight or darkness.',
      howItWorks:
        'Triggers an 8-cycle 40kHz sonic burst when a 10µs pulse is sent to TRIG. Upon echo reception, the ECHO pin remains HIGH for a duration directly proportional to target range (Distance = Time × 343m/s / 2).',
      connection:
        'VCC to 5V Boost Rail | GND to Common Ground | TRIG to ESP32 GPIO 5 | ECHO to ESP32 GPIO 18 (via 1kΩ / 2kΩ resistive voltage divider to safely level-shift 5V to 3.3V).',
      roleInSystem:
        'Frontal collision prevention. Continuously refreshes distance readings every 35 milliseconds to deliver instant proximity warnings.',
      specs: [
        { label: 'Operating Range', value: '2 cm to 400 cm' },
        { label: 'Resolution', value: '± 2 mm' },
        { label: 'Beam Angle', value: '15 Degrees Effective' },
        { label: 'Working Current', value: '15 mA' },
      ],
    },
    {
      id: 'esp32-cam',
      name: 'ESP32-CAM Optical Neural Module',
      category: 'COMPUTER VISION',
      tag: 'CORE 03',
      purpose:
        'Captures ambient optical frames and performs lightweight edge inference to identify what kind of obstacle is ahead (pedestrian, door, steps, vehicle).',
      howItWorks:
        'The OV2640 2-megapixel image sensor feeds image frames via 8-bit parallel DVP interface to onboard 4MB PSRAM. A quantized TensorFlow Lite MobileNet model classifies the dominant feature.',
      connection:
        'VCC to 5V Clean Rail | GND to Common Ground | Serial TX/RX connected to Primary ESP32 UART2 (GPIO 16/17) for inter-chip IPC messages.',
      roleInSystem:
        'Semantic contextual awareness. Informs the user whether an obstacle is a walking human, a bench, or a vehicle, turning raw distance numbers into contextual awareness.',
      specs: [
        { label: 'Camera Sensor', value: 'OmniVision OV2640 2MP' },
        { label: 'Image Output', value: 'JPEG / RGB565' },
        { label: 'Frame Rate', value: '30 FPS @ VGA' },
        { label: 'Flash Light', value: 'Onboard High-Lumen White LED' },
      ],
    },
    {
      id: 'sim800l',
      name: 'SIM800L GSM Module',
      category: 'CELLULAR SOS & SMS',
      tag: 'CORE 04',
      purpose:
        'Enables GSM-based emergency communication by sending SMS alerts to a predefined emergency contact when the SOS button is pressed.',
      howItWorks:
        'Communicates with the ESP32 using UART serial communication and uses the cellular network to transmit emergency messages containing the user\'s alert status and, if available, GPS location.',
      connection:
        'Hardware Interface: UART TX/RX | VCC (3.7–4.2 V) | GND Common Ground.',
      roleInSystem:
        'Emergency SOS & location alert dispatch channel. Transmits emergency telemetry to predefined contacts via cellular 2G/GSM network when triggered.',
      specs: [
        { label: 'Network', value: 'GSM / 2G' },
        { label: 'Communication', value: 'SMS' },
        { label: 'Operating Voltage', value: '3.7–4.2 V' },
        { label: 'Response Time', value: 'Typically a few seconds' },
      ],
    },
    {
      id: 'vibration-motor',
      name: 'Precision Haptic Vibro-Motor',
      category: 'TACTILE INTERFACE',
      tag: 'CORE 05',
      purpose:
        'Transmits discreet mechanical vibrations directly into the cane handle grip, ensuring privacy and preventing auditory masking of street noise.',
      howItWorks:
        'An eccentric rotating mass (ERM) miniature disc motor spins at controllable RPM. Pulsed duty cycle modulation produces distinct haptic patterns (single pulse for clear path, rapid buzzing for danger).',
      connection:
        'VCC to 3.3V via 1N4001 flyback diode | Base of 2N2222 NPN Transistor to ESP32 GPIO 21 with 1kΩ base resistor | Emitter to Ground.',
      roleInSystem:
        'Primary tactile alert channel. Delivers silent, immediate haptic warnings that can be perceived through winter gloves without obstructing hearing.',
      specs: [
        { label: 'Max Speed', value: '11,000 RPM' },
        { label: 'Form Factor', value: 'Coin Disc 10mm × 2.7mm' },
        { label: 'Response Rise Time', value: '35 ms' },
        { label: 'Drive Topology', value: 'NPN Transistor Switch' },
      ],
    },
    {
      id: 'gps-module',
      name: 'NEO-6M Satellite Navigation GPS',
      category: 'GEOLOCATION & SAFETY',
      tag: 'CORE 06',
      purpose:
        'Continuously tracks the traveler’s geographic location in global latitude/longitude coordinates for remote caregiver visibility and SOS panic routing.',
      howItWorks:
        'Receives multi-satellite microwave signals via active ceramic patch antenna. Decodes NMEA 0183 standard sentences ($GPRMC, $GPGGA) to output coordinates at 1Hz to 5Hz.',
      connection:
        'VCC to 3.3V/5V Rail | GND to Ground | TX to ESP32 RX2 (GPIO 16) | RX to ESP32 TX2 (GPIO 17).',
      roleInSystem:
        'Safety and telemetry stream. Enables the companion dashboard to locate the user in real-time, detect route departures, or pinpoint emergency SOS incidents.',
      specs: [
        { label: 'Receiver Engine', value: '50-Channel u-blox 6' },
        { label: 'Horizontal Precision', value: '2.5 m CEP' },
        { label: 'Update Interval', value: '1,000 ms' },
        { label: 'Backup Battery', value: 'Rechargeable RTC Cell' },
      ],
    },
  ];

  return (
    <section id="hardware" className="py-24 sm:py-32 md:py-40 px-6 sm:px-8 max-w-7xl mx-auto border-t border-white/10">
      <SectionTitle
        number="07"
        tag="COMPONENT DEEP DIVE"
        title="EMBEDDED HARDWARE SPECIFICATIONS."
        subtitle="Designed with industrial-grade microelectronics, level-shifted signal busses, and aerospace carbon composites."
      />

      {/* System Wiring Block Overview Banner */}
      <div className="mb-12 p-6 sm:p-8 bg-black/60 border border-white/10 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold tracking-widest uppercase">
            <Cpu className="w-4 h-4 text-zinc-400" />
            <span>CIRCUIT INTERFACE & PINOUT BUS MAP</span>
          </div>
          <span className="text-zinc-400">LOGIC LEVEL: 3.3V TTL / 5V PROTECTED</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-zinc-300">
          <div className="p-3 bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-zinc-500 block uppercase">BRAIN</span>
            <span className="font-semibold text-white">ESP32 Core</span>
            <span className="text-[10px] text-zinc-400 block mt-1">FreeRTOS Dual-Task</span>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-zinc-500 block uppercase">SONAR TRIG/ECHO</span>
            <span className="font-semibold text-white">GPIO 5 & 18</span>
            <span className="text-[10px] text-zinc-400 block mt-1">2mm Resolution</span>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-zinc-500 block uppercase">VISION CAM</span>
            <span className="font-semibold text-white">ESP32-CAM</span>
            <span className="text-[10px] text-zinc-400 block mt-1">UART2 Interlink</span>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-zinc-500 block uppercase">SIM800L GSM</span>
            <span className="font-semibold text-white">UART TX/RX</span>
            <span className="text-[10px] text-zinc-400 block mt-1">Emergency SOS</span>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-zinc-500 block uppercase">HAPTIC MOTOR</span>
            <span className="font-semibold text-white">GPIO 21 (NPN)</span>
            <span className="text-[10px] text-zinc-400 block mt-1">11,000 RPM Pulse</span>
          </div>
          <div className="p-3 bg-white/[0.02] border border-white/5">
            <span className="text-[10px] text-zinc-500 block uppercase">NEO-6M GPS</span>
            <span className="font-semibold text-white">GPIO 16 & 17</span>
            <span className="text-[10px] text-zinc-400 block mt-1">NMEA 9600 Baud</span>
          </div>
        </div>
      </div>

      {/* Grid of 6 Detailed Hardware Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {hardwareList.map((item) => (
          <HardwareCard key={item.id} {...item} />
        ))}
      </div>
    </section>
  );
};
