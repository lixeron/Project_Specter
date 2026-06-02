import { useEffect, useState, useRef } from "react";
import {
  Crosshair,
  Zap,
  Users,
  Activity,
  ArrowUpRight,
  Plus,
  ChevronRight,
  Terminal,
  Shield,
  Clock,
  HardDrive,
  Cpu
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";
import { api, type Campaign, type MetricsData } from "../api/client";
import ThreeDashboardWidget from "../components/ThreeDashboardWidget";

/* ── Live Log Interface definitions ── */
interface ThreatLog {
  id: string;
  timestamp: string;
  type: string;
  text: string;
  status: "compromised" | "opened" | "clicked" | "defended" | "reported" | "system";
  code: string;
}

const THREAT_LOG_TEMPLATES = [
  { type: "exploit", text: "Target 'admin-sync@corporate' submitted credentials on login redirect.", status: "compromised", code: "CRITICAL_COMPROMISE" },
  { type: "open", text: "Target 'hr-director@company.com' opened Q2_Payroll_Review Spear Phish.", status: "opened", code: "EMAIL_ENGAGED" },
  { type: "click", text: "Target 'sales-lead@company.com' clicked internal redirect of SSO replica.", status: "clicked", code: "BEACON_CLICKED" },
  { type: "report", text: "Software architect reported suspicious phone support caller with IT pretext.", status: "reported", code: "HUMAN_REPELLED" },
  { type: "success", text: "Accountant deleted Benefits_Update clone email and notified NOC.", status: "defended", code: "PHISH_DEFENDED" },
  { type: "scan", text: "Target 'finance-analyst-12@corp' scanned badge-repair fake QR poster.", status: "clicked", code: "QR_COORDINATE_SCANNED" },
  { type: "sys", text: "Simulated mail transfer agent routing successful for 14 active drills.", status: "system", code: "SYSTEM_DECK_STENCIL" },
];

const RECENT_ACTIVITY_TREND = [
  { time: "09:00", Impressions: 42, Intercepts: 8, Failures: 1 },
  { time: "11:00", Impressions: 85, Intercepts: 21, Failures: 3 },
  { time: "13:00", Impressions: 140, Intercepts: 39, Failures: 7 },
  { time: "15:00", Impressions: 185, Intercepts: 64, Failures: 11 },
  { time: "17:00", Impressions: 210, Intercepts: 82, Failures: 14 },
  { time: "19:00", Impressions: 235, Intercepts: 98, Failures: 16 },
  { time: "21:00", Impressions: 260, Intercepts: 112, Failures: 18 },
];

/* ── Animated Counter ── */
function AnimCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const steps = 25;
        const inc = value / steps;
        let cur = 0;
        const id = setInterval(() => {
          cur += inc;
          if (cur >= value) {
            setCount(value);
            clearInterval(id);
          } else {
            setCount(Math.floor(cur));
          }
        }, duration / steps);
      }
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  return <span ref={ref} className="tabular-nums">{count}</span>;
}

/* ── Status Dot ── */
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-zinc-500",
    running: "bg-red-500 animate-pulse",
    paused: "bg-amber-500",
    completed: "bg-blue-400",
  };
  return <div className={`w-2 h-2 rounded-full ${colors[status] || colors.draft}`} />;
}

interface Stats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSimulations: number;
  totalGroups: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalCampaigns: 4,
    activeCampaigns: 2,
    totalSimulations: 5,
    totalGroups: 3,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  // Live Scrolling logs feed
  const [threatLogs, setThreatLogs] = useState<ThreatLog[]>([]);

  useEffect(() => {
    // Populate standard background threat log history
    const initialLogs: ThreatLog[] = Array.from({ length: 4 }).map((_, i) => {
      const template = THREAT_LOG_TEMPLATES[i % THREAT_LOG_TEMPLATES.length];
      const stamp = new Date(Date.now() - (4 - i) * 600000);
      return {
        id: `log_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: stamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: template.type,
        text: template.text,
        status: template.status as any,
        code: template.code
      };
    });
    setThreatLogs(initialLogs);

    const load = async () => {
      try {
        const [campaignData, groups, sims, metricsData] = await Promise.all([
          api.getCampaigns(),
          api.getGroups(),
          api.getSimulations(),
          api.getMetrics(),
        ]);
        setStats({
          totalCampaigns: campaignData.total,
          activeCampaigns: campaignData.campaigns.filter((c) => c.status === "running").length,
          totalSimulations: sims.length,
          totalGroups: groups.length,
        });
        setRecentCampaigns(campaignData.campaigns.slice(0, 5));
        setMetrics(metricsData);
      } catch {
        // Safe standard fallback already coded in ApiClient
      }
    };
    load();

    // Setup active interval pushing gorgeous simulated operational events onto coordinates
    const timer = setInterval(() => {
      const activeIdx = Math.floor(Math.random() * THREAT_LOG_TEMPLATES.length);
      const template = THREAT_LOG_TEMPLATES[activeIdx];
      const newLog: ThreatLog = {
        id: `log_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: template.type,
        text: template.text,
        status: template.status as any,
        code: template.code
      };
      setThreatLogs((prev) => [newLog, ...prev.slice(0, 7)]);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const statCards = [
    {
      label: "Campaigns Loaded",
      value: stats.totalCampaigns,
      icon: Crosshair,
      glow: "group-hover:border-red-500/20",
      accent: "text-red-400",
      phrase: "active cyber vectors"
    },
    {
      label: "In Flight Runs",
      value: stats.activeCampaigns,
      icon: Activity,
      glow: "group-hover:border-emerald-500/20",
      accent: "text-emerald-400",
      phrase: "active live feeds"
    },
    {
      label: "Target Drills",
      value: stats.totalSimulations,
      icon: Zap,
      glow: "group-hover:border-indigo-500/20",
      accent: "text-indigo-400",
      phrase: "compromise assessments"
    },
    {
      label: "Targeted Officers",
      value: stats.totalGroups,
      icon: Users,
      glow: "group-hover:border-amber-400/20",
      accent: "text-amber-400",
      phrase: "defined threat departments"
    },
  ];

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0b0b10] border border-white/[0.08] backdrop-blur-md rounded-lg p-3 shadow-2xl font-mono text-[10px]">
          <p className="text-zinc-500 font-semibold mb-1">DRILL METRICS :: {payload[0].payload.time}</p>
          {payload.map((p: any) => (
            <div key={p.name} className="flex justify-between items-center gap-6 mt-1">
              <span style={{ color: p.color }} className="capitalize font-medium">{p.name}:</span>
              <span className="font-bold text-white font-mono">{p.value} units</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ACTION PLAT DECK ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/[0.03] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Threat Operations System
            </span>
            <span className="text-[10px] font-mono bg-white/[0.04] text-zinc-400 border border-white/[0.04] px-2 py-0.5 rounded-full">
              SECURE SEC_NET_2026
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-sans text-white">Adversary Simulator Command</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Continuous evaluation deck & employee exploit testing dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/simulate")}
            className="group flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4.5 py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-red-600/10 active:scale-[0.98]"
          >
            <Zap className="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform" />
            Launch Simulation
          </button>
        </div>
      </div>

      {/* ── STATS GRID ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {statCards.map(({ label, value, icon: Icon, glow, accent, phrase }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 * i }}
            className={`group relative overflow-hidden bg-[#08080c] border border-white/[0.03] rounded-2xl p-5 hover:bg-white/[0.01] transition-all duration-300 ${glow}`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">{label}</span>
              <Icon className={`w-4 h-4 ${accent} opacity-50 group-hover:opacity-100 transition-opacity`} />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold font-mono tracking-tight text-white">
                <AnimCounter value={value} />
              </p>
              <span className="text-[10px] font-mono text-zinc-600">UNITS</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1.5 font-light capitalize">{phrase}</p>
          </motion.div>
        ))}
      </div>

      {/* ── MIDDLE ROW: HIGH-END CHARTS & REAL-TIME LOG OVERHAUL ── */}
      <div className="grid lg:grid-cols-6 gap-4">
        {/* Analytics Timeline Chart — Card layout 2cols */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2 bg-[#08080c] border border-white/[0.03] rounded-2xl overflow-hidden p-5 flex flex-col justify-between min-h-[360px]"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-mono font-bold text-zinc-300 tracking-wider">DRILL EXPLOITATION VECTORS</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Real-time simulation impressions and compromise intercept thresholds</p>
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Impressions
                </span>
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Clicks
                </span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={RECENT_ACTIVITY_TREND} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientImpressions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradientIntercepts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#27272a" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="#27272a" fontSize={9} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    name="impressions"
                    dataKey="Impressions"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#gradientImpressions)"
                  />
                  <Area
                    type="monotone"
                    name="clicks"
                    dataKey="Intercepts"
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#gradientIntercepts)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Brand-new 3D Coordinates Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="lg:col-span-2 min-h-[360px]"
        >
          <ThreeDashboardWidget />
        </motion.div>

        {/* Real-time Threat Terminal Log Ticker — Card layout 2cols */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="lg:col-span-2 bg-[#08080c] border border-white/[0.03] rounded-2xl overflow-hidden p-5 flex flex-col h-[360px]"
        >
          <div className="flex items-center justify-between border-b border-white/[0.03] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-red-500 animate-pulse" />
              <h3 className="text-xs font-mono font-bold text-zinc-300 tracking-wider">ACTIVE FEED LOG CONSOLE</h3>
            </div>
            <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
              LIVE BROADCAST
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs hide-scrollbar font-mono">
            <AnimatePresence initial={false}>
              {threatLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.25 }}
                  className="border-b border-white/[0.01] pb-2 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] mb-0.5 text-zinc-500">
                    <span className="text-zinc-600">{log.timestamp} UTC</span>
                    <span
                      className={`text-[8px] px-1 py-0.5 rounded font-mono font-bold ${
                        log.status === "compromised" ? "bg-red-500/10 text-red-400 border border-red-500/15" :
                        log.status === "defended" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" :
                        log.status === "reported" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/15" :
                        "bg-zinc-800 text-zinc-400"
                      }`}
                    >
                      {log.code}
                    </span>
                  </div>
                  <p className="text-zinc-400 leading-normal text-[11px] font-light">{log.text}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            {threatLogs.length === 0 && (
              <div className="h-full flex items-center justify-center text-zinc-600 text-[11px] py-10">
                Awaiting connection metrics...
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── BOTTOM ROW: CAMPAIGNS & ADVANCED METRICS ── */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* Campaign List Table Block — 3 cols */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="lg:col-span-3 bg-[#08080c] border border-white/[0.03] rounded-2xl overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.03]">
              <h2 className="text-xs font-mono font-bold text-zinc-300 tracking-wider">RUNNING ADVERSARY DECKS</h2>
              <button
                onClick={() => navigate("/campaigns")}
                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-white transition-colors uppercase font-mono"
              >
                Launch Panel <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {recentCampaigns.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-4">
                  <Crosshair className="w-5 h-5 text-zinc-600" />
                </div>
                <p className="text-zinc-500 text-sm mb-1">No campaigns deployed</p>
                <p className="text-zinc-700 text-xs mb-5">Deploy your initial corporate target exercise</p>
                <button
                  onClick={() => navigate("/campaigns")}
                  className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Deploy Campaign
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.01]">
                {recentCampaigns.map((c) => (
                  <div
                    key={c.id}
                    className="px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.01] transition-colors cursor-pointer group"
                    onClick={() => navigate("/campaigns")}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <StatusDot status={c.status} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-zinc-200 group-hover:text-white transition-colors">{c.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 font-mono text-[9px] text-zinc-600">
                          <span>{c.id.substring(0, 10).toUpperCase()}</span>
                          <span>&middot;</span>
                          <span className="uppercase text-red-500/70">{c.vectors?.join(" & ") || "email"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-right">
                      <div>
                        <p className="text-[10px] text-zinc-500 font-mono">DEPLOYED</p>
                        <p className="text-[11px] text-zinc-300 mt-0.5">{new Date(c.created_at).toLocaleDateString()}</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-zinc-700 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* System Diagnostics Metrics — 2 cols */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="lg:col-span-2 bg-[#08080c] border border-white/[0.03] rounded-2xl overflow-hidden p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.03] pb-3 mb-4">
              <h2 className="text-xs font-mono font-bold text-zinc-300 tracking-wider">HOST TELEMETRY</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400 font-mono tracking-widest uppercase">CLUSTER_ACTIVE</span>
              </div>
            </div>

            {metrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="bg-[#0b0b10] border border-white/[0.02] p-3 rounded-xl">
                    <p className="text-[9px] text-zinc-600 mb-1 flex items-center gap-1 uppercase">
                      <Clock className="w-3 h-3 text-red-500" /> latency avg
                    </p>
                    <p className="text-base font-bold text-zinc-200">{metrics.avg_response_time_ms}ms</p>
                    <div className="w-full bg-zinc-900 h-1 mt-2 rounded overflow-hidden">
                      <div className="bg-red-500 h-full" style={{ width: `${Math.min(100, (metrics.avg_response_time_ms / 150) * 100)}%` }} />
                    </div>
                  </div>

                  <div className="bg-[#0b0b10] border border-white/[0.02] p-3 rounded-xl">
                    <p className="text-[9px] text-zinc-600 mb-1 flex items-center gap-1 uppercase">
                      <Shield className="w-3 h-3 text-indigo-400" /> network p95
                    </p>
                    <p className="text-base font-bold text-zinc-200">{metrics.p95_response_time_ms}ms</p>
                    <div className="w-full bg-zinc-900 h-1 mt-2 rounded overflow-hidden">
                      <div className="bg-indigo-400 h-full" style={{ width: `${Math.min(100, (metrics.p95_response_time_ms / 300) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-[#0b0b10] border border-white/[0.02] p-3 rounded-xl space-y-2 text-[11px] font-mono">
                  <div className="flex justify-between text-zinc-500">
                    <span className="flex items-center gap-1.5"><HardDrive className="w-3.5 h-3.5 text-zinc-600" /> Database Engine:</span>
                    <span className="text-zinc-300">indexed_local_db</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-zinc-600" /> Active Cluster Port:</span>
                    <span className="text-zinc-300">tcp::3000 (proxy)</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-zinc-600" /> Frame Version:</span>
                    <span className="text-zinc-300">{metrics.version}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-[9px] text-zinc-600 uppercase font-mono tracking-wider mb-2">Endpoint request rates</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(metrics.status_codes).map(([code, count]) => (
                      <span
                        key={code}
                        className={`text-[9.5px] font-mono px-2 py-0.5 rounded-full border ${
                          code.startsWith("2") ? "bg-emerald-500/[0.04] text-emerald-400 border-emerald-500/10" :
                          code.startsWith("4") ? "bg-amber-500/[0.04] text-amber-500 border-amber-500/10" :
                          "bg-red-500/[0.04] text-red-500 border-red-500/10"
                        }`}
                      >
                        {code}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center">
                <Activity className="w-5 h-5 text-zinc-700 mx-auto mb-2 animate-pulse" />
                <p className="text-zinc-600 text-[10px] font-mono">CONNECTING CLUSTER LINK...</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── FOOTER DRILL NAVIGATION PANES ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 border-t border-white/[0.03] pt-6">
        {[
          { label: "New Campaign Deck", href: "/campaigns", icon: Plus, desc: "Construct target simulation workflows" },
          { label: "Adversary Testing Console", href: "/simulate", icon: Zap, desc: "Run instant social engineering probes" },
          { label: "Staff Target Groups", href: "/targets", icon: Users, desc: "Deploy company threat segments" },
          { label: "Host Telemetry Logs", href: "/metrics", icon: Activity, desc: "Inspect packet rates & cluster ports" },
        ].map(({ label, href, icon: Icon, desc }) => (
          <button
            key={label}
            onClick={() => navigate(href)}
            className="group flex flex-col justify-between bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.02] hover:border-white/[0.05] rounded-xl px-4 py-3.5 text-left h-24 transition-all duration-300"
          >
            <div className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/[0.04] flex items-center justify-center group-hover:border-red-500/20 group-hover:bg-red-950/10 transition-all">
              <Icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-red-400 transition-colors" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-zinc-300 group-hover:text-white transition-colors">{label}</p>
              <p className="text-[10px] text-zinc-600 truncate mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
