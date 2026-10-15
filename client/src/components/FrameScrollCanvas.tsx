import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Sliders, Eye } from 'lucide-react';

interface FrameScrollCanvasProps {
  className?: string;
  autoPlay?: boolean;
}

const TOTAL_FRAMES = 40;

export const FrameScrollCanvas: React.FC<FrameScrollCanvasProps> = ({
  className = '',
  autoPlay = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [currentFrame, setCurrentFrame] = useState<number>(1);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [isInteractive, setIsInteractive] = useState<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Preload all 40 frames
  useEffect(() => {
    const images: HTMLImageElement[] = [];
    let count = 0;

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const padNum = String(i).padStart(3, '0');
      img.src = `/assets/frames/ezgif-frame-${padNum}.jpg`;
      img.onload = () => {
        count++;
        setLoadedCount(count);
        // Draw first frame as soon as it arrives
        if (i === 1 && canvasRef.current) {
          drawFrame(1);
        }
      };
      img.onerror = () => {
        // Fallback to static 1.jpg if frame fails
        img.src = '/assets/1.jpg';
      };
      images.push(img);
    }
    imagesRef.current = images;

    return () => {
      imagesRef.current = [];
    };
  }, []);

  // Draw specific frame onto canvas with crisp aspect preservation
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[frameIndex - 1];
    if (!img || !img.complete) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Cover scale calculations
    const imgAspect = img.width / img.height;
    const canvasAspect = canvasWidth / canvasHeight;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasAspect > imgAspect) {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgAspect;
      offsetX = 0;
      offsetY = (canvasHeight - drawHeight) / 2;
    } else {
      drawHeight = canvasHeight;
      drawWidth = canvasHeight * imgAspect;
      offsetX = (canvasWidth - drawWidth) / 2;
      offsetY = 0;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    // Subtle dark gradient vignette around edges
    const grad = ctx.createRadialGradient(
      canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.25,
      canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.65
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(7, 8, 11, 0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }, []);

  // Window resize handler to maintain high DPI
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      drawFrame(currentFrame);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentFrame, drawFrame]);

  // Redraw when currentFrame changes
  useEffect(() => {
    drawFrame(currentFrame);
  }, [currentFrame, drawFrame]);

  // Autoplay loop (smooth 14-16 fps cinematic playback)
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const frameRate = 14;
    const interval = 1000 / frameRate;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;

      if (delta >= interval) {
        lastTimeRef.current = timestamp - (delta % interval);
        setCurrentFrame((prev) => (prev >= TOTAL_FRAMES ? 1 : prev + 1));
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying]);

  // Scroll-linked scrubbing when in view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || isPlaying) return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate fraction of container scroll
      const totalDist = windowHeight + rect.height;
      const currentPos = windowHeight - rect.top;
      const progress = Math.max(0, Math.min(1, currentPos / totalDist));

      const targetFrame = Math.max(1, Math.min(TOTAL_FRAMES, Math.floor(progress * TOTAL_FRAMES) + 1));
      setCurrentFrame(targetFrame);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isPlaying]);

  // Stage description based on frame
  const getStageLabel = (frame: number) => {
    if (frame < 8) return 'STANDBY • OPTICAL SENSOR READY';
    if (frame < 18) return 'ULTRASONIC & RADAR HARMONICS ACTIVE';
    if (frame < 30) return 'OBJECT RECOGNITION LOCK • 1.8M CONFIRMED';
    return 'REAL-WORLD CONTEXTUAL TRAVERSAL';
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-black border border-white/10 group ${className}`}
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover block cursor-crosshair"
        onClick={() => setIsPlaying(!isPlaying)}
      />

      {/* Frame Sequence Overlay Meta */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 border border-white/10">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-mono text-[11px] text-white tracking-widest uppercase">
            {getStageLabel(currentFrame)}
          </span>
        </div>

        <div className="font-mono text-[11px] text-slate-400 bg-black/60 backdrop-blur-md px-2.5 py-1.5 border border-white/10">
          FRAME {String(currentFrame).padStart(2, '0')}/{TOTAL_FRAMES}
        </div>
      </div>

      {/* Loading progress if downloading */}
      {loadedCount < TOTAL_FRAMES && (
        <div className="absolute bottom-16 left-6 right-6">
          <div className="flex justify-between text-[10px] font-mono text-zinc-400 mb-1">
            <span>CACHING SENSOR FRAMES</span>
            <span>{Math.round((loadedCount / TOTAL_FRAMES) * 100)}%</span>
          </div>
          <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-200"
              style={{ width: `${(loadedCount / TOTAL_FRAMES) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Interactive Scrubber Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-2 border border-white/10">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="text-white hover:text-zinc-300 transition-colors p-1"
          title={isPlaying ? 'Pause' : 'Play Sequence'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
        </button>

        <button
          onClick={() => {
            setIsPlaying(false);
            setCurrentFrame(1);
          }}
          className="text-zinc-400 hover:text-white transition-colors p-1"
          title="Reset Frame"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Range scrubber */}
        <div className="flex-1 flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={TOTAL_FRAMES}
            value={currentFrame}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentFrame(Number(e.target.value));
            }}
            className="w-full accent-white h-1 bg-zinc-700 rounded cursor-pointer"
          />
        </div>

        <span className="font-mono text-[10px] text-zinc-400 tracking-wider">
          SCRUB
        </span>
      </div>
    </div>
  );
};
