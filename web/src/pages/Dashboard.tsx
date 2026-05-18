import { useEffect, useState } from "react";
import { Crosshair, Zap, Users, Activity, ArrowUpRight, Shield } from "lucide-react";
import { api, type Campaign, type MetricsData } from "../api/client";

interface Stats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSimulations: number;
  totalGroups: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSimulations: 0,
    totalGroups: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<Campaign[]>([]);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
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
        // silently handle
      }
    };
    load();
  }, []);

  const statCards = [
    { label: "Total Campaigns", value: stats.totalCampaigns, icon: Crosshair, color: "from-red-500/10 to-red-500/[0.02]", border: "border-red-500/10", iconColor: "text-red-400" },
    { label: "Active", value: stats.activeCampaigns, icon: Activity, color: "from-emerald-500/10 to-emerald-500/[0.02]", border: "border-emerald-500/10", iconColor: "text-emerald-400" },
    { label: "Simulations", value: stats.totalSimulations, icon: Zap, color: "from-blue-500/10 to-blue-500/[0.02]", border: "border-blue-500/10", iconColor: "text-blue-400" },
    { label: "Target Groups", value: stats.totalGroups, icon: Users, color: "from-violet-500/10 to-violet-500/[0.02]", border: "border-violet-500/10", iconColor: "text-violet-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Overview of your adversary simulation platform</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-3 py-1.5">
          <Shield className="w-3.5 h-3.5" />
          {metrics?.version || "v0.1.0"}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, border, iconColor }) => (
          <div key={label} className={`relative overflow-hidden bg-gradient-to-br ${color} border ${border} rounded-xl p-5 group hover:border-opacity-30 transition-all`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-500 font-medium tracking-wide uppercase">{label}</span>
              <Icon className={`w-4 h-4 ${iconColor} opacity-60`} />
            </div>
            <p className="text-3xl font-bold font-mono tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Recent Campaigns — takes 3 cols */}
        <div className="lg:col-span-3 bg-zinc-900/40 border border-zinc-800/50 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300">Recent Campaigns</h2>
            <span className="text-xs text-zinc-600 font-mono">{recentCampaigns.length} shown</span>
          </div>
          {recentCampaigns.length === 0 ? (
            <div className="p-12 text-center">
              <Crosshair className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
              <p className="text-zinc-600 text-sm">No campaigns yet</p>
              <p className="text-zinc-700 text-xs mt-1">Create your first campaign to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/30">
              {recentCampaigns.map((c) => (
                <div key={c.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-zinc-600 font-mono">{c.id.slice(0, 8)}</span>
                      <span className="text-[11px] text-zinc-600">{c.vectors?.join(", ")}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-600 shrink-0 ml-4">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Metrics — takes 2 cols */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/50">
            <h2 className="text-sm font-semibold text-zinc-300">System Health</h2>
          </div>
          {metrics ? (
            <div className="divide-y divide-zinc-800/30">
              <MetricRow label="Total Requests" value={metrics.total_requests.toLocaleString()} />
              <MetricRow label="Avg Response" value={`${metrics.avg_response_time_ms}ms`} highlight={metrics.avg_response_time_ms < 100} />
              <MetricRow label="P95 Response" value={`${metrics.p95_response_time_ms}ms`} highlight={metrics.p95_response_time_ms < 200} />
              <MetricRow label="Active" value={metrics.active_requests.toString()} />
              <div className="px-5 py-3 flex flex-wrap gap-1.5">
                {Object.entries(metrics.status_codes).map(([code, count]) => (
                  <span
                    key={code}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      code.startsWith("2") ? "bg-emerald-500/10 text-emerald-400" :
                      code.startsWith("4") ? "bg-amber-500/10 text-amber-400" :
                      "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {code}: {count}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Activity className="w-6 h-6 text-zinc-800 mx-auto mb-2 animate-pulse" />
              <p className="text-zinc-600 text-xs">Loading metrics...</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "New Campaign", href: "/campaigns", icon: Crosshair },
          { label: "Quick Simulate", href: "/simulate", icon: Zap },
          { label: "Manage Targets", href: "/targets", icon: Users },
          { label: "View Metrics", href: "/metrics", icon: Activity },
        ].map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            className="group flex items-center justify-between bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800/30 hover:border-zinc-700/50 rounded-xl px-4 py-3 transition-all"
          >
            <div className="flex items-center gap-3">
              <Icon className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</span>
            </div>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/10",
    running: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    archived: "bg-zinc-800 text-zinc-600 border-zinc-700",
  };
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono border ${styles[status] || styles.draft}`}>
      {status}
    </span>
  );
}

function MetricRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="px-5 py-3 flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-sm font-mono ${highlight ? "text-emerald-400" : "text-zinc-200"}`}>{value}</span>
    </div>
  );
}
