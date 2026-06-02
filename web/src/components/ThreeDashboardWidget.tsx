import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Move, RefreshCw } from "lucide-react";

export default function ThreeDashboardWidget() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [spinning, setSpinning] = useState(true);
  const [activeNodesCount, setActiveNodesCount] = useState(60);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Interactive state for drag/rotation
    const interaction = {
      isDragging: false,
      prevMouseX: 0,
      prevMouseY: 0,
      rotX: 0.3,
      rotY: 0.5,
      targetRotX: 0.3,
      targetRotY: 0.5,
      zoom: 1,
    };

    // 1. SETUP THREE SCENE
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      50
    );
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. CREATE SYSTEM LATTICE
    const group = new THREE.Group();
    scene.add(group);

    // Grid lines helpers (bottom projection)
    const gridHelper = new THREE.GridHelper(8, 20, 0xef4444, 0x27272a);
    gridHelper.position.y = -3;
    gridHelper.material.opacity = 0.15;
    gridHelper.material.transparent = true;
    group.add(gridHelper);

    // Core central holographic database cylinder
    const coreCylGeo = new THREE.CylinderGeometry(1.2, 1.2, 3, 32, 1, true);
    const coreCylMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const coreCyl = new THREE.Mesh(coreCylGeo, coreCylMat);
    group.add(coreCyl);

    // Neural lattice nodes (cyber targets)
    const nodeCount = activeNodesCount;
    const nodeGeometry = new THREE.BufferGeometry();
    const nodePositions = new Float32Array(nodeCount * 3);
    const nodeSpeeds = new Float32Array(nodeCount);
    const nodeOffsets = new Float32Array(nodeCount);

    const initialPositions: {x: number, y: number, z: number}[] = [];

    for (let i = 0; i < nodeCount; i++) {
      // Cylindrical/spherical cluster layout
      const theta = (i / nodeCount) * Math.PI * 4 + Math.random() * 0.5;
      const r = 1.8 + Math.random() * 1.6;
      const y = (Math.random() - 0.5) * 4;

      const x = r * Math.cos(theta);
      const z = r * Math.sin(theta);

      nodePositions[i * 3] = x;
      nodePositions[i * 3 + 1] = y;
      nodePositions[i * 3 + 2] = z;

      initialPositions.push({ x, y, z });

      nodeSpeeds[i] = 0.5 + Math.random() * 1.5;
      nodeOffsets[i] = Math.random() * Math.PI * 2;
    }

    nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));

    // Custom glowing point texture
    const createCircleTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.2, "rgba(239, 68, 68, 0.9)");
        grad.addColorStop(0.5, "rgba(239, 68, 68, 0.3)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 16);
      }
      return new THREE.CanvasTexture(canvas);
    };

    const pointMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.28,
      map: createCircleTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(nodeGeometry, pointMaterial);
    group.add(points);

    // Active hazard vectors links (lines connecting certain points)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });

    const linePositions: number[] = [];
    // Random links
    for (let i = 0; i < nodeCount; i += 2) {
      if (i + 1 < nodeCount) {
        const p1 = initialPositions[i];
        const p2 = initialPositions[i + 1];
        linePositions.push(p1.x, p1.y, p1.z);
        linePositions.push(p2.x, p2.y, p2.z);
      }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    group.add(lines);

    // Orbit scanner circular rings
    const ringGeo = new THREE.RingGeometry(3.6, 3.63, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.1,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // Interactive event listeners
    const handleMouseDown = (e: MouseEvent) => {
      interaction.isDragging = true;
      interaction.prevMouseX = e.clientX;
      interaction.prevMouseY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!interaction.isDragging) return;
      const deltaX = e.clientX - interaction.prevMouseX;
      const deltaY = e.clientY - interaction.prevMouseY;

      interaction.targetRotY += deltaX * 0.007;
      interaction.targetRotX += deltaY * 0.007;

      interaction.prevMouseX = e.clientX;
      interaction.prevMouseY = e.clientY;
    };

    const handleMouseUp = () => {
      interaction.isDragging = false;
    };

    // Touch support for mobiles
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        interaction.isDragging = true;
        interaction.prevMouseX = e.touches[0].clientX;
        interaction.prevMouseY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!interaction.isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - interaction.prevMouseX;
      const deltaY = e.touches[0].clientY - interaction.prevMouseY;

      interaction.targetRotY += deltaX * 0.007;
      interaction.targetRotX += deltaY * 0.007;

      interaction.prevMouseX = e.touches[0].clientX;
      interaction.prevMouseY = e.touches[0].clientY;
    };

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleMouseUp);

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // 3. ANIMATION CYCLE
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Slow idle spin if not dragging
      if (spinning && !interaction.isDragging) {
        interaction.targetRotY += 0.002;
      }

      // Smooth interpolation (lerp)
      interaction.rotX += (interaction.targetRotX - interaction.rotX) * 0.1;
      interaction.rotY += (interaction.targetRotY - interaction.rotY) * 0.1;

      group.rotation.x = interaction.rotX;
      group.rotation.y = interaction.rotY;

      // Animate individual nodes subtly in waveform
      const posAttr = points.geometry.attributes.position;
      const count = posAttr.count;

      for (let i = 0; i < count; i++) {
        const offset = nodeOffsets[i];
        const speed = nodeSpeeds[i];
        
        let py = posAttr.getY(i);
        // Subtly wave heights
        py += Math.sin(elapsed * speed + offset) * 0.004;
        posAttr.setY(i, py);
      }
      points.geometry.attributes.position.needsUpdate = true;

      // Pulse inner core cylinder scale to evaluate healthy connection rates
      const pulseSec = 1.0 + Math.sin(elapsed * 3) * 0.06;
      coreCyl.scale.set(pulseSec, 1, pulseSec);

      // Rotate scanner ring
      ring.position.y = Math.sin(elapsed * 1.5) * 1.5;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
      resizeObserver.disconnect();
      cancelAnimationFrame(animId);

      // Resources cleanup
      scene.clear();
      gridHelper.dispose();
      coreCylGeo.dispose();
      coreCylMat.dispose();
      nodeGeometry.dispose();
      pointMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [spinning, activeNodesCount]);

  return (
    <div className="relative bg-[#08080c] border border-white/[0.03] rounded-2xl p-5 flex flex-col justify-between h-[360px] overflow-hidden group">
      {/* HUD Header overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <span className="text-[9px] text-red-500 font-mono tracking-widest uppercase block mb-1">
          3D Cyber Space Matrix
        </span>
        <h4 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider">
          Active Threat Lattice Node
        </h4>
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {/* Interaction indicator */}
        <div className="flex items-center gap-1 bg-[#101016]/80 text-zinc-500 px-2 py-1 rounded font-mono text-[9px] border border-white/[0.03]">
          <Move className="w-3 h-3 text-red-400" />
          <span>DRAG TO ROTATE</span>
        </div>
      </div>

      {/* THREE viewport container */}
      <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Control console overlay footer */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between">
        <div className="flex gap-1.5">
          <button
            onClick={() => setSpinning(!spinning)}
            className={`px-2 py-1 font-mono text-[9px] rounded border transition-colors ${
              spinning
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-zinc-900 text-zinc-500 border-white/[0.03]"
            }`}
          >
            {spinning ? "AUTO_ROT_ON" : "AUTO_ROT_OFF"}
          </button>
          <button
            onClick={() => {
              setActiveNodesCount(prev => prev === 60 ? 120 : prev === 120 ? 30 : 60);
            }}
            className="px-2 py-1 bg-zinc-900 border border-white/[0.03] text-zinc-400 hover:text-white font-mono text-[9px] rounded flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            DENSITY: {activeNodesCount}
          </button>
        </div>
        <div className="text-[9px] text-zinc-500 font-mono text-right">
          LATENCY: <span className="text-red-400 font-bold">14ms</span>
        </div>
      </div>
    </div>
  );
}
