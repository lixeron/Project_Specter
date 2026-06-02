import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // SCROLL & INTERACTIVE STATE
    const state = {
      scrollProgress: 0,
      targetScrollProgress: 0,
      mouseX: 0,
      mouseY: 0,
      targetMouseX: 0,
      targetMouseY: 0,
    };

    // 1. SETUP SCENE, CAMERA, RENDERER
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040406, 0.015);

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 2. GEOMETRIES & MATERIALS FOR A SPECTACULAR HOLOGRAPHIC CORE
    
    // Create a canvas texture for perfect circular glowing particles
    const createParticleTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.3, "rgba(231, 76, 60, 0.8)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 16, 16);
      }
      return new THREE.CanvasTexture(canvas);
    };
    const particleTexture = createParticleTexture();

    // Group to hold all 3D components
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Core Mesh 1: Nested Icosahedron Wireframe (Tensegrity shield style)
    const coreGeometry = new THREE.IcosahedronGeometry(1.8, 2);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xe74c3c,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    worldGroup.add(coreMesh);

    // Inner Core: Solid faceted icosahedron mimicking neural data storage
    const innerGeometry = new THREE.IcosahedronGeometry(0.9, 1);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x3498db,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
    worldGroup.add(innerMesh);

    // Outer scanning orbit ring
    const ringGeometry = new THREE.RingGeometry(2.3, 2.33, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xe74c3c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 3;
    worldGroup.add(ringMesh);

    // Dazzling satellite node points riding along the outer circle to highlight its spin
    const satCount = 4;
    const satGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const satMaterial = new THREE.MeshBasicMaterial({
      color: 0xe74c3c,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const satMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < satCount; i++) {
      const satMesh = new THREE.Mesh(satGeometry, satMaterial);
      worldGroup.add(satMesh);
      satMeshes.push(satMesh);
    }

    // 3. CONSTELLATION NODE PARTICLES
    const particleCount = 1000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const initialPositions = new Float32Array(particleCount * 3);
    const randomSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Create positions in a spherical/elliptical cloud distribution around the core
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.acos(Math.random() * 2 - 1);
      const radius = 2.5 + Math.random() * 4.5;

      const x = radius * Math.sin(angle2) * Math.cos(angle1);
      const y = radius * Math.sin(angle2) * Math.sin(angle1);
      const z = radius * Math.cos(angle2);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = y;
      initialPositions[i * 3 + 2] = z;

      randomSpeeds[i] = 0.1 + Math.random() * 0.9;
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.12,
      transparent: true,
      opacity: 0.45,
      map: particleTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    worldGroup.add(particles);

    // 4. SCROLL INTERPOLATOR (LERP) LOOP
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        state.targetScrollProgress = window.scrollY / scrollHeight;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // 5. MOUSE INTERACTION LISTENER
    const handleMouseMove = (e: MouseEvent) => {
      state.targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
      state.targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    // 6. RESIZE LISTENER
    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // 7. ANIMATION TICK LOOP
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Smoothly interpolate scroll progress and mouse coordinates
      state.scrollProgress += (state.targetScrollProgress - state.scrollProgress) * 0.08;
      state.mouseX += (state.targetMouseX - state.mouseX) * 0.05;
      state.mouseY += (state.targetMouseY - state.mouseY) * 0.05;

      // CORE GEOMETRY DEFORMATION (Procedural breathing noise)
      const corePosAttr = coreMesh.geometry.attributes.position;
      const coreCount = corePosAttr.count;

      for (let i = 0; i < coreCount; i++) {
        // Create continuous wave patterns on core vertices
        const u = corePosAttr.getX(i);
        const v = corePosAttr.getY(i);
        const w = corePosAttr.getZ(i);

        // Normalize
        const len = Math.sqrt(u * u + v * v + w * w);
        const ratio = 1.8 + Math.sin(len * 2 - elapsedTime * 1.5) * 0.08;

        corePosAttr.setX(i, (u / len) * ratio);
        corePosAttr.setY(i, (v / len) * ratio);
        corePosAttr.setZ(i, (w / len) * ratio);
      }
      coreMesh.geometry.attributes.position.needsUpdate = true;

      // PARTICLE MORPHING ON SCROLL
      const particlePosAttr = particles.geometry.attributes.position;
      const pCount = particlePosAttr.count;

      for (let i = 0; i < pCount; i++) {
        const idx = i * 3;
        const speed = randomSpeeds[i];

        // Orbit circulation
        const initX = initialPositions[idx];
        const initY = initialPositions[idx + 1];
        const initZ = initialPositions[idx + 2];

        // Continuous orbit calculations
        const speedFactor = elapsedTime * 0.08 * speed;
        const cosS = Math.cos(speedFactor);
        const sinS = Math.sin(speedFactor);

        let curX = initX * cosS - initZ * sinS;
        let curY = initY + Math.sin(elapsedTime * 0.2 + speed) * 0.2;
        let curZ = initX * sinS + initZ * cosS;

        // Mouse attraction element
        const mdx = state.mouseX * 2 - curX;
        const mdy = state.mouseY * 2 - curY;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 3) {
          const pull = (1 - mdist / 3) * 0.4;
          curX += mdx * pull;
          curY += mdy * pull;
        }

        // Apply interactive scroll compression
        // As scrollProgress increases (representing going down the page):
        // 0.0 -> Core state (floating orbital cloud)
        // 0.20 -> Stats state (expanded ring / nebula galaxy)
        // 0.52 -> Features grid (constellation shifted, split, flatter background)
        // 0.52+ -> Transition to final dense glowing shield / spinning ring
        const prog = state.scrollProgress;
        
        let targetX = curX;
        let targetY = curY;
        let targetZ = curZ;

        if (prog > 0.05 && prog < 0.20) {
          // Stat cloud state: particles gather in flat equatorial stellar disk
          const diskProg = (prog - 0.05) / 0.15;
          targetY = curY * (1 - diskProg * 0.85); // flatten y scale
          targetX = curX * (1 + diskProg * 0.3);  // expand wide
          targetZ = curZ * (1 + diskProg * 0.3);
        } else if (prog >= 0.20 && prog < 0.52) {
          // Features Section: pull particles into discrete stream bands on the side
          const featProg = (prog - 0.20) / 0.32;
          targetX = curX * 0.8 - 3 * featProg; // Push coordinates Left as user looks at features on the right
          targetY = curY * 1.2;
        } else if (prog >= 0.52) {
          // Deploy card / terminal / pricing: compress into a tight spinning coordinate ring
          const deployProg = Math.min((prog - 0.52) / 0.33, 1.0);
          const theta = Math.atan2(curY, curX) + elapsedTime * 1.25;
          const r = 2.2 + Math.sin(elapsedTime * 6 + i) * 0.1;
          
          const startX = curX * 0.8 - 3.0; // from end of features
          const startY = curY * 1.2;
          const startZ = curZ;

          targetX = (startX * (1 - deployProg)) + (r * Math.cos(theta) * deployProg);
          targetY = (startY * (1 - deployProg)) + (r * Math.sin(theta) * deployProg);
          targetZ = (startZ * (1 - deployProg));
        }

        particlePosAttr.setX(i, targetX);
        particlePosAttr.setY(i, targetY);
        particlePosAttr.setZ(i, targetZ);
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // ROTATE ALL GROUP COMPONENTS
      worldGroup.rotation.y = elapsedTime * 0.04 + state.mouseX * 0.15;
      worldGroup.rotation.x = elapsedTime * 0.02 + state.mouseY * 0.15;

      // Add a dynamic interactive 3D spin and wobble to the outer circle so its orbit is incredibly vivid
      ringMesh.rotation.x = Math.PI / 3 + Math.sin(elapsedTime * 0.8) * 0.08;
      ringMesh.rotation.y = Math.cos(elapsedTime * 0.5) * 0.08;
      ringMesh.rotation.z = -elapsedTime * 0.4;

      // Float the satellite markers perfectly along the tilted scan ring circumference
      satMeshes.forEach((mesh, index) => {
        const offset = (index / satCount) * Math.PI * 2;
        const angle = -elapsedTime * 0.65 + offset;
        const radius = 2.315; // aligns with the orbit ring's geometry

        const rx = radius * Math.cos(angle);
        const ry = radius * Math.sin(angle);

        // Map relative circle coordinates into 3D using the ring's current tilt orientations
        const pt = new THREE.Vector3(rx, ry, 0);
        pt.applyEuler(ringMesh.rotation);

        mesh.position.copy(pt);
        mesh.rotation.x = elapsedTime * 2;
        mesh.rotation.y = elapsedTime * 1.5;
      });

      // Sync satellite colors globally with the core theme transition
      satMaterial.color.copy(coreMaterial.color);

      // CAMERA AND WORLD-GROUP POSITIONING DYNAMICS ON SCROLL
      const prog = state.scrollProgress;
      
      // Interpolate core scales and colors in line with sections
      if (prog < 0.20) {
        // Hero Section: Large centered
        worldGroup.position.x = 0;
        worldGroup.position.y = 0.2;
        worldGroup.scale.setScalar(1 + (0.20 - prog) * 0.3);
        coreMaterial.color.setHex(0xe74c3c); // Red
        particleMaterial.color.setHex(0xffffff);
      } else if (prog >= 0.20 && prog < 0.52) {
        // Features Section: Scale down slightly and push to the LEFT to frame the grid
        const rangeProg = (prog - 0.20) / 0.32;
        worldGroup.position.x = -2.4 * rangeProg;
        worldGroup.position.y = -0.5 * rangeProg;
        worldGroup.scale.setScalar(0.85);
        
        // Morph color to highly technical electric ice-blue/cyan
        coreMaterial.color.lerpColors(
          new THREE.Color(0xe74c3c), // Red
          new THREE.Color(0x3498db), // Blue
          rangeProg
        );
        particleMaterial.color.lerpColors(
          new THREE.Color(0xffffff), 
          new THREE.Color(0x9b59b6), // Purple nodes
          rangeProg
        );
      } else {
        // Pricing card / Footer: Stay beautifully visible on the left/center rather than right side
        // Because the pricing list/calculator is on the right, keeping it on the left ensures it's fully visible!
        const ftProg = Math.min((prog - 0.52) / 0.33, 1.0);
        
        // Move from left (-2.4) slightly towards center-left (-1.2) rather than far right (+1.6)
        worldGroup.position.x = -2.4 + (1.2 * ftProg); 
        worldGroup.position.y = -0.5 + (0.7 * ftProg);
        worldGroup.scale.setScalar(0.85 + (ftProg * 0.3)); // Make it larger and more majestic!
        
        coreMaterial.color.lerpColors(
          new THREE.Color(0x3498db),
          new THREE.Color(0xe74c3c), // Return to fiery red/crimson
          ftProg
        );
      }

      renderer.render(scene, camera);
    };

    animate();

    // 8. LIFECYCLE DESTRUCTION CLEANUP
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();
      cancelAnimationFrame(animId);

      // Recursive asset disposal
      coreGeometry.dispose();
      coreMaterial.dispose();
      innerGeometry.dispose();
      innerMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      satGeometry.dispose();
      satMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      particleTexture.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-10 transition-opacity duration-700 select-none overflow-hidden"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
