import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Check, Shield } from "lucide-react";
import { gsap } from "gsap";
import ThreeCanvas from "../components/ThreeCanvas";

/* ── Noise Grain Overlay ── */
function Grain() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: "128px 128px",
      }}
    />
  );
}

/* ── Particle Grid Background ── */
function ParticleGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    const spacing = 50;
    const points: { x: number; y: number; baseX: number; baseY: number }[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      points.length = 0;
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          points.push({ x, y, baseX: x, baseY: y });
        }
      }
    }

    function draw() {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of points) {
        const dx = mx - p.baseX;
        const dy = my - p.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 180;

        if (dist < maxDist) {
          const force = (1 - dist / maxDist) * 12;
          p.x = p.baseX - (dx / dist) * force;
          p.y = p.baseY - (dy / dist) * force;
        } else {
          p.x += (p.baseX - p.x) * 0.1;
          p.y += (p.baseY - p.y) * 0.1;
        }

        const alpha = dist < maxDist ? 0.12 + (1 - dist / maxDist) * 0.2 : 0.03;
        const size = dist < maxDist ? 1.2 + (1 - dist / maxDist) * 0.8 : 0.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(231, 76, 60, ${alpha})`;
        ctx.fill();
      }

      // Draw light connections between adjacent particle coordinates
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < spacing * 1.4) {
            const mdx = mx - (points[i].x + points[j].x) / 2;
            const mdy = my - (points[i].y + points[j].y) / 2;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            const alpha = mDist < 180 ? 0.06 + (1 - mDist / 180) * 0.09 : 0.012;
            ctx.beginPath();
            ctx.moveTo(points[i].x, points[i].y);
            ctx.lineTo(points[j].x, points[j].y);
            ctx.strokeStyle = `rgba(231, 76, 60, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    animId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize, { passive: true });

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouse, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-60" />;
}

/* ── Interactive 3D Perspective feature card with glow and border tracking ── */
interface FeatureCardProps {
  title: string;
  desc: string;
  index: number;
  pro?: boolean;
}

function FeatureCard({ title, desc, index, pro = false }: FeatureCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 0, y: 0, active: false });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Awwwards perspective computation (limits tilt to 12 degrees to keep copy readable)
    const rx = ((y / rect.height) - 0.5) * -12;
    const ry = ((x / rect.width) - 0.5) * 12;

    setRotation({ x: rx, y: ry });
    setGlow({ x, y, active: true });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setRotation({ x: 0, y: 0 });
    setGlow((g) => ({ ...g, active: false }));
  }, []);

  const cardCodeName = title.replace(/\s+/g, "_").toUpperCase();

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative group bg-zinc-950/[0.06] backdrop-blur-sm border border-white/[0.03] hover:border-red-500/20 rounded-2xl p-7 overflow-hidden cursor-crosshair transform-gpu"
      style={{
        transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1.02, 1.02, 1.02)`,
        boxShadow: glow.active
          ? "0 25px 50px -12px rgba(231, 76, 60, 0.12)"
          : "rgba(0,0,0,0) 0px 0px 0px",
        transition: "transform 0.15s ease-out, border-color 0.3s ease, box-shadow 0.3s ease",
      }}
    >
      {/* Laser interactive follow glow */}
      <div
        className="absolute w-72 h-72 rounded-full pointer-events-none transition-opacity duration-300 pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(231, 76, 60, 0.08) 0%, transparent 70%)",
          left: glow.x - 144,
          top: glow.y - 144,
          opacity: glow.active ? 1 : 0,
        }}
      />

      {/* Decorative double background tech vector lines */}
      <div className="absolute top-0 left-0 w-3 md:w-4 h-[1px] bg-red-500/40" />
      <div className="absolute top-0 left-0 h-3 md:h-4 w-[1px] bg-red-500/40" />
      <div className="absolute bottom-0 right-0 w-3 md:w-4 h-[1px] bg-white/10" />
      <div className="absolute bottom-0 right-0 h-3 md:h-4 w-[1px] bg-white/10" />

      {/* Dynamic tech indicator index */}
      <div className="absolute top-3 right-4 font-mono text-[8px] text-zinc-600 select-none tracking-widest uppercase opacity-40 group-hover:opacity-100 group-hover:text-red-400 transition-all">
        CORE::{cardCodeName}
      </div>

      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
            [SYS-{String(index + 1).padStart(2, "0")}]
          </span>
          {pro && (
            <span className="text-[8px] font-mono text-amber-400/80 bg-amber-400/[0.06] border border-amber-400/15 px-2 py-0.5 rounded-full tracking-wider">
              ENTERPRISE_PRO
            </span>
          )}
        </div>
        <h3 className="text-base font-bold mb-3 tracking-tight group-hover:text-red-400 transition-colors">
          {title}
        </h3>
        <p className="text-[13px] text-zinc-500 leading-relaxed font-light">
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ── Horizontal Scroll Section representing Processes ── */
interface ProcessStepProps {
  num: string;
  title: string;
  desc: string;
}

function ProcessStep({ num, title, desc }: ProcessStepProps) {
  return (
    <div className="w-full group/step">
      <div className="relative p-7 bg-zinc-950/[0.04] backdrop-blur-sm border border-white/[0.03] hover:border-red-500/20 rounded-2xl transition-all duration-300 min-h-[180px]">
        {/* Glow effect on hover */}
        <div className="absolute top-0 left-0 w-4 h-[1px] bg-red-400/40 opacity-0 group-hover/step:opacity-100 transition-opacity" />
        <div className="absolute top-0 left-0 h-4 w-[1px] bg-red-400/40 opacity-0 group-hover/step:opacity-100 transition-opacity" />
        
        <span className="font-mono text-5xl md:text-6xl font-black bg-gradient-to-r from-red-600 via-red-500 to-orange-500 bg-clip-text text-transparent opacity-85 group-hover/step:opacity-100 group-hover/step:scale-105 transition-all duration-500 select-none block mb-4 origin-left">
          {num}
        </span>
        
        <div>
          <h3 className="text-[14px] font-bold tracking-tight mb-1.5 font-mono text-zinc-300 group-hover/step:text-red-400 transition-colors duration-300">
            {title}
          </h3>
          <p className="text-[12px] text-zinc-500 leading-relaxed font-light">
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Magnetic interactive Button for Awwwards clicks ── */
interface MagneticButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  href?: string;
}

function MagneticButton({ children, onClick, className = "", href }: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.28;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.28;
    setOffset({ x, y });
  }, []);

  const handleLeave = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  const style = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    transition: offset.x === 0 ? "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)" : "transform 0.1s ease-out",
  };

  if (href) {
    return (
      <a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        target="_blank"
        rel="noreferrer"
        className={className}
        style={style}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      onClick={onClick}
      className={className}
      style={style}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </button>
  );
}

/* ── Animated stats Counter ── */
interface CounterProps {
  value: number;
  suffix?: string;
}

function Counter({ value, suffix = "" }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setStarted(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const duration = 1200;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [started, value]);

  return (
    <span ref={ref} className="font-mono tabular-nums">
      {count}
      {suffix}
    </span>
  );
}

/* ── Scroll intersection reveal container ── */
interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0, 0, 0)" : "translate3d(0, 36px, 0)",
        transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Interactive Ghost Vector Logo ── */
function AnimatedGhost({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path
        d="M32 4C18.745 4 8 14.745 8 28v20c0 2 1 4 3 4s3-2 4-4 2-4 4-4 3 2 4 4 1 4 3 4 3-2 4-4 2-4 4-4 3 2 4 4 1 4 3 4 3-2 3-4V28C56 14.745 45.255 4 32 4z"
        fill="currentColor"
        className="animate-[ghostFloat_3s_ease-in-out_infinite]"
      />
      <circle cx="24" cy="26" r="4" fill="#040406" />
      <circle cx="40" cy="26" r="4" fill="#040406" />
      <circle
        cx="25"
        cy="25"
        r="1.5"
        fill="white"
        fillOpacity="0.9"
        className="animate-[blink_4s_ease-in-out_infinite]"
      />
      <circle
        cx="41"
        cy="25"
        r="1.5"
        fill="white"
        fillOpacity="0.9"
        className="animate-[blink_4s_ease-in-out_infinite_0.1s]"
      />
    </svg>
  );
}

/* ── Landing page static specifications lists ── */
const STATS = [
  { label: "Active Attack Vectors", value: 14, suffix: "+" },
  { label: "Target Drills Automated", value: 8500, suffix: "+" },
  { label: "Platform SLA Uptime", value: 99, suffix: ".99%" },
  { label: "Dedicated Secure Clusters", value: 10, suffix: "+" },
];

const FEATURES = [
  {
    title: "Email Phishing",
    desc: "AI-generated phishing with credential harvesting, business email compromise, and spear phishing. Each email includes identifiable red flags calibrated to difficulty.",
    pro: false,
  },
  {
    title: "QR Code Attacks",
    desc: "Generate tracked QR codes with printable poster templates. WiFi, survey, and event pretexts. Physical security testing made simple.",
    pro: false,
  },
  {
    title: "Credential Harvesting",
    desc: "Fake login pages mimicking Microsoft, Google, and Okta SSO. Logs form submissions without storing actual credentials.",
    pro: true,
  },
  {
    title: "Pretexting Scripts",
    desc: "Social engineering scenarios for tabletop exercises. IT support calls, vendor infiltration, account verification — complete with scoring rubrics.",
    pro: true,
  },
  {
    title: "Tracking Engine",
    desc: "Every interaction logged: email opens, link clicks, credential submissions, and reports. Per-user security scores with trend analysis.",
    pro: false,
  },
  {
    title: "Interactive Training",
    desc: "When a target falls for a simulation, they see an interactive breakdown of every red flag they missed and the tactics used against them.",
    pro: false,
  },
];

const PROCESS = [
  {
    num: "01",
    title: "Configure Campaign",
    desc: "Select vectors, target groups, and difficulty settings.",
  },
  {
    num: "02",
    title: "AI Generates Content",
    desc: "LLM crafts personalized, realistic attack content.",
  },
  {
    num: "03",
    title: "Track Everything",
    desc: "Clicks, opens, submissions — all logged in real time.",
  },
  {
    num: "04",
    title: "Train & Improve",
    desc: "Interactive red flag breakdown after every interaction.",
  },
];

/* ══════════════════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handle = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handle, { passive: true });

    // GSAP LOAD STAGGER TIMELINES (Awwwards Entrance)
    gsap.fromTo(
      ".gsap-nav-item",
      { y: -15, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        stagger: 0.08,
        ease: "power2.out",
        delay: 0.15,
      }
    );

    gsap.fromTo(
      ".gsap-hero-title",
      { y: 35, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.1,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.3,
      }
    );

    gsap.fromTo(
      ".gsap-hero-sub",
      { y: 25, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power2.out",
        delay: 0.75,
      }
    );

    gsap.fromTo(
      ".gsap-hero-btn",
      { scale: 0.95, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: "back.out(1.7)",
        delay: 0.95,
      }
    );

    return () => {
      window.removeEventListener("scroll", handle);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#040406] text-zinc-100 overflow-x-hidden relative selection:bg-red-500/20 selection:text-white">
      {/* ── BACKGROUND 1: GRAIN OVERLAY ── */}
      <Grain />

      {/* ── BACKGROUND 2: FLAT MULTI-PARALLAX COORDINATE GRID ── */}
      <ParticleGrid />

      {/* ── BACKGROUND 3: INTERACTIVE 3D HOLOGRAPHIC CYBER-CORE SCENE ── */}
      <ThreeCanvas />

      <style>{`
        @keyframes ghostFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes blink {
          0%, 90%, 100% { opacity: 0.9; }
          95% { opacity: 0; }
        }
      `}</style>

      {/* ── NAVIGATION BAR ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrollY > 60 ? "rgba(4, 4, 6, 0.88)" : "transparent",
          backdropFilter: scrollY > 60 ? "blur(32px) saturate(1.15)" : "none",
          borderBottom:
            scrollY > 60 ? "1px solid rgba(255, 255, 255, 0.03)" : "1px solid transparent",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 gsap-nav-item">
            <AnimatedGhost className="w-5 h-5 text-red-500" />
            <span className="text-[12px] font-bold tracking-[0.25em] font-mono text-zinc-200">
              SPECTER
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-9">
            {["Features", "Process", "Pricing"].map((s) => (
              <a
                key={s}
                href={`#${s.toLowerCase()}`}
                className="text-[11px] text-zinc-500 hover:text-white tracking-[0.16em] uppercase font-semibold transition-all duration-300 gsap-nav-item hover:-translate-y-0.5"
              >
                {s}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4 gsap-nav-item">
            <button
              onClick={() => navigate("/login")}
              className="text-[11px] text-zinc-500 hover:text-white tracking-widest uppercase font-mono font-medium transition-colors"
            >
              Log in
            </button>
            <MagneticButton
              onClick={() => navigate("/login")}
              className="text-[11px] bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-full tracking-widest font-semibold uppercase transition-colors shadow-lg shadow-red-600/10"
            >
              Get Started
            </MagneticButton>
          </div>
        </div>
      </nav>

      {/* ── HERO SPLASH SECTION ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16">
        <div className="text-center max-w-4xl mx-auto z-10">
          {/* Bold Header Pairings */}
          <h1 className="text-6xl md:text-8xl lg:text-[7.5rem] font-bold tracking-[-0.05em] leading-[0.92] mb-8 select-none">
            <span className="block text-zinc-100 font-sans gsap-hero-title">
              Train your team
            </span>
            <span className="block bg-gradient-to-r from-red-600 via-red-400 to-orange-400 bg-clip-text text-transparent gsap-hero-title font-sans">
              before attackers do.
            </span>
          </h1>

          {/* Subtext description */}
          <p className="text-[14px] md:text-base text-zinc-500 leading-relaxed max-w-xl mx-auto mb-12 font-light gsap-hero-sub">
            The advanced adversary simulation platform featuring hyper-realistic AI-personalized phishing cyber-drills, robust multi-vector audits, and automated employee resilience metrics.
          </p>

          {/* Action trigger hooks */}
          <div className="flex flex-wrap items-center justify-center gap-4 gsap-hero-btn">
            <MagneticButton
              onClick={() => navigate("/login")}
              className="group flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-zinc-100 transition-colors"
            >
              Enter Client Console
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-black" />
            </MagneticButton>
            
            <MagneticButton
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 border border-white/[0.06] hover:border-white/[0.12] bg-zinc-950/30 text-zinc-400 hover:text-white px-8 py-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
            >
              Request Live Demo
            </MagneticButton>
          </div>
        </div>

        {/* Scroll helper */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-30 select-none">
          <ChevronDown className="w-5 h-5 text-zinc-500" />
        </div>
      </section>

      {/* ── INTERACTIVE STATS CORNER LINE ── */}
      <section className="relative z-10 border-y border-white/[0.03] bg-[#060608]/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={0.06 * i} className="text-center">
              <p className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1 font-mono text-zinc-200">
                <Counter value={s.value} suffix={s.suffix} />
              </p>
              <p className="text-[9px] text-zinc-600 font-mono tracking-[0.25em] uppercase font-semibold">
                {s.label}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FEATURES SECTION (GRID BOXES REDESIGN) ── */}
      <section id="features" className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-24">
              <p className="text-[10px] font-mono text-red-500/70 tracking-[0.35em] uppercase font-bold mb-4">
                SYSTEM FEATURES // ATTACK SURFACE
              </p>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white font-sans max-w-xl mx-auto leading-none">
                Every adversary vector. One dashboard.
              </h2>
              <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent mx-auto mt-6" />
            </div>
          </Reveal>

          {/* Glass 3D Responsive Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} title={f.title} desc={f.desc} index={i} pro={f.pro} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS TIMELINE ── */}
      <section id="process" className="relative z-10 py-32 px-6 border-t border-white/[0.03]">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="mb-20">
              <p className="text-[10px] font-mono text-red-500/70 tracking-[0.35em] uppercase font-bold mb-4">
                WORKFLOW SYSTEM // PROCEDURAL DECK
              </p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white leading-none">
                Four simple steps to human organizational resilience.
              </h2>
              <div className="w-16 h-[1px] bg-gradient-to-r from-red-500/50 to-transparent mt-6" />
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROCESS.map((s, i) => (
              <Reveal key={s.num} delay={0.08 * i}>
                <ProcessStep {...s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE PRICING SECTION ── */}
      <section id="pricing" className="relative z-10 py-32 px-6 border-t border-white/[0.03]">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="relative bg-zinc-950/[0.03] border border-white/[0.03] rounded-3xl p-8 md:p-16 overflow-hidden backdrop-blur-md shadow-2xl">
              <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-600/[0.03] rounded-full blur-[130px] pointer-events-none" />
              <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/[0.02] rounded-full blur-[130px] pointer-events-none" />

              <div className="grid lg:grid-cols-12 gap-12 items-center">
                <div className="lg:col-span-5 space-y-6">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-mono text-emerald-400 bg-emerald-400/5 border border-emerald-400/15 rounded-full uppercase tracking-wider">
                    <Shield className="w-2.5 h-2.5" /> High-Value Enterprise Node
                  </span>
                  <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-none">
                    Scale cybersecurity drills on your terms.
                  </h2>
                  <p className="text-zinc-400 text-sm leading-relaxed font-light">
                    Specter is a fully responsive private cloud environment engineered to protect high-impact organizations. Calculate a customized flexible license tier according to your simulated threat scope.
                  </p>
                  
                  <div className="space-y-3.5 pt-4">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <p className="text-xs text-zinc-300">Dedicated outbound simulated mail servers</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <p className="text-xs text-zinc-300">AI dynamic phishing payload generator</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <p className="text-xs text-zinc-300">Advanced cellular gateway sms target tests</p>
                    </div>
                  </div>
                </div>

                {/* Live Sandbox Calculator widget */}
                <div className="lg:col-span-7">
                  <div className="bg-zinc-950/[0.05] border border-white/[0.03] rounded-2xl p-6 md:p-8 shadow-2xl relative backdrop-blur-sm">
                    <div className="absolute top-4 right-4 z-10">
                      <span className="text-[8px] font-mono bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded uppercase font-bold">
                        SaaS ESTIMATOR
                      </span>
                    </div>

                    <h3 className="text-base font-bold font-mono tracking-tight text-zinc-200 mb-6 uppercase">
                      Interactive License Calculator
                    </h3>

                    {/* Simple state pricing calculator */}
                    <PricingWidget navigate={navigate} />
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER MARKER ── */}
      <footer className="relative z-10 border-t border-white/[0.03] py-12 px-6 bg-[#040406]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 text-[11px] text-zinc-600 font-mono">
            <AnimatedGhost className="w-4 h-4 text-zinc-800" />
            <span>SPECTER &middot; PROPRIETARY SAAS &middot; SECURE SYSTEM 2026</span>
          </div>
          <div className="flex items-center gap-6 text-[11.5px] font-mono text-zinc-500">
            <span className="hover:text-red-400 transition-colors uppercase tracking-widest text-[9.5px] cursor-pointer">
              PRIVACY POLICY
            </span>
            <span className="hover:text-red-400 transition-colors uppercase tracking-widest text-[9.5px] cursor-pointer">
              TERMS OF SERVICE
            </span>
            <span className="hover:text-red-400 transition-colors uppercase tracking-widest text-[9.5px] cursor-pointer">
              SLA GUARANTEES
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Inline State Pricing Widget ── */
function PricingWidget({ navigate }: { navigate: (p: string) => void }) {
  const [seats, setSeats] = useState(150);
  const [dedicatedMail, setDedicatedMail] = useState(true);
  const [smsSimulation, setSmsSimulation] = useState(false);

  // Extremely friendly starting points
  const getBaseRate = (val: number) => {
    if (val < 100) return 0.15;
    if (val < 500) return 0.10;
    if (val < 1500) return 0.08;
    return 0.06;
  };

  const baseRate = getBaseRate(seats);
  const addonsCost = (dedicatedMail ? 9 : 0) + (smsSimulation ? 5 : 0);
  const monthlyTotal = Math.round(seats * baseRate + addonsCost);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-baseline mb-2 font-mono">
          <span className="text-xs text-zinc-500 uppercase">Target Seats (Employees)</span>
          <span className="text-lg font-bold text-white font-mono">{seats} Seats</span>
        </div>
        <input
          type="range"
          min="25"
          max="2000"
          step="25"
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          className="w-full h-1.5 bg-zinc-950/50 border border-white/[0.03] rounded-lg appearance-none cursor-pointer accent-red-500 focus:outline-none"
        />
        <div className="flex justify-between text-[9px] text-zinc-600 font-mono mt-1">
          <span>25 SEATS</span>
          <span>1,000 SEATS</span>
          <span>2,000 SEATS</span>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <label className="flex items-center justify-between p-3.5 bg-zinc-950/[0.04] backdrop-blur-sm border border-white/[0.03] hover:border-white/[0.08] hover:bg-zinc-950/[0.08] rounded-xl cursor-pointer transition-all duration-300">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={dedicatedMail}
              onChange={(e) => setDedicatedMail(e.target.checked)}
              className="rounded accent-red-500 border-white/[0.06] bg-zinc-950/40"
            />
            <div>
              <p className="text-xs font-semibold text-zinc-300">Dedicated Mail Relay Server</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Ensures pristine SPF/DKIM authentication loops</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">+$9/mo</span>
        </label>

        <label className="flex items-center justify-between p-3.5 bg-zinc-950/[0.04] backdrop-blur-sm border border-white/[0.03] hover:border-white/[0.08] hover:bg-zinc-950/[0.08] rounded-xl cursor-pointer transition-all duration-300">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={smsSimulation}
              onChange={(e) => setSmsSimulation(e.target.checked)}
              className="rounded accent-red-500 border-white/[0.06] bg-zinc-950/40"
            />
            <div>
              <p className="text-xs font-semibold text-zinc-300">Advanced SMS Smishing Support</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Access direct cellular gateway target tests</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">+$5/mo</span>
        </label>
      </div>

      <div className="border-t border-white/[0.03] pt-5 mt-4 flex items-center justify-between">
        <div>
          <span className="text-[9px] text-zinc-500 font-mono tracking-wider block uppercase">ESTIMATED INVESTMENT</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-3xl font-bold text-red-500 font-mono tracking-tight">${monthlyTotal}</span>
            <span className="text-xs text-zinc-600 font-mono">/ Month</span>
          </div>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl shadow-lg shadow-red-600/10 transition-colors"
        >
          Activate Trial Node
        </button>
      </div>
    </div>
  );
}
