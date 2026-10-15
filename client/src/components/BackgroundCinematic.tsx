import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Film, Eye, Play, Pause, Sliders } from 'lucide-react';

interface BackgroundCinematicProps {
  currentSection?: string;
}

export type BgMode = 'video' | 'frames' | 'ambient';

export const BackgroundCinematic: React.FC<BackgroundCinematicProps> = ({ currentSection = 'home' }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [bgMode, setBgMode] = useState<BgMode>('video');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const [opacity, setOpacity] = useState<number>(0.55); // optimal balance between video visibility and text readability
  const [showControls, setShowControls] = useState<boolean>(false);

  // Framer Motion scroll parallax
  const { scrollYProgress } = useScroll();
  const yParallax = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
  const scaleParallax = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  // Preloaded frames for frame mode
  const framesRef = useRef<HTMLImageElement[]>([]);
  const totalFrames = 40;

  useEffect(() => {
    // Preload frames for scrubber mode
    const loadedImages: HTMLImageElement[] = [];
    for (let i = 1; i <= totalFrames; i++) {
      const img = new Image();
      const padNum = String(i).padStart(3, '0');
      img.src = `/assets/frames/ezgif-frame-${padNum}.jpg`;
      loadedImages.push(img);
    }
    framesRef.current = loadedImages;
  }, []);

  // Frame scrubber driven by scroll
  useEffect(() => {
    if (bgMode !== 'frames') return;

    const unsubscribe = scrollYProgress.on('change', (progress) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const frameIndex = Math.max(
        0,
        Math.min(totalFrames - 1, Math.floor(progress * totalFrames))
      );
      const img = framesRef.current[frameIndex];
      if (img && img.complete) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw with cover fit
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (canvas.width - img.width * ratio) / 2;
        const centerShiftY = (canvas.height - img.height * ratio) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
      }
    });

    return () => unsubscribe();
  }, [bgMode, scrollYProgress]);

  // Keep video playing smoothly at cinematic 0.85x playback speed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = 0.85;

    if (isPlaying && bgMode === 'video') {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, bgMode]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
      {/* Parallax Moving Container */}
      <motion.div
        style={{ y: yParallax, scale: scaleParallax }}
        className="relative w-full h-[120%] -top-[10%]"
      >
        {/* Mode 1: High-Def Background Video */}
        {bgMode === 'video' && (
          <video
            ref={videoRef}
            src="/assets/stick-video.mp4"
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => setVideoLoaded(true)}
            className="w-full h-full object-cover filter brightness-[0.55] contrast-[1.15] saturate-[1.1] transition-opacity duration-1000"
            style={{ opacity: videoLoaded ? opacity : 0 }}
          />
        )}

        {/* Mode 2: Scroll-Driven 40-Frame Canvas */}
        {bgMode === 'frames' && (
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            className="w-full h-full object-cover filter brightness-[0.55] contrast-[1.15] transition-opacity duration-700"
            style={{ opacity }}
          />
        )}

        {/* Mode 3: Atmospheric Ken-Burns Ambient Stills */}
        {bgMode === 'ambient' && (
          <div className="relative w-full h-full">
            <motion.img
              src="/assets/1.jpg"
              alt="Nexus Ambient Backdrop"
              animate={{
                scale: [1, 1.08, 1],
                x: [0, 15, 0],
              }}
              transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full h-full object-cover filter brightness-[0.45] contrast-[1.2]"
              style={{ opacity }}
            />
          </div>
        )}

        {/* Dark Editorial Scrim Gradients to Guarantee 100% Typography Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080a]/92 via-[#07080a]/65 to-[#07080a]/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#07080a]/40 to-[#07080a]/90" />

        {/* Futuristic Subtle Grid Line Matrix */}
        <div className="absolute inset-0 bg-tech-grid opacity-20" />
      </motion.div>

      {/* Floating Bottom-Left Background Cinema Controller (Interactive) */}
      <div className="fixed bottom-6 left-6 z-40 pointer-events-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-full text-[10px] font-mono">
          {/* Video Mode Button */}
          <button
            onClick={() => {
              setBgMode('video');
              setIsPlaying(true);
            }}
            className={`px-3 py-1 rounded-full uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              bgMode === 'video'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Film className="w-3 h-3" />
            <span>Cinematic BG</span>
          </button>

          {/* Frames Mode Button */}
          <button
            onClick={() => setBgMode('frames')}
            className={`px-3 py-1 rounded-full uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              bgMode === 'frames'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Scroll Scrub</span>
          </button>

          {/* Play/Pause Button (if in video mode) */}
          {bgMode === 'video' && (
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 text-zinc-300 hover:text-white transition-colors"
              title={isPlaying ? 'Pause Background Video' : 'Play Background Video'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            </button>
          )}

          {/* Quick Opacity Adjuster Toggle */}
          <button
            onClick={() => setShowControls(!showControls)}
            className={`p-1.5 rounded-full transition-colors ${showControls ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
            title="Adjust Backdrop Intensity"
          >
            <Sliders className="w-3 h-3" />
          </button>
        </div>

        {/* Expanded Opacity Slider Flyout */}
        {showControls && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 p-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-full text-[10px] font-mono text-zinc-300 shadow-xl"
          >
            <span className="pl-1">GLOW:</span>
            <input
              type="range"
              min={0.2}
              max={0.9}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-16 accent-white h-1 bg-zinc-700 rounded cursor-pointer"
            />
            <span className="pr-1">{Math.round(opacity * 100)}%</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};
