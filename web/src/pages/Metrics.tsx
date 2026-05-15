import { useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { api, type MetricsData } from "../api/client";

export default function Metrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  const load = async () => {
    try {
      setMetrics(await api.getMetrics());
    } catch {
      // handle
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">System Metrics</h1>
        <button
          onClick={load}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {!metrics ? (
        <p className="text-zinc-500">Loading...</p>
      ) : (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Requests"
              value={metrics.total_requests.toString()}
            />
            <MetricCard
              label="Active"
              value={metrics.active_requests.toString()}
            />
            <MetricCard
              label="Avg Response"
              value={`${metrics.avg_response_time_ms}ms`}
            />
            <MetricCard
              label="P95 Response"
              value={`${metrics.p95_response_time_ms}ms`}
            />
          </div>

          {/* Status Codes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Status Codes
            </h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(metrics.status_codes).map(([code, count]) => (
                <div
                  key={code}
                  className={`px-3 py-2 rounded-lg font-mono text-sm ${
                    code.startsWith("2")
                      ? "bg-green-500/10 text-green-400"
                      : code.startsWith("4")
                        ? "bg-yellow-500/10 text-yellow-400"
                        : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {code}: {count}
                </div>
              ))}
              {Object.keys(metrics.status_codes).length === 0 && (
                <p className="text-zinc-600 text-sm">No requests recorded yet.</p>
              )}
            </div>
          </div>

          {/* Top Endpoints */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 mb-4">
              Top Endpoints
            </h2>
            <div className="space-y-2">
              {Object.entries(metrics.endpoints).map(([endpoint, data]) => (
                <div
                  key={endpoint}
                  className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0 font-mono text-sm"
                >
                  <span className="text-zinc-300 truncate mr-4">{endpoint}</span>
                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <span className="text-zinc-500">{data.count} reqs</span>
                    <span className="text-specter-blue">{data.avg_ms}ms</span>
                  </div>
                </div>
              ))}
              {Object.keys(metrics.endpoints).length === 0 && (
                <p className="text-zinc-600 text-sm">No endpoint data yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-sm text-zinc-400 mb-2">{label}</p>
      <p className="text-2xl font-bold font-mono">{value}</p>
    </div>
  );
}
