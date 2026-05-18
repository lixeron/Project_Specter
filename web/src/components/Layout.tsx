import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Crosshair,
  Users,
  Zap,
  Activity,
  LogOut,
  Ghost,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/campaigns", icon: Crosshair, label: "Campaigns" },
  { to: "/targets", icon: Users, label: "Targets" },
  { to: "/simulate", icon: Zap, label: "Simulate" },
  { to: "/metrics", icon: Activity, label: "Metrics" },
];

export default function Layout() {
  const { logout } = useAuth();

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0a0a0e] border-r border-white/[0.04] flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.04]">
          <div className="flex items-center gap-2.5">
            <Ghost className="w-6 h-6 text-red-500" />
            <span className="text-base font-bold tracking-tight font-mono">
              SPECTER
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                  isActive
                    ? "bg-white/[0.05] text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/[0.04]">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.02] w-full transition-all"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-[#06060a]">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
