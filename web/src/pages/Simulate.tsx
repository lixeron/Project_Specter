import { useState } from "react";
import { Zap, AlertTriangle, Brain, ExternalLink } from "lucide-react";
import { api, type SimulationResult } from "../api/client";

const VECTORS = [
  { value: "email", label: "Email", free: true },
  { value: "qr", label: "QR Code", free: true },
  { value: "fake_login", label: "Fake Login", free: false },
  { value: "pretext", label: "Pretext", free: false },
];

const TOPICS: Record<string, string[]> = {
  email: ["general", "credential", "bec"],
  qr: ["wifi", "survey", "event", "general"],
  fake_login: ["generic_sso", "microsoft", "google", "okta"],
  pretext: ["it_support", "vendor_visit", "general"],
};

export default function Simulate() {
  const [vector, setVector] = useState("email");
  const [topic, setTopic] = useState("general");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.quickSimulate(vector, topic);
      setResult(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const content = result?.content || {};

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Quick Simulate</h1>

      {/* Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Vector</label>
            <div className="flex flex-wrap gap-2">
              {VECTORS.map((v) => (
                <button
                  key={v.value}
                  onClick={() => {
                    setVector(v.value);
                    setTopic(TOPICS[v.value]?.[0] || "general");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                    vector === v.value
                      ? "bg-specter-red/20 text-specter-red border border-specter-red/30"
                      : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  {v.label}
                  {!v.free && (
                    <span className="ml-1 text-yellow-500">PRO</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Topic</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-specter-blue"
            >
              {(TOPICS[vector] || ["general"]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-specter-red hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 mb-6">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Generated Content */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-specter-red" />
              Generated {result.vector.toUpperCase()} Simulation
            </h2>

            {result.vector === "email" && (
              <div className="bg-zinc-950 rounded-lg p-4 font-mono text-sm">
                <p className="text-zinc-500">
                  From: {String(content.sender_name || "")} &lt;
                  {String(content.sender_email || "")}&gt;
                </p>
                <p className="text-zinc-500 mb-3">
                  Subject:{" "}
                  <span className="text-white font-semibold">
                    {String(content.subject || "")}
                  </span>
                </p>
                <hr className="border-zinc-800 mb-3" />
                <pre className="whitespace-pre-wrap text-zinc-300">
                  {String(content.body_text || "")}
                </pre>
              </div>
            )}

            {result.vector === "qr" && (
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">
                  {String(content.poster_title || "")}
                </p>
                <p className="text-zinc-400 text-sm mb-4">
                  {String(content.poster_body || "")}
                </p>
                {!!content.qr_data_uri && (
                  <img
                    src={String(content.qr_data_uri)}
                    alt="QR Code"
                    className="mx-auto rounded-lg w-48 h-48"
                  />
                )}
              </div>
            )}

            {result.vector === "pretext" && (
              <div className="bg-zinc-950 rounded-lg p-4">
                <p className="text-specter-blue font-semibold mb-2">
                  {String(content.title || "")} — {String(content.scenario_type || "")}
                </p>
                <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-mono">
                  {String(content.script || "")}
                </pre>
              </div>
            )}
          </div>

          {/* Red Flags */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-specter-yellow" />
              Red Flags
            </h2>
            <div className="space-y-2">
              {result.red_flags.map((flag, i) => (
                <div
                  key={i}
                  className="bg-red-500/5 border-l-2 border-specter-red pl-3 py-2 text-sm text-zinc-300"
                >
                  {flag}
                </div>
              ))}
            </div>
          </div>

          {/* Tactics */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-specter-blue" />
              Tactics Used
            </h2>
            <div className="flex flex-wrap gap-2">
              {result.social_engineering_tactics.map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 bg-specter-blue/10 text-specter-blue border border-specter-blue/20 rounded-full text-xs font-mono"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 font-mono text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <ExternalLink className="w-4 h-4" />
              <a
                href={result.tracking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-specter-blue hover:underline"
              >
                Open Training Page →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
