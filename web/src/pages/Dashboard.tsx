import { useEffect, useState, useRef } from "react";
import { Crosshair, Zap, Users, Activity, ArrowUpRight, Shield, Plus, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, type Campaign, type MetricsData } from "../api/client";

/* ── Animated Counter ── */
function AnimCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const steps = 30;
        const inc = value / steps;
        let cur = 0;
        const id = setInterval(() => {
          cur += inc;
          if (cur >= value) { setCount(value); clearInterval(id); }
          else setCount(Math.floor(cur));
        }, duration / steps);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  return <span ref={ref} className="tabular-nums">{count}</span>;
}

/* ── Mini Sparkline ── */
function Sparkline({ data, color = "#e74c3c", width = 80, height = 24 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="opacity-40">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

/* ── Status Dot ── */
function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-zinc-500",
    running: "bg-emerald-400 animate-pulse",
    paused: "bg-amber-400",
    completed: "bg-blue-400",
  };
  return <div className={`w-1.5 h-1.5 rounded-full ${colors[status] || colors.draft}`} />;
}

interface Stats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSimulations: number;
  totalGroups: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalCampaigns: 0, activeCampaigns: 0, totalSimulations: 0, totalGroups: 0 });
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [campaignData, groups, sims, metricsData] = await Promise.all([
          api.getCampaigns(), api.getGroups(), api.getSimulations(), api.getMetrics(),
        ]);
        setStats({
          totalCampaigns: campaignData.total,
          activeCampaigns: campaignData.campaigns.filter((c) => c.status === "running").length,
          totalSimulations: sims.length,
          totalGroups: groups.length,
        });
        setRecentCampaigns(campaignData.campaigns.slice(0, 6));
        setMetrics(metricsData);
      } catch { /* silently handle */ }
      setLoaded(true);
    };
    load();
  }, []);

  const statCards = [
    { label: "Campaigns", value: stats.totalCampaigns, icon: Crosshair, gradient: "from-red-500/8 to-transparent", accent: "text-red-400", spark: [3, 5, 4, 7, 6, 8, 9], sparkColor: "#ef4444" },
    { label: "Active", value: stats.activeCampaigns, icon: Activity, gradient: "from-emerald-500/8 to-transparent", accent: "text-emerald-400", spark: [1, 2, 1, 3, 2, 4, 3], sparkColor: "#10b981" },
    { label: "Simulations", value: stats.totalSimulations, icon: Zap, gradient: "from-blue-500/8 to-transparent", accent: "text-blue-400", spark: [2, 4, 3, 6, 8, 7, 12], sparkColor: "#3b82f6" },
    { label: "Targets", value: stats.totalGroups, icon: Users, gradient: "from-violet-500/8 to-transparent", accent: "text-violet-400", spark: [1, 1, 2, 2, 3, 3, 4], sparkColor: "#8b5cf6" },
  ];

  return (
    <div className="space-y-5" style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.5s ease" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-zinc-600 mt-0.5">Adversary simulation overview</p>
        </div>
        <button
          onClick={() => navigate("/simulate")}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-[12px] font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          Quick Simulate
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, gradient, accent, spark, sparkColor }, i) => (
          <div
            key={label}
            className={`relative overflow-hidden bg-gradient-to-br ${gradient} bg-[#0a0a0e] border border-white/[0.04] rounded-2xl p-5 hover:border-white/[0.07] transition-all duration-300 group`}
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? "translateY(0)" : "translateY(16px)",
              transition: `all 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 * i}s`,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] text-zinc-600 font-medium tracking-wider uppercase">{label}</span>
              <Icon className={`w-3.5 h-3.5 ${accent} opacity-50 group-hover:opacity-80 transition-opacity`} />
            </div>
            <div className="flex items-end justify-between">
              <p className="text-3xl font-bold font-mono tracking-tight">
                <AnimCounter value={value} />
              </p>
              <Sparkline data={spark} color={sparkColor} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-3">
        {/* Campaigns — 3 cols */}
        <div className="lg:col-span-3 bg-[#0a0a0e] border border-white/[0.04] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.03]">
            <h2 className="text-[13px] font-semibold text-zinc-300">Campaigns</h2>
            <button
              onClick={() => navigate("/campaigns")}
              className="flex items-center gap-1 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {recentCampaigns.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <Crosshair className="w-5 h-5 text-zinc-700" />
              </div>
              <p className="text-zinc-500 text-sm mb-1">No campaigns yet</p>
              <p className="text-zinc-700 text-xs mb-5">Launch your first adversary simulation</p>
              <button
                onClick={() => navigate("/campaigns")}
                className="inline-flex items-center gap-1.5 text-[12px] text-red-400 hover:text-red-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Create Campaign
              </button>
            </div>
          ) : (
            <div>
              {recentCampaigns.map((c, i) => (
                <div
                  key={c.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.01] transition-colors border-b border-white/[0.02] last:border-0 cursor-pointer group"
                  onClick={() => navigate("/campaigns")}
                  style={{
                    opacity: loaded ? 1 : 0,
                    transition: `opacity 0.4s ease ${0.05 * i}s`,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <StatusDot status={c.status} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate group-hover:text-white transition-colors">{c.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-700 font-mono">{c.id.slice(0, 8)}</span>
                        <span className="text-[10px] text-zinc-700">{c.vectors?.join(" · ")}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-zinc-700">{new Date(c.created_at).toLocaleDateString()}</span>
                    <ArrowUpRight className="w-3 h-3 text-zinc-800 group-hover:text-zinc-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Health — 2 cols */}
        <div className="lg:col-span-2 bg-[#0a0a0e] border border-white/[0.04] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.03]">
            <h2 className="text-[13px] font-semibold text-zinc-300">System</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400/70 font-mono">healthy</span>
            </div>
          </div>

          {metrics ? (
            <div>
              <MetricRow label="Requests" value={metrics.total_requests.toLocaleString()} />
              <MetricRow label="Avg latency" value={`${metrics.avg_response_time_ms}ms`} good={metrics.avg_response_time_ms < 100} />
              <MetricRow label="P95 latency" value={`${metrics.p95_response_time_ms}ms`} good={metrics.p95_response_time_ms < 200} />
              <MetricRow label="Version" value={metrics.version} />
              <div className="px-5 py-3 flex flex-wrap gap-1.5 border-t border-white/[0.02]">
                {Object.entries(metrics.status_codes).map(([code, count]) => (
                  <span
                    key={code}
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                      code.startsWith("2") ? "bg-emerald-500/8 text-emerald-500/70 border border-emerald-500/10" :
                      code.startsWith("4") ? "bg-amber-500/8 text-amber-500/70 border border-amber-500/10" :
                      "bg-red-500/8 text-red-500/70 border border-red-500/10"
                    }`}
                  >
                    {code}: {count}
                  </span>
                ))}
                {Object.keys(metrics.status_codes).length === 0 && (
                  <span className="text-[10px] text-zinc-700">No requests yet</span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-10 text-center">
              <Activity className="w-5 h-5 text-zinc-800 mx-auto mb-2 animate-pulse" />
              <p className="text-zinc-700 text-[11px]">Loading...</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: "New Campaign", href: "/campaigns", icon: Plus, desc: "Create simulation" },
          { label: "Simulate", href: "/simulate", icon: Zap, desc: "Quick test" },
          { label: "Targets", href: "/targets", icon: Users, desc: "Manage groups" },
          { label: "Metrics", href: "/metrics", icon: Activity, desc: "System health" },
        ].map(({ label, href, icon: Icon, desc }) => (
          <button
            key={label}
            onClick={() => navigate(href)}
            className="group flex items-center gap-3 bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-white/[0.06] rounded-xl px-4 py-3 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-center group-hover:border-white/[0.08] transition-colors">
              <Icon className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
            <div>
              <p className="text-[12px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</p>
              <p className="text-[10px] text-zinc-700">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MetricRow({ label, value, good = false }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="px-5 py-2.5 flex items-center justify-between border-b border-white/[0.02] last:border-0">
      <span className="text-[11px] text-zinc-600">{label}</span>
      <span className={`text-[12px] font-mono ${good ? "text-emerald-400/80" : "text-zinc-300"}`}>{value}</span>
    </div>
  );
}
