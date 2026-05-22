import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Github, ArrowRight, ChevronDown } from "lucide-react";

/* ── Noise Grain Overlay ── */
function Grain() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[100] opacity-[0.035]"
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    const spacing = 40;
    const points: { x: number; y: number; baseX: number; baseY: number }[] = [];

    function resize() {
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of points) {
        const dx = mx - p.baseX;
        const dy = my - p.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 150;

        if (dist < maxDist) {
          const force = (1 - dist / maxDist) * 15;
          p.x = p.baseX - (dx / dist) * force;
          p.y = p.baseY - (dy / dist) * force;
        } else {
          p.x += (p.baseX - p.x) * 0.1;
          p.y += (p.baseY - p.y) * 0.1;
        }

        const alpha = dist < maxDist ? 0.15 + (1 - dist / maxDist) * 0.3 : 0.04;
        const size = dist < maxDist ? 1.5 + (1 - dist / maxDist) * 1 : 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(231, 76, 60, ${alpha})`;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < spacing * 1.5) {
            const mdx = mx - (points[i].x + points[j].x) / 2;
            const mdy = my - (points[i].y + points[j].y) / 2;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            const alpha = mDist < 150 ? 0.08 + (1 - mDist / 150) * 0.12 : 0.015;
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
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouse);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

/* ── Text Reveal Animation ── */
function TextReveal({ children, delay = 0, className = "" }: { children: string; delay?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.unobserve(el); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {children.split("").map((char, i) => (
        <span
          key={i}
          className="inline-block"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0) rotateX(0)" : "translateY(40px) rotateX(-90deg)",
            transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay + i * 0.025}s`,
            transformOrigin: "bottom",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

/* ── Magnetic Button ── */
function MagneticButton({ children, onClick, className = "", href }: { children: React.ReactNode; onClick?: () => void; className?: string; href?: string }) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.3;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
    setOffset({ x, y });
  }, []);

  const handleLeave = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  const style = {
    transform: `translate(${offset.x}px, ${offset.y}px)`,
    transition: offset.x === 0 ? "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)" : "transform 0.15s ease-out",
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

/* ── Animated Counter ── */
function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); obs.unobserve(el); }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const duration = 1500;
    const steps = 40;
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

  return <span ref={ref} className="font-mono tabular-nums">{count}{suffix}</span>;
}

/* ── Scroll Reveal ── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.unobserve(el); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(48px)",
        transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Animated Ghost Logo ── */
function AnimatedGhost({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path
        d="M32 4C18.745 4 8 14.745 8 28v20c0 2 1 4 3 4s3-2 4-4 2-4 4-4 3 2 4 4 1 4 3 4 3-2 4-4 2-4 4-4 3 2 4 4 1 4 3 4 3-2 3-4V28C56 14.745 45.255 4 32 4z"
        fill="currentColor"
        className="animate-[ghostFloat_3s_ease-in-out_infinite]"
      />
      <circle cx="24" cy="26" r="4" fill="#0a0a0a" />
      <circle cx="40" cy="26" r="4" fill="#0a0a0a" />
      <circle cx="25" cy="25" r="1.5" fill="white" fillOpacity="0.9" className="animate-[blink_4s_ease-in-out_infinite]" />
      <circle cx="41" cy="25" r="1.5" fill="white" fillOpacity="0.9" className="animate-[blink_4s_ease-in-out_infinite_0.1s]" />
    </svg>
  );
}

/* ── Feature Card with Glow ── */
function FeatureCard({ title, desc, index, pro = false }: { title: string; desc: string; index: number; pro?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [glow, setGlow] = useState({ x: 0, y: 0, active: false });

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setGlow({ x: e.clientX - rect.left, y: e.clientY - rect.top, active: true });
  }, []);

  return (
    <Reveal delay={0.05 * index}>
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={() => setGlow(g => ({ ...g, active: false }))}
        className="relative group h-full bg-[#0a0a0e] border border-white/[0.04] rounded-2xl p-7 overflow-hidden transition-all duration-500 hover:border-white/[0.08]"
      >
        {/* Glow follow cursor */}
        <div
          className="absolute w-64 h-64 rounded-full pointer-events-none transition-opacity duration-300"
          style={{
            background: "radial-gradient(circle, rgba(231,76,60,0.06) 0%, transparent 70%)",
            left: glow.x - 128,
            top: glow.y - 128,
            opacity: glow.active ? 1 : 0,
          }}
        />

        <div className="relative">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[11px] font-mono text-zinc-600 tracking-wider">
              {String(index + 1).padStart(2, "0")}
            </span>
            {pro && (
              <span className="text-[9px] font-mono text-amber-400/80 bg-amber-400/[0.06] border border-amber-400/10 px-2 py-0.5 rounded-full tracking-wider">
                PRO
              </span>
            )}
          </div>
          <h3 className="text-[15px] font-semibold mb-2.5 tracking-tight">{title}</h3>
          <p className="text-[13px] text-zinc-500 leading-relaxed">{desc}</p>
        </div>
      </div>
    </Reveal>
  );
}

/* ── Horizontal Scroll Section ── */
function ProcessStep({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex-shrink-0 w-72 md:w-80">
      <div className="relative">
        <span className="text-[80px] font-bold text-white/[0.02] font-mono leading-none select-none">{num}</span>
        <div className="absolute bottom-0 left-0">
          <h3 className="text-base font-semibold mb-1.5">{title}</h3>
          <p className="text-[13px] text-zinc-500 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Stats Bar ── */
const STATS = [
  { label: "Attack Vectors", value: 5, suffix: "" },
  { label: "Lines of Code", value: 4200, suffix: "+" },
  { label: "Test Coverage", value: 25, suffix: "+" },
  { label: "Docker Ready", value: 1, suffix: " cmd" },
];

const FEATURES = [
  { title: "Email Phishing", desc: "AI-generated phishing with credential harvesting, business email compromise, and spear phishing. Each email includes identifiable red flags calibrated to difficulty.", pro: false },
  { title: "QR Code Attacks", desc: "Generate tracked QR codes with printable poster templates. WiFi, survey, and event pretexts. Physical security testing made simple.", pro: false },
  { title: "Credential Harvesting", desc: "Fake login pages mimicking Microsoft, Google, and Okta SSO. Logs form submissions without storing actual credentials.", pro: true },
  { title: "Pretexting Scripts", desc: "Social engineering scenarios for tabletop exercises. IT support calls, vendor infiltration, account verification — complete with scoring rubrics.", pro: true },
  { title: "Tracking Engine", desc: "Every interaction logged: email opens, link clicks, credential submissions, and reports. Per-user security scores with trend analysis.", pro: false },
  { title: "Interactive Training", desc: "When a target falls for a simulation, they see an interactive breakdown of every red flag they missed and the tactics used against them.", pro: false },
];

const PROCESS = [
  { num: "01", title: "Configure Campaign", desc: "Select vectors, target groups, and difficulty settings." },
  { num: "02", title: "AI Generates Content", desc: "LLM crafts personalized, realistic attack content." },
  { num: "03", title: "Track Everything", desc: "Clicks, opens, submissions — all logged in real time." },
  { num: "04", title: "Train & Improve", desc: "Interactive red flag breakdown after every interaction." },
];

/* ══════════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
    const handle = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <div className="min-h-screen bg-[#040406] text-zinc-100 overflow-x-hidden selection:bg-red-500/20">
      <Grain />
      <ParticleGrid />

      <style>{`
        @keyframes ghostFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes blink {
          0%, 90%, 100% { opacity: 0.9; }
          95% { opacity: 0; }
        }
        @keyframes lineGrow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrollY > 80 ? "rgba(4,4,6,0.85)" : "transparent",
          backdropFilter: scrollY > 80 ? "blur(24px) saturate(1.2)" : "none",
          borderBottom: scrollY > 80 ? "1px solid rgba(255,255,255,0.03)" : "1px solid transparent",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AnimatedGhost className="w-6 h-6 text-red-500" />
            <span className="text-sm font-bold tracking-[0.2em] font-mono">SPECTER</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {["Features", "Process", "Deploy"].map((s) => (
              <a
                key={s}
                href={`#${s.toLowerCase()}`}
                className="text-[12px] text-zinc-500 hover:text-white tracking-widest uppercase transition-colors duration-300"
              >
                {s}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="text-[12px] text-zinc-500 hover:text-white tracking-wider transition-colors">
              Log in
            </button>
            <MagneticButton
              onClick={() => navigate("/login")}
              className="text-[12px] bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-full tracking-wider font-medium transition-colors"
            >
              Get Started
            </MagneticButton>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
        <div
          className="text-center max-w-4xl mx-auto"
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 1s ease 0.3s" }}
        >
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2.5 border border-white/[0.06] rounded-full px-4 py-1.5 mb-10"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-zinc-500 font-mono tracking-wider">Open source &middot; Self-hostable &middot; Free tier</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-[-0.04em] leading-[0.95] mb-8">
            <TextReveal delay={0.6} className="block text-zinc-100">Train your team</TextReveal>
            <TextReveal delay={0.9} className="block bg-gradient-to-r from-red-500 via-red-400 to-orange-400 bg-clip-text text-transparent">before attackers do.</TextReveal>
          </h1>

          {/* Subtext */}
          <p
            className="text-base md:text-lg text-zinc-500 leading-relaxed max-w-xl mx-auto mb-12"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? "translateY(0)" : "translateY(24px)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.4s",
            }}
          >
            Adversary simulation platform with AI-generated phishing, multi-vector attacks, real-time tracking, and interactive security training.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-wrap items-center justify-center gap-4"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? "translateY(0)" : "translateY(24px)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.6s",
            }}
          >
            <MagneticButton
              onClick={() => navigate("/login")}
              className="group flex items-center gap-2.5 bg-white text-black px-7 py-3.5 rounded-full text-sm font-semibold hover:bg-zinc-100 transition-colors"
            >
              Start Simulating
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </MagneticButton>
            <MagneticButton
              href="https://github.com/lixeron/Project_Specter"
              className="flex items-center gap-2.5 border border-white/[0.08] hover:border-white/[0.15] text-zinc-400 hover:text-white px-7 py-3.5 rounded-full text-sm font-medium transition-all"
            >
              <Github className="w-4 h-4" />
              GitHub
            </MagneticButton>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-5 h-5 text-zinc-700" />
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="relative z-10 border-y border-white/[0.03] bg-[#060608]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={0.08 * i} className="text-center">
              <p className="text-3xl md:text-4xl font-bold tracking-tight mb-1">
                <Counter value={s.value} suffix={s.suffix} />
              </p>
              <p className="text-[11px] text-zinc-600 font-mono tracking-widest uppercase">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-20">
              <p className="text-[11px] font-mono text-red-400/70 tracking-[0.3em] uppercase mb-4">Attack Surface</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Every vector. One platform.
              </h2>
              <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent mx-auto mt-6" />
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} title={f.title} desc={f.desc} index={i} pro={f.pro} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Process ── */}
      <section id="process" className="relative z-10 py-32 px-6 border-t border-white/[0.03]">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="mb-20">
              <p className="text-[11px] font-mono text-red-400/70 tracking-[0.3em] uppercase mb-4">Workflow</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
                Four steps to resilience.
              </h2>
              <div className="w-12 h-[1px] bg-gradient-to-r from-red-500/50 to-transparent mt-6" />
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
            {PROCESS.map((s, i) => (
              <Reveal key={s.num} delay={0.1 * i}>
                <ProcessStep {...s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Deploy ── */}
      <section id="deploy" className="relative z-10 py-32 px-6 border-t border-white/[0.03]">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="relative bg-gradient-to-br from-white/[0.02] to-transparent border border-white/[0.04] rounded-3xl p-10 md:p-20 overflow-hidden">
              {/* Glow */}
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-red-500/[0.03] rounded-full blur-[100px]" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/[0.02] rounded-full blur-[80px]" />

              <div className="relative max-w-2xl">
                <p className="text-[11px] font-mono text-emerald-400/70 tracking-[0.3em] uppercase mb-4">Open Source</p>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
                  One command.<br />Your infrastructure.
                </h2>
                <p className="text-zinc-500 leading-relaxed mb-10 text-[15px]">
                  Your employee vulnerability data stays on your network. No vendor lock-in. No third-party cloud. Clone, deploy, simulate.
                </p>

                {/* Terminal block */}
                <div className="bg-[#0a0a0e] border border-white/[0.04] rounded-2xl overflow-hidden mb-10">
                  <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/[0.03]">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    <span className="text-[10px] text-zinc-700 font-mono ml-2">terminal</span>
                  </div>
                  <div className="p-5 font-mono text-[13px] leading-loose">
                    <div><span className="text-zinc-600">$</span> <span className="text-emerald-400">git clone</span> <span className="text-zinc-400">github.com/lixeron/Project_Specter</span></div>
                    <div><span className="text-zinc-600">$</span> <span className="text-emerald-400">docker compose up</span></div>
                    <div className="text-zinc-700 mt-1"># API on :8000 &middot; Dashboard on :3000</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <MagneticButton
                    href="https://github.com/lixeron/Project_Specter"
                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full text-sm font-semibold hover:bg-zinc-200 transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    Star on GitHub
                  </MagneticButton>
                  <MagneticButton
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 border border-white/[0.06] hover:border-white/[0.12] text-zinc-400 hover:text-white px-6 py-3 rounded-full text-sm font-medium transition-all"
                  >
                    Try Demo
                    <ArrowRight className="w-4 h-4" />
                  </MagneticButton>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.03] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[11px] text-zinc-700 font-mono">
            <AnimatedGhost className="w-3.5 h-3.5 text-zinc-800" />
            Specter &middot; Apache 2.0 &middot; 2026
          </div>
          <div className="flex items-center gap-6 text-[11px] text-zinc-700">
            <a href="https://github.com/lixeron/Project_Specter" target="_blank" rel="noreferrer" className="hover:text-zinc-400 transition-colors">GitHub</a>
            <a href="https://github.com/lixeron" target="_blank" rel="noreferrer" className="hover:text-zinc-400 transition-colors">@lixeron</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
