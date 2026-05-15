import { useEffect, useState } from "react";
import { Crosshair, Zap, Users, Activity } from "lucide-react";
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
          activeCampaigns: campaignData.campaigns.filter(
            (c) => c.status === "running"
          ).length,
          totalSimulations: sims.length,
          totalGroups: groups.length,
        });
        setRecentCampaigns(campaignData.campaigns.slice(0, 5));
        setMetrics(metricsData);
      } catch {
        // Silently handle — page will show zeros
      }
    };
    load();
  }, []);

  const statCards = [
    {
      label: "Campaigns",
      value: stats.totalCampaigns,
      icon: Crosshair,
      color: "text-specter-red",
    },
    {
      label: "Active",
      value: stats.activeCampaigns,
      icon: Activity,
      color: "text-specter-green",
    },
    {
      label: "Simulations",
      value: stats.totalSimulations,
      icon: Zap,
      color: "text-specter-blue",
    },
    {
      label: "Target Groups",
      value: stats.totalGroups,
      icon: Users,
      color: "text-specter-purple",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-3xl font-bold font-mono">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-400 mb-4">
            Recent Campaigns
          </h2>
          {recentCampaigns.length === 0 ? (
            <p className="text-zinc-600 text-sm">No campaigns yet.</p>
          ) : (
            <div className="space-y-3">
              {recentCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-zinc-500 font-mono">
                      {c.vectors?.join(", ") || "—"}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Metrics */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-400 mb-4">
            System Metrics
          </h2>
          {metrics ? (
            <div className="space-y-3 font-mono text-sm">
              <MetricRow
                label="Total Requests"
                value={metrics.total_requests.toString()}
              />
              <MetricRow
                label="Avg Response"
                value={`${metrics.avg_response_time_ms}ms`}
              />
              <MetricRow
                label="P95 Response"
                value={`${metrics.p95_response_time_ms}ms`}
              />
              <MetricRow label="Version" value={metrics.version} />
            </div>
          ) : (
            <p className="text-zinc-600 text-sm">Loading metrics...</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-zinc-700 text-zinc-300",
    running: "bg-green-500/20 text-green-400",
    paused: "bg-yellow-500/20 text-yellow-400",
    completed: "bg-blue-500/20 text-blue-400",
    archived: "bg-zinc-800 text-zinc-500",
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-mono ${colors[status] || colors.draft}`}
    >
      {status}
    </span>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-zinc-800 last:border-0">
      <span className="text-zinc-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
