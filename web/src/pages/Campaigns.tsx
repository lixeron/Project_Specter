import { useEffect, useState, FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { api, type Campaign } from "../api/client";

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vectors, setVectors] = useState<string[]>(["email"]);

  const load = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(data.campaigns);
      setTotal(data.total);
    } catch {
      // handle error
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createCampaign({ name, description, vectors });
      setShowCreate(false);
      setName("");
      setDescription("");
      setVectors(["email"]);
      load();
    } catch {
      // handle error
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    try {
      await api.deleteCampaign(id);
      load();
    } catch {
      // handle error
    }
  };

  const toggleVector = (v: string) => {
    setVectors((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  };

  const statusColors: Record<string, string> = {
    draft: "bg-zinc-700 text-zinc-300",
    running: "bg-green-500/20 text-green-400",
    paused: "bg-yellow-500/20 text-yellow-400",
    completed: "bg-blue-500/20 text-blue-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-zinc-500 text-sm mt-1">{total} total</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-specter-red hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Campaign</h2>
              <button onClick={() => setShowCreate(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-specter-blue"
                  placeholder="Q1 Phishing Test"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-specter-blue resize-none h-20"
                  placeholder="Optional description..."
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Vectors</label>
                <div className="flex flex-wrap gap-2">
                  {["email", "qr", "fake_login", "sms", "pretext"].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggleVector(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                        vectors.includes(v)
                          ? "bg-specter-blue/20 text-specter-blue border border-specter-blue/30"
                          : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-specter-red hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                Create Campaign
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
            <p className="text-zinc-500">No campaigns yet. Create your first one.</p>
          </div>
        ) : (
          campaigns.map((c) => (
            <div
              key={c.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:border-zinc-700 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium">{c.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono ${statusColors[c.status] || statusColors.draft}`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="font-mono">{c.id.slice(0, 8)}</span>
                  <span>{c.vectors?.join(", ") || "—"}</span>
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {c.status === "draft" && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
