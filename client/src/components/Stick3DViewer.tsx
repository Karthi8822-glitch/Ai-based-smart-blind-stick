import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Eye, Layers, Compass, Zap } from 'lucide-react';

interface Stick3DViewerProps {
  className?: string;
}

export const Stick3DViewer: React.FC<Stick3DViewerProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<string | null>('hc-sr04');
  const [wireframe, setWireframe] = useState<boolean>(false);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07080b, 0.08);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 7.5);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.2); // Clean white studio key
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa1a1aa, 1.0); // Subtle zinc rim
    dirLight2.position.set(-6, -4, -4);
    scene.add(dirLight2);

    // Group for cane
    const caneGroup = new THREE.Group();
    scene.add(caneGroup);

    // Cane Materials
    const carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.35,
      metalness: 0.85,
    });
    const matteHandleMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1d24,
      roughness: 0.6,
      metalness: 0.2,
    });
    const titaniumCollar = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.2,
      metalness: 0.95,
    });
    const lensMaterial = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
    });
    const groundTipMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.1,
    });

    materialsRef.current = [carbonMaterial, matteHandleMaterial, titaniumCollar, lensMaterial, groundTipMaterial];

    // Main Carbon Fiber Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.09, 0.08, 4.4, 32);
    const shaftMesh = new THREE.Mesh(shaftGeo, carbonMaterial);
    shaftMesh.position.y = -0.5;
    caneGroup.add(shaftMesh);

    // Shaft Collars / Rings
    const ringGeo = new THREE.TorusGeometry(0.098, 0.016, 16, 32);
    const ring1 = new THREE.Mesh(ringGeo, titaniumCollar);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 1.3;
    caneGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, titaniumCollar);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 0.6;
    caneGroup.add(ring2);

    // Handle Head Unit (Ergonomic curve + electronics enclosure)
    const headGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.95, 32);
    const headMesh = new THREE.Mesh(headGeo, matteHandleMaterial);
    headMesh.position.set(0, 1.95, 0);
    caneGroup.add(headMesh);

    // Ergonomic Curved Grip
    const curve = new THREE.CubicBezierCurve3(
      new THREE.Vector3(0, 2.35, 0),
      new THREE.Vector3(0.3, 2.45, 0),
      new THREE.Vector3(0.8, 2.2, 0),
      new THREE.Vector3(0.75, 1.7, 0)
    );
    const gripGeo = new THREE.TubeGeometry(curve, 32, 0.12, 16, false);
    const gripMesh = new THREE.Mesh(gripGeo, matteHandleMaterial);
    caneGroup.add(gripMesh);

    // ESP32-CAM Optical Lens Housing
    const lensHousingGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.12, 32);
    const lensHousing = new THREE.Mesh(lensHousingGeo, titaniumCollar);
    lensHousing.rotation.x = Math.PI / 2;
    lensHousing.position.set(0, 2.1, 0.2);
    caneGroup.add(lensHousing);

    // Glass Camera Lens
    const lensGeo = new THREE.SphereGeometry(0.1, 24, 24);
    const lensMesh = new THREE.Mesh(lensGeo, lensMaterial);
    lensMesh.position.set(0, 2.1, 0.25);
    caneGroup.add(lensMesh);

    // Ultrasonic Sensor HC-SR04 Dual Transducers
    const sonarEmitterGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 24);
    const sonar1 = new THREE.Mesh(sonarEmitterGeo, titaniumCollar);
    sonar1.rotation.x = Math.PI / 2;
    sonar1.position.set(-0.1, 1.65, 0.16);
    caneGroup.add(sonar1);

    const sonar2 = new THREE.Mesh(sonarEmitterGeo, titaniumCollar);
    sonar2.rotation.x = Math.PI / 2;
    sonar2.position.set(0.1, 1.65, 0.16);
    caneGroup.add(sonar2);

    // Ground Tip Sensor (Omnidirectional ceramic foot)
    const tipGeo = new THREE.SphereGeometry(0.16, 24, 24);
    const tipMesh = new THREE.Mesh(tipGeo, groundTipMaterial);
    tipMesh.position.set(0, -2.75, 0);
    caneGroup.add(tipMesh);

    // Pulsing Sonar Waves Emission
    const waveCount = 3;
    const waveRings: THREE.Mesh[] = [];
    const waveGeo = new THREE.RingGeometry(0.2, 0.24, 32);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < waveCount; i++) {
      const wave = new THREE.Mesh(waveGeo, waveMat.clone());
      wave.position.set(0, 1.65, 0.4 + i * 0.4);
      caneGroup.add(wave);
      waveRings.push(wave);
    }

    // Grid Floor
    const gridHelper = new THREE.GridHelper(10, 20, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -2.85;
    scene.add(gridHelper);

    // Initial slight rotation
    caneGroup.rotation.y = -0.35;
    caneGroup.rotation.x = 0.08;

    // Mouse Drag Interaction
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      caneGroup.rotation.y += deltaX * 0.008;
      caneGroup.rotation.x = Math.max(-0.4, Math.min(0.4, caneGroup.rotation.x + deltaY * 0.005));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Touch support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      caneGroup.rotation.y += deltaX * 0.008;
      caneGroup.rotation.x = Math.max(-0.4, Math.min(0.4, caneGroup.rotation.x + deltaY * 0.005));
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onMouseUp);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Idle float & subtle autorotation if not dragging
      if (!isDragging) {
        caneGroup.rotation.y += 0.003;
        caneGroup.position.y = Math.sin(elapsed * 1.5) * 0.06;
      }

      // Animate Sonar pulse waves expanding outward
      waveRings.forEach((w, idx) => {
        const offset = (elapsed * 1.4 + idx * 0.6) % 2.0;
        w.scale.set(1 + offset * 2.8, 1 + offset * 2.8, 1);
        w.position.z = 0.3 + offset * 1.6;
        const mat = w.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.7 - offset * 0.35);
      });

      // Lens glow pulse
      lensMaterial.emissiveIntensity = 0.3 + Math.sin(elapsed * 3) * 0.25;

      renderer.render(scene, camera);
    };

    animate();

    // Resize
    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
      if (mount && domEl.parentNode === mount) {
        mount.removeChild(domEl);
      }
      renderer.dispose();
    };
  }, []);

  // Toggle wireframe
  const toggleWireframe = () => {
    setWireframe(!wireframe);
    materialsRef.current.forEach((m) => {
      m.wireframe = !wireframe;
    });
  };

  const hotspots = [
    {
      id: 'esp32-cam',
      title: 'ESP32-CAM AI Vision',
      desc: 'OV2640 2MP optical sensor with onboard edge neural inference for object tagging.',
      coords: 'TOP FRONT'
    },
    {
      id: 'hc-sr04',
      title: 'HC-SR04 Sonar Array',
      desc: '40kHz dual ultrasonic transducers calculating obstacle distance with 2cm precision.',
      coords: 'MID HOUSING'
    },
    {
      id: 'haptic-motor',
      title: 'Haptic Vibro-Motor',
      desc: 'Integrated into ergonomic grip providing directional pulse alerts.',
      coords: 'HANDLE CORE'
    },
    {
      id: 'gps-geo',
      title: 'GPS & Telemetry',
      desc: 'NEO-6M satellite tracking for live geofencing and caregiver SOS alerts.',
      coords: 'SHAFT BODY'
    }
  ];

  return (
    <div className={`relative w-full h-[540px] md:h-[640px] bg-gradient-to-b from-[#090b10] to-[#050608] border border-white/10 overflow-hidden select-none ${className}`}>
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left Controls */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 border border-white/10 text-xs font-mono text-zinc-300">
          <Compass className="w-3.5 h-3.5 text-zinc-400" />
          <span>DRAG 3D MODEL TO INSPECT</span>
        </div>

        <button
          onClick={toggleWireframe}
          className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 border border-white/10 text-xs font-mono text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          <span>{wireframe ? 'SURFACE: SHADED' : 'SURFACE: WIREFRAME'}</span>
        </button>
      </div>

      {/* Top Right Live Telemetry Legend */}
      <div className="absolute top-6 right-6 z-10 hidden sm:flex flex-col gap-1 text-right font-mono text-[11px] text-zinc-400 bg-black/80 backdrop-blur-md p-3 border border-white/10">
        <span className="text-white font-medium flex items-center justify-end gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          ULTRASONIC RANGING ACTIVE
        </span>
        <span>LATENCY: 14ms</span>
        <span>CONE ANGLE: 15°</span>
      </div>

      {/* Bottom Interactive Hotspots Pills */}
      <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-950/80 backdrop-blur-xl p-4 border border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          {hotspots.map((h) => (
            <button
              key={h.id}
              onClick={() => setActiveHotspot(h.id)}
              className={`px-3 py-1.5 text-xs font-mono tracking-wider uppercase transition-all border ${
                activeHotspot === h.id
                  ? 'bg-white text-black font-semibold border-white'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600'
              }`}
            >
              {h.title}
            </button>
          ))}
        </div>

        {activeHotspot && (
          <div className="text-xs font-sans text-zinc-300 max-w-sm sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10">
            {hotspots.find((h) => h.id === activeHotspot)?.desc}
          </div>
        )}
      </div>
    </div>
  );
};
