import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Ghost, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register, loginDemo, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        await register(orgName, name, email, password);
      } else {
        await login(email, password);
      }
      navigate("/dashboard");
    } catch {
      // Error handled by AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06060a] p-4 relative">
      {/* Subtle background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] rounded-full opacity-[0.02]" style={{ background: "radial-gradient(circle, #e74c3c 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Back to landing */}
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-400 transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <Ghost className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold tracking-tight font-mono">SPECTER</h1>
        </div>

        {/* Form */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-7">
          <h2 className="text-base font-semibold mb-5">
            {isRegister ? "Create Account" : "Sign In"}
          </h2>

          {error && (
            <div className="bg-red-500/[0.06] border border-red-500/10 text-red-400 text-sm rounded-xl p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <>
                <InputField label="Organization" value={orgName} onChange={setOrgName} placeholder="Acme Corp" />
                <InputField label="Your Name" value={name} onChange={setName} placeholder="Jane Doe" />
              </>
            )}
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" />
            <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="Min 8 characters" minLength={8} />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? "..." : isRegister ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-white/[0.04]"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider font-mono text-zinc-600">sandbox environment</span>
            <div className="flex-grow border-t border-white/[0.04]"></div>
          </div>

          <button
            type="button"
            onClick={() => {
              loginDemo();
              navigate("/dashboard");
            }}
            className="w-full relative group overflow-hidden border border-red-500/30 hover:border-red-500/60 bg-red-950/10 text-red-400 hover:text-white rounded-xl py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300"
          >
            <span className="relative flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping absolute" />
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 relative" />
              Bypass &amp; Launch Demo Console
            </span>
          </button>

          <div className="mt-5 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {isRegister ? "Already have an account? Sign in" : "Need an account? Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label, type = "text", value, onChange, placeholder, minLength,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder: string; minLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1.5 font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-red-500/30 transition-colors placeholder:text-zinc-700"
        placeholder={placeholder}
        required
        minLength={minLength}
      />
    </div>
  );
}
