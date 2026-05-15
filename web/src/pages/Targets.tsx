import { useEffect, useState, FormEvent } from "react";
import { Plus, X, Users } from "lucide-react";
import { api, type TargetGroup } from "../api/client";

export default function Targets() {
  const [groups, setGroups] = useState<TargetGroup[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    try {
      const data = await api.getGroups();
      setGroups(data);
    } catch {
      // handle
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.createGroup(name, description || undefined);
      setShowCreate(false);
      setName("");
      setDescription("");
      load();
    } catch {
      // handle
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Target Groups</h1>
          <p className="text-zinc-500 text-sm mt-1">{groups.length} groups</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-specter-red hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Group
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">New Target Group</h2>
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
                  placeholder="Engineering Team"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-specter-blue"
                  placeholder="Optional..."
                />
              </div>
              <button
                type="submit"
                className="w-full bg-specter-red hover:bg-red-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Group List */}
      <div className="space-y-3">
        {groups.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
            <p className="text-zinc-500">No target groups. Create one to get started.</p>
          </div>
        ) : (
          groups.map((g) => (
            <div
              key={g.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-specter-purple/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-specter-purple" />
                </div>
                <div>
                  <h3 className="font-medium">{g.name}</h3>
                  <p className="text-xs text-zinc-500">
                    {g.description || "No description"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold font-mono">{g.member_count}</p>
                <p className="text-xs text-zinc-500">members</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
