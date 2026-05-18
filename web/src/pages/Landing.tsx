import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Zap, QrCode, Mail, Brain, BarChart3, Lock, Terminal, ChevronRight, Github, ArrowRight } from "lucide-react";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView(0.1);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function GhostLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className}>
      <path
        d="M32 4C18.745 4 8 14.745 8 28v20c0 2 1 4 3 4s3-2 4-4 2-4 4-4 3 2 4 4 1 4 3 4 3-2 4-4 2-4 4-4 3 2 4 4 1 4 3 4 3-2 3-4V28C56 14.745 45.255 4 32 4z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <circle cx="24" cy="26" r="4" fill="#0a0a0a" />
      <circle cx="40" cy="26" r="4" fill="#0a0a0a" />
      <circle cx="25" cy="25" r="1.5" fill="white" fillOpacity="0.8" />
      <circle cx="41" cy="25" r="1.5" fill="white" fillOpacity="0.8" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: Mail,
    title: "Email Phishing",
    desc: "AI-generated phishing emails with credential harvesting, BEC, and spear phishing scenarios. Realistic enough to train, identifiable enough to teach.",
    free: true,
  },
  {
    icon: QrCode,
    title: "QR Code Attacks",
    desc: "Generate tracked QR codes with printable posters for physical security testing. WiFi, survey, and event pretexts built in.",
    free: true,
  },
  {
    icon: Lock,
    title: "Fake Login Pages",
    desc: "Credential harvesting pages mimicking Microsoft, Google, and Okta SSO portals. Logs submissions without storing passwords.",
    free: false,
  },
  {
    icon: Brain,
    title: "Pretexting Scripts",
    desc: "AI-powered social engineering scenarios for tabletop exercises. IT support calls, vendor visits, and account verification scripts with scoring rubrics.",
    free: false,
  },
  {
    icon: BarChart3,
    title: "Analytics & Tracking",
    desc: "Track every interaction: email opens, link clicks, credential submissions, and reports. Per-user security scores with improvement trends.",
    free: true,
  },
  {
    icon: Terminal,
    title: "CLI + API First",
    desc: "Full CLI tool and REST API. Automate campaigns, integrate with your stack, or manage everything from the terminal.",
    free: true,
  },
];

const STEPS = [
  { num: "01", title: "Create a Campaign", desc: "Pick your attack vectors, select target groups, and configure difficulty." },
  { num: "02", title: "AI Generates Attacks", desc: "The LLM crafts realistic, personalized phishing content with identifiable red flags." },
  { num: "03", title: "Track Interactions", desc: "Monitor who clicked, who reported, and who submitted credentials — all in real time." },
  { num: "04", title: "Train & Improve", desc: "Targets see an interactive training page breaking down every red flag they missed." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handle = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <div className="min-h-screen bg-[#06060a] text-zinc-100 overflow-x-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #e74c3c 0%, transparent 70%)", transform: `translateY(${scrollY * 0.1}px)` }}
        />
        <div
          className="absolute top-[30%] right-[-15%] w-[800px] h-[800px] rounded-full opacity-[0.02]"
          style={{ background: "radial-gradient(circle, #3498db 0%, transparent 70%)", transform: `translateY(${scrollY * -0.05}px)` }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjAuNSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIvPjwvc3ZnPg==')] opacity-50" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04]" style={{ background: scrollY > 50 ? "rgba(6,6,10,0.9)" : "transparent", backdropFilter: scrollY > 50 ? "blur(20px)" : "none", transition: "all 0.3s" }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GhostLogo className="w-7 h-7 text-red-500" />
            <span className="text-lg font-bold tracking-tight font-mono">SPECTER</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#open-source" className="hover:text-white transition-colors">Open Source</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5">
              Log in
            </button>
            <button onClick={() => navigate("/login")} className="text-sm bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors font-medium">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-full px-4 py-1.5 mb-8">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-zinc-400 font-mono">Open source &middot; Self-hostable &middot; Free tier available</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
                Train your team<br />
                <span className="bg-gradient-to-r from-red-500 via-red-400 to-orange-400 bg-clip-text text-transparent">before attackers do.</span>
              </h1>
              <p className="text-lg md:text-xl text-zinc-400 leading-relaxed max-w-2xl mb-10">
                Specter is an adversary simulation platform that generates AI-powered phishing attacks, tracks employee responses, and provides interactive security awareness training — all from a single self-hosted deployment.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => navigate("/login")}
                  className="group flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-red-500/20"
                >
                  Start Simulating
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <a
                  href="https://github.com/lixeron/Project_Specter"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-300 px-6 py-3 rounded-xl text-sm font-medium transition-all"
                >
                  <Github className="w-4 h-4" />
                  View on GitHub
                </a>
              </div>
            </div>
          </Reveal>

          {/* Hero terminal preview */}
          <Reveal delay={0.2}>
            <div className="mt-16 relative">
              <div className="absolute -inset-4 bg-gradient-to-b from-red-500/5 to-transparent rounded-2xl blur-xl" />
              <div className="relative bg-[#0c0c10] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04] bg-white/[0.02]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                  </div>
                  <span className="text-[11px] text-zinc-600 font-mono ml-2">specter — bash</span>
                </div>
                <div className="p-6 font-mono text-[13px] leading-relaxed">
                  <div className="text-zinc-500">$ specter simulate --vector email --topic credential</div>
                  <div className="mt-4 border border-red-500/20 rounded-lg p-4 bg-red-500/[0.03]">
                    <div className="text-red-400 text-xs mb-2 font-semibold">Generated Phishing Email</div>
                    <div className="text-zinc-500">From: IT Security &lt;security@company.com&gt;</div>
                    <div className="text-zinc-300">Subject: <span className="text-white font-semibold">Action Required: Password expires in 24 hours</span></div>
                    <div className="mt-2 text-zinc-400 text-xs leading-relaxed">Dear Employee, Our records indicate your password will expire...</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">urgency</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">authority</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">fear</span>
                  </div>
                  <div className="mt-3 text-emerald-400 text-xs">4 red flags identified &middot; tracking URL generated</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-xs font-mono text-red-400 tracking-widest uppercase mb-3">Attack Vectors</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Multi-vector adversary simulation</h2>
              <p className="text-zinc-400 mt-4 max-w-xl mx-auto">Real attackers don't just send emails. Specter simulates the full spectrum of social engineering threats.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={0.06 * i}>
                <div className="group h-full bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08] rounded-xl p-6 transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-red-500/[0.08] border border-red-500/10 flex items-center justify-center group-hover:border-red-500/20 transition-colors">
                      <f.icon className="w-5 h-5 text-red-400" />
                    </div>
                    {!f.free && (
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">PRO</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 border-t border-white/[0.03]">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-16">
              <p className="text-xs font-mono text-red-400 tracking-widest uppercase mb-3">Workflow</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Four steps to a more secure team</h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.num} delay={0.1 * i}>
                <div className="relative">
                  <span className="text-6xl font-bold text-white/[0.03] font-mono absolute -top-4 -left-1">{s.num}</span>
                  <div className="relative pt-8">
                    <h3 className="text-base font-semibold mb-2">{s.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="hidden lg:block absolute top-10 -right-4 w-5 h-5 text-zinc-700" />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source / Deploy */}
      <section id="open-source" className="py-24 px-6 border-t border-white/[0.03]">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/[0.05] rounded-2xl p-10 md:p-16 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/[0.03] rounded-full blur-3xl" />
              <div className="relative max-w-2xl">
                <p className="text-xs font-mono text-emerald-400 tracking-widest uppercase mb-3">Open Source</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  Deploy in one command
                </h2>
                <p className="text-zinc-400 leading-relaxed mb-8">
                  Specter runs entirely on your infrastructure. No vendor lock-in, no data leaving your network. Clone the repo, run docker compose, and you're simulating attacks in minutes.
                </p>
                <div className="bg-[#0a0a0e] border border-white/[0.06] rounded-xl p-4 font-mono text-sm mb-8">
                  <span className="text-zinc-500">$</span>{" "}
                  <span className="text-emerald-400">git clone</span>{" "}
                  <span className="text-zinc-300">github.com/lixeron/Project_Specter</span>
                  <br />
                  <span className="text-zinc-500">$</span>{" "}
                  <span className="text-emerald-400">docker compose up</span>
                  <br />
                  <span className="text-zinc-600"># Dashboard at localhost:3000, API at localhost:8000</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://github.com/lixeron/Project_Specter"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-zinc-200 transition-colors"
                  >
                    <Github className="w-4 h-4" />
                    Star on GitHub
                  </a>
                  <button
                    onClick={() => navigate("/login")}
                    className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] text-zinc-300 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Try the Demo
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.03] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <GhostLogo className="w-4 h-4 text-zinc-700" />
            <span className="font-mono">Specter</span>
            <span>&middot; Apache 2.0</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/lixeron/Project_Specter" target="_blank" rel="noreferrer" className="hover:text-zinc-400 transition-colors">GitHub</a>
            <a href="https://github.com/lixeron" target="_blank" rel="noreferrer" className="hover:text-zinc-400 transition-colors">@lixeron</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
