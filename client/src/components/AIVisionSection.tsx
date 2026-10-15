import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Eye,
  AlertTriangle,
  ShieldCheck,
  Video,
  VideoOff,
  Sparkles,
  Upload,
  RefreshCw,
  Volume2,
  VolumeX,
  Code2,
  CheckCircle2,
  Layers,
  Zap,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SectionTitle } from './ui/SectionTitle';
import { useStickData } from '../context/StickDataContext';
import { soundSynth } from '../utils/soundSynth';
import { api } from '../services/api';
import { RoboflowPrediction, RoboflowInferenceResponse, VisionSample } from '../types';

interface PresetScene {
  id: string;
  name: string;
  filename: string;
  imageSrc: string;
  description: string;
  category: string;
}

export const AIVisionSection: React.FC = () => {
  const { isMuted, triggerObstacle } = useStickData();

  // Preset Project Scenarios available locally
  const presetScenes: PresetScene[] = [
    {
      id: 'scene-3',
      name: 'Sidewalk',
      filename: '3.jpg',
      imageSrc: '/assets/3.jpg',
      description: 'Primary concrete pedestrian sidewalk corridor with edge curb boundary and safe walking space.',
      category: 'Walkway Navigation',
    },
    {
      id: 'scene-1',
      name: 'Road Crossing',
      filename: 'road-crossing.jpg',
      imageSrc: '/assets/road-crossing.jpg',
      description: 'Street crossing transition zone with asphalt paving and boundary scanning.',
      category: 'Corridor Inspection',
    },
    {
      id: 'scene-2',
      name: 'Walking on Stairs',
      filename: 'walking-on-stairs.jpg',
      imageSrc: '/assets/walking-on-stairs.jpg',
      description: 'Staircase descent and elevation changes with step edge and handrail scanning.',
      category: 'Elevation Transition',
    },
    {
      id: 'frame-1',
      name: 'Detecting pothole',
      filename: 'detecting-pothole.jpg',
      imageSrc: '/assets/detecting-pothole.jpg',
      description: 'Surface pothole and fractured asphalt scanning for ground elevation and terrain safety.',
      category: 'Surface Hazard',
    },
  ];

  // Supported Roboflow Vision Models
  const availableModels = [
    {
      id: 'pedestrian-viewer/4',
      name: 'Pedestrian & Walkway',
      type: 'Instance Segmentation',
      description: 'Instance segmentation model designed for pedestrian pathway classification, curb identification, and forward obstacle boundary detection.',
    },
    {
      id: 'vechile-zleex/2',
      name: 'Vehicle & Traffic',
      type: 'Object Detection',
      description: 'Real-time vehicle detection model for tracking oncoming cars, trucks, buses, and roadway hazards.',
    },
    {
      id: 'fall-detection-ca3o8/4',
      name: 'Fall & Emergency',
      type: 'Object Detection',
      description: 'Safety model specialized in recognizing fallen pedestrians for rapid automated caregiver alerts.',
    },
    {
      id: 'people-detection-o4rdr/12',
      name: 'People & Crowd',
      type: 'Object Detection',
      description: 'Object detection model for identifying individuals and crowd clusters along the walking path.',
    },
    {
      id: 'object-detection-9ffwy/1',
      name: 'Object & Barrier',
      type: 'Object Detection',
      description: 'Object detection model for detecting ground and waist-level spatial obstacles and barriers.',
    },
  ];

  const [selectedModelId, setSelectedModelId] = useState<string>('pedestrian-viewer/4');
  const [activeSceneIdx, setActiveSceneIdx] = useState<number>(0);
  const [customImageSrc, setCustomImageSrc] = useState<string | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [autoScanWebcam, setAutoScanWebcam] = useState<boolean>(false);
  
  // Inference state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [inferenceData, setInferenceData] = useState<RoboflowInferenceResponse | null>(null);
  const [selectedPredId, setSelectedPredId] = useState<string | null>(null);
  const [showJsonDrawer, setShowJsonDrawer] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(true);
  const [modelLatency, setModelLatency] = useState<number>(38);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoScanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentScene = presetScenes[activeSceneIdx];
  const activeImageSrc = customImageSrc || currentScene.imageSrc;

  // Speak guidance text out loud using browser SpeechSynthesis
  const speakGuidance = useCallback((text: string) => {
    if (!speechEnabled || isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis safety catch
    }
  }, [speechEnabled, isMuted]);

  // Execute Roboflow Inference on the current active image or sample
  const runInference = useCallback(async (customPayload?: { base64?: string; sample?: string; modelId?: string }) => {
    setIsLoading(true);
    soundSynth.playClick();
    const modelToUse = customPayload?.modelId || selectedModelId;

    try {
      let res;
      if (customPayload?.base64) {
        res = await api.inferRoboflow({ image: customPayload.base64, modelId: modelToUse, syncObstacles: true });
      } else if (customPayload?.sample) {
        res = await api.inferRoboflow({ sampleName: customPayload.sample, modelId: modelToUse, syncObstacles: true });
      } else if (customImageSrc) {
        res = await api.inferRoboflow({ image: customImageSrc, modelId: modelToUse, syncObstacles: true });
      } else {
        // Use active preset filename
        res = await api.inferRoboflow({ sampleName: currentScene.filename, modelId: modelToUse, syncObstacles: true });
      }

      if (res && res.success && res.data) {
        setInferenceData(res.data);
        setModelLatency(res.data.processingTimeMs || 42);

        // If predictions exist, highlight first and give audio feedback
        if (res.data.predictions && res.data.predictions.length > 0) {
          const first = res.data.predictions[0];
          setSelectedPredId(first.id);

          // Audio sonar ping based on distance
          soundSynth.playSonarPing(first.estimatedDistance);

          // Speech guidance
          if (res.data.summary?.speechAnnouncement) {
            speakGuidance(res.data.summary.speechAnnouncement);
          }

          // Trigger obstacle telemetry into the stick context if danger
          if (first.safetyStatus === 'CRITICAL' || first.safetyStatus === 'CAUTION') {
            triggerObstacle(first.class, first.estimatedDistance, first.confidence);
          }
        } else {
          setSelectedPredId(null);
          speakGuidance('Path clear ahead. No immediate obstacles detected.');
        }
      }
    } catch (err: any) {
      console.error('Roboflow inference error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [customImageSrc, currentScene.filename, speakGuidance, triggerObstacle]);

  // Initial load: run inference on 3.jpg automatically to show real Roboflow results
  useEffect(() => {
    runInference({ sample: '3.jpg' });
  }, []);

  // Handle preset scene click
  const handleSelectScene = (idx: number) => {
    setActiveSceneIdx(idx);
    setCustomImageSrc(null);
    if (isWebcamActive) {
      stopWebcam();
    }
    const scene = presetScenes[idx];
    runInference({ sample: scene.filename });
  };

  // Handle custom image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCustomImageSrc(base64);
      if (isWebcamActive) stopWebcam();
      runInference({ base64 });
    };
    reader.readAsDataURL(file);
  };

  // Webcam activation / capture logic
  const startWebcam = async () => {
    try {
      setWebcamError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsWebcamActive(true);
      setCustomImageSrc(null);
      soundSynth.playClick();
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      setWebcamError('Camera access declined or unavailable in browser permissions.');
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
    setAutoScanWebcam(false);
    if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
    setWebcamError(null);
  };

  const toggleWebcam = () => {
    if (isWebcamActive) stopWebcam();
    else startWebcam();
  };

  // Snap frame from active webcam stream and send to Roboflow
  const captureWebcamFrame = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);
    runInference({ base64 });
  }, [runInference]);

  // Webcam auto-scan interval
  useEffect(() => {
    if (autoScanWebcam && isWebcamActive) {
      autoScanIntervalRef.current = setInterval(() => {
        captureWebcamFrame();
      }, 2600);
    } else if (autoScanIntervalRef.current) {
      clearInterval(autoScanIntervalRef.current);
    }

    return () => {
      if (autoScanIntervalRef.current) clearInterval(autoScanIntervalRef.current);
    };
  }, [autoScanWebcam, isWebcamActive, captureWebcamFrame]);

  // Clean up webcam on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  // Copy raw JSON to clipboard
  const copyJsonToClipboard = () => {
    if (!inferenceData) return;
    navigator.clipboard.writeText(JSON.stringify(inferenceData, null, 2));
    setCopiedJson(true);
    soundSynth.playClick();
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Determine active prediction details
  const activePred = inferenceData?.predictions?.find((p) => p.id === selectedPredId) ||
    inferenceData?.predictions?.[0] || null;

  return (
    <section id="ai-vision" className="py-24 sm:py-32 md:py-40 px-6 sm:px-8 max-w-7xl mx-auto border-t border-white/10">
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6 mb-12">
        <SectionTitle
          number="06"
          tag="EDGE NEURAL PERCEPTION"
          title="ROBOFLOW INSTANCE SEGMENTATION."
          subtitle="Real-time multi-model spatial perception (pedestrian-viewer/4, vechile-zleex/2, fall-detection-ca3o8/4) powered by Roboflow Serverless Cloud."
          className="mb-0"
        />

        {/* Global Model Status Badges & Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="uppercase tracking-wider text-zinc-400">MODEL:</span>
            <select
              value={selectedModelId}
              onChange={(e) => {
                const newModel = e.target.value;
                setSelectedModelId(newModel);
                runInference({ modelId: newModel });
              }}
              className="bg-transparent text-emerald-300 font-mono text-[11px] uppercase tracking-wider focus:outline-none cursor-pointer border-none py-0 pr-1"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-200">
                  {m.id}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Speech Toggle */}
          <button
            onClick={() => {
              setSpeechEnabled(!speechEnabled);
              soundSynth.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono border transition-all ${
              speechEnabled
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
            title="Toggle Voice Guidance Speech"
          >
            {speechEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{speechEnabled ? 'VOICE ON' : 'VOICE OFF'}</span>
          </button>

          {/* Webcam Toggle */}
          <button
            onClick={toggleWebcam}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-mono uppercase tracking-wider transition-all border rounded-full ${
              isWebcamActive
                ? 'bg-red-500/20 border-red-500/50 text-red-300'
                : 'bg-zinc-900/80 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500'
            }`}
          >
            {isWebcamActive ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5 text-zinc-300" />}
            <span>{isWebcamActive ? 'Stop Camera' : 'Live Camera'}</span>
          </button>
        </div>
      </div>

      {webcamError && (
        <div className="mb-6 p-4 border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{webcamError}</span>
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="relative border border-white/10 bg-black overflow-hidden shadow-2xl rounded-sm">
        {/* Top Floating HUD Status Bar */}
        <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-3 bg-black/85 backdrop-blur-md px-3.5 py-1.5 border border-white/10 text-xs font-mono pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-200 tracking-wider uppercase font-semibold">
              {isWebcamActive ? 'CAMERA STREAM' : 'ROBOFLOW ONNX FP32'}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-cyan-400 text-[11px]">
              {inferenceData?.predictionsCount || 0} INSTANCE{inferenceData?.predictionsCount === 1 ? '' : 'S'} DETECTED
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 bg-black/85 backdrop-blur-md px-3.5 py-1.5 border border-white/10 text-xs font-mono text-zinc-400">
            <span className="text-zinc-300">LATENCY: {modelLatency}ms</span>
            <span className="text-zinc-700">|</span>
            <span>BACKEND: ONNX SERVERLESS</span>
          </div>
        </div>

        {/* Viewport Frame */}
        <div className="relative aspect-[16/9] md:aspect-[21/10] overflow-hidden bg-black flex items-center justify-center">
          {/* Active Visual Stream (Webcam or Image) */}
          {isWebcamActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={activeImageSrc}
              alt="AI Computer Vision Detection Target"
              className="w-full h-full object-cover filter brightness-95"
            />
          )}

          {/* Holographic Matrix Grid & Vignette */}
          <div className="absolute inset-0 bg-dot-matrix opacity-25 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/50 pointer-events-none" />

          {/* Scanning Beam (Active during loading or auto-scan) */}
          {isLoading && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scanline" />
            </div>
          )}

          {/* SVG Layer: High-Precision Instance Segmentation Polygon Masks */}
          {inferenceData?.predictions && inferenceData.predictions.length > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Sidewalk gradient pattern */}
                <linearGradient id="sidewalkGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.30" />
                </linearGradient>
                {/* Hazard gradient pattern */}
                <linearGradient id="hazardGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.35" />
                </linearGradient>
                {/* Verge gradient pattern */}
                <linearGradient id="vergeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.40" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.25" />
                </linearGradient>
              </defs>

              {inferenceData.predictions.map((pred) => {
                if (!pred.pointsPercent || pred.pointsPercent.length === 0) return null;
                const pointsString = pred.pointsPercent.map((p) => `${p.x},${p.y}`).join(' ');
                const isSelected = selectedPredId === pred.id;

                let fillUrl = 'url(#sidewalkGlow)';
                let strokeColor = '#10b981';
                if (pred.safetyStatus === 'CRITICAL' || pred.class.toLowerCase().includes('obstacle')) {
                  fillUrl = 'url(#hazardGlow)';
                  strokeColor = '#ef4444';
                } else if (pred.safetyStatus === 'CAUTION' || pred.class.toLowerCase().includes('pedestrian')) {
                  fillUrl = 'url(#hazardGlow)';
                  strokeColor = '#f59e0b';
                } else if (pred.class.toLowerCase().includes('verge')) {
                  fillUrl = 'url(#vergeGlow)';
                  strokeColor = '#8b5cf6';
                }

                return (
                  <g key={`poly-${pred.id}`}>
                    <polygon
                      points={pointsString}
                      fill={fillUrl}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? '0.6' : '0.35'}
                      strokeDasharray={pred.class.toLowerCase().includes('sidewalk') ? '1.5 0.8' : 'none'}
                      className="transition-all duration-300 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                    />
                  </g>
                );
              })}
            </svg>
          )}

          {/* HTML Overlay: Interactive Bounding Boxes with Corner Brackets & Tag Pins */}
          <AnimatePresence>
            {inferenceData?.predictions &&
              inferenceData.predictions.map((pred) => {
                const isSelected = selectedPredId === pred.id;
                const isNavigable = pred.class.toLowerCase().includes('sidewalk');
                const isHazard = pred.safetyStatus === 'CRITICAL';

                return (
                  <motion.div
                    key={`box-${pred.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => {
                      setSelectedPredId(pred.id);
                      soundSynth.playSonarPing(pred.estimatedDistance);
                      speakGuidance(pred.guidanceText);
                    }}
                    className={`absolute cursor-pointer transition-all duration-300 z-20 ${
                      isSelected
                        ? 'border-2 shadow-[0_0_25px_rgba(255,255,255,0.4)]'
                        : 'border border-dashed'
                    } ${
                      isNavigable
                        ? 'border-emerald-400/90'
                        : isHazard
                        ? 'border-red-400/90'
                        : 'border-amber-400/90'
                    }`}
                    style={{
                      left: `${pred.boxPercent.left}%`,
                      top: `${pred.boxPercent.top}%`,
                      width: `${pred.boxPercent.width}%`,
                      height: `${pred.boxPercent.height}%`,
                    }}
                  >
                    {/* High-tech Corner Brackets */}
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-white" />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-white" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-white" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-white" />

                    {/* Tag Pin */}
                    <div
                      className={`absolute -top-7 left-0 flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase rounded-xs shadow-lg ${
                        isNavigable
                          ? 'bg-emerald-400 text-black'
                          : isHazard
                          ? 'bg-red-500 text-white'
                          : 'bg-amber-400 text-black'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                      <span>{pred.class.toUpperCase()}</span>
                      <span className="opacity-75 font-normal">{(pred.confidence * 100).toFixed(0)}%</span>
                      <span className="bg-black/20 px-1 rounded-xs">~{pred.estimatedDistance}m</span>
                    </div>
                  </motion.div>
                );
              })}
          </AnimatePresence>

          {/* Bottom Right Floating Guidance / Assistive Card */}
          <div className="absolute bottom-6 right-6 z-30 max-w-sm w-full sm:w-80 bg-zinc-950/92 backdrop-blur-xl border border-white/15 p-5 shadow-2xl">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1.5">
              <span>ROBOFLOW SPATIAL PERCEPTION</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
            </div>

            <div className="font-display font-medium text-xl text-white tracking-tight uppercase mb-2">
              {activePred ? activePred.class.toUpperCase() : 'CLEAR PATHWAY'}
            </div>

            <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-4">
              {activePred
                ? activePred.guidanceText
                : 'Visual scan complete. Corridor open with no obstacle signatures.'}
            </p>

            <div className="space-y-1.5 pt-3 border-t border-white/10 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500">RANGE ESTIMATE</span>
                <span className="text-cyan-300 font-semibold">
                  {activePred ? `${activePred.estimatedDistance}M` : 'SAFE'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">MODEL CONFIDENCE</span>
                <span className="text-zinc-200 font-semibold">
                  {activePred ? `${(activePred.confidence * 100).toFixed(1)}%` : '99.2%'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">CORRIDOR SAFETY</span>
                <span
                  className={`font-semibold uppercase ${
                    (activePred?.safetyStatus || 'SAFE') === 'CRITICAL'
                      ? 'text-red-400'
                      : (activePred?.safetyStatus || 'SAFE') === 'CAUTION'
                      ? 'text-amber-300'
                      : 'text-emerald-400'
                  }`}
                >
                  {activePred ? activePred.safetyStatus : 'SAFE'}
                </span>
              </div>
            </div>

            {/* Quick Interactive Actions */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => {
                  soundSynth.playSonarPing(activePred ? activePred.estimatedDistance : 2.0);
                }}
                className="py-2 bg-white/5 hover:bg-white/10 text-[11px] font-mono uppercase tracking-wider text-zinc-200 border border-zinc-800 hover:border-zinc-500 transition-colors rounded-xs flex items-center justify-center gap-1.5"
              >
                <span>Sonar Ping</span>
              </button>

              <button
                onClick={() => {
                  speakGuidance(
                    activePred
                      ? activePred.guidanceText
                      : 'Corridor clear ahead. Safe to proceed.'
                  );
                }}
                className="py-2 bg-white/5 hover:bg-white/10 text-[11px] font-mono uppercase tracking-wider text-cyan-300 border border-cyan-800/60 hover:border-cyan-500 transition-colors rounded-xs flex items-center justify-center gap-1.5"
              >
                <Volume2 className="w-3 h-3" />
                <span>Audio TTS</span>
              </button>
            </div>
          </div>
        </div>

        {/* Viewport Control Bar */}
        <div className="p-4 sm:p-5 bg-zinc-950 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 mr-2">
              SCENARIO:
            </span>
            {presetScenes.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => handleSelectScene(idx)}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-all border rounded-xs ${
                  activeSceneIdx === idx && !customImageSrc && !isWebcamActive
                    ? 'bg-white text-black font-semibold border-white shadow-sm'
                    : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Action Triggers: Upload Image / Webcam Scan / Run Inference */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 px-3 h-9 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white text-xs font-mono uppercase tracking-wider rounded-xs transition-colors shrink-0"
              title="Upload custom image to run inference"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>Upload Photo</span>
            </button>

            {isWebcamActive && (
              <button
                onClick={captureWebcamFrame}
                disabled={isLoading}
                className="flex items-center justify-center gap-1.5 px-3 h-9 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs font-mono uppercase tracking-wider rounded-xs transition-colors shrink-0"
              >
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span>Snap Frame</span>
              </button>
            )}

            <button
              onClick={() => {
                if (isWebcamActive) captureWebcamFrame();
                else runInference();
              }}
              disabled={isLoading}
              className={`flex items-center justify-center gap-2 px-4 h-9 text-xs font-mono uppercase tracking-wider rounded-xs transition-colors font-semibold border shrink-0 whitespace-nowrap min-w-[215px] ${
                isLoading
                  ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border-zinc-700'
                  : 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-black border-transparent hover:brightness-110 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Running Inference...' : 'Run Roboflow Inference'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Detections List & Technical Specifications Banner */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Model Spec Card */}
        <div className="p-5 border border-white/10 bg-zinc-950/60 rounded-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              ARCHITECTURE SPEC
            </span>
            <span className="px-2 py-0.5 text-[9px] font-mono bg-zinc-800 text-zinc-300 rounded-xs">
              {availableModels.find((m) => m.id === selectedModelId)?.type || 'FP32 QUANTIZED'}
            </span>
          </div>
          <div className="font-display font-medium text-lg text-white mb-2">
            {selectedModelId}
          </div>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            {availableModels.find((m) => m.id === selectedModelId)?.description ||
              'Instance segmentation and object detection model hosted on Roboflow Serverless Cloud.'}
          </p>
          <div className="mt-4 pt-3 border-t border-white/10 flex justify-between text-xs font-mono text-zinc-400">
            <span>INPUT RES: 2752 x 1536</span>
            <span className="text-emerald-400">STATUS: ACTIVE</span>
          </div>
        </div>

        {/* Spatial Intelligence Card */}
        <div className="p-5 border border-white/10 bg-zinc-950/60 rounded-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              SMART STICK FUSION
            </span>
            <span className="px-2 py-0.5 text-[9px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800/50 rounded-xs">
              OPTICAL + SONAR
            </span>
          </div>
          <div className="font-display font-medium text-lg text-white mb-2">
            Multi-Modal Spatial Traversal
          </div>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            Segments the safe walking corridor (sidewalk polygon) and cross-references with ultrasonic acoustic time-of-flight to verify physical clearance.
          </p>
          <div className="mt-4 pt-3 border-t border-white/10 flex justify-between text-xs font-mono text-zinc-400">
            <span>RADIAL BEAM: 30° CONE</span>
            <span className="text-cyan-400">HAPTIC: SYNCED</span>
          </div>
        </div>

        {/* Telemetry & Developer Drawer Toggle Card */}
        <div className="p-5 border border-white/10 bg-zinc-950/60 rounded-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                DEVELOPER TELEMETRY
              </span>
              <span className="px-2 py-0.5 text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/50 rounded-xs">
                JSON REST API
              </span>
            </div>
            <div className="font-display font-medium text-lg text-white mb-2">
              Roboflow Serverless Cloud API
            </div>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              API key securely loaded from server environment. Dispatches base64 image over HTTPS with Bearer authorization.
            </p>
          </div>

          <button
            onClick={() => setShowJsonDrawer(!showJsonDrawer)}
            className="mt-4 w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-600 transition-colors rounded-xs flex items-center justify-center gap-2"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showJsonDrawer ? 'Hide Raw API JSON' : 'Inspect Raw Roboflow JSON'}</span>
            {showJsonDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Collapsible Roboflow Raw JSON Drawer */}
      <AnimatePresence>
        {showJsonDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 border border-white/15 bg-zinc-950 overflow-hidden rounded-sm"
          >
            <div className="p-4 bg-zinc-900/80 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-400 font-semibold">POST</span>
                <span className="text-zinc-300">https://serverless.roboflow.com/{selectedModelId}</span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-400">Header: Authorization Bearer [SECURED]</span>
              </div>

              <button
                onClick={copyJsonToClipboard}
                className="flex items-center gap-1.5 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono rounded-xs transition-colors"
              >
                {copiedJson ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>

            <pre className="p-4 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-96 leading-relaxed selection:bg-zinc-700">
              {inferenceData ? JSON.stringify(inferenceData, null, 2) : '// No inference executed yet'}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
