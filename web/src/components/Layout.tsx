import { NavLink, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Crosshair,
  Users,
  Zap,
  Activity,
  LogOut,
  Ghost,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/campaigns", icon: Crosshair, label: "Campaigns" },
  { to: "/targets", icon: Users, label: "Targets" },
  { to: "/simulate", icon: Zap, label: "Simulate" },
  { to: "/metrics", icon: Activity, label: "Metrics" },
];

export default function Layout() {
  const { logout } = useAuth();
  
  // Dual Navigation Mode: "side" | "top"
  const [navMode, setNavMode] = useState<"side" | "top">(() => {
    const saved = localStorage.getItem("specter_nav_mode");
    return (saved === "top" || saved === "side") ? saved : "side";
  });

  // Sidebar Collapsed State: boolean
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("specter_sidebar_collapsed") === "true";
  });

  // Mobile drawer open state if active
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem("specter_nav_mode", navMode);
  }, [navMode]);

  useEffect(() => {
    localStorage.setItem("specter_sidebar_collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#06060a] text-zinc-100">
      
      {/* ── HIGH-TECH GLOBAL TOP BAR HEADER ── */}
      <header className="h-14 shrink-0 bg-[#08080c]/80 backdrop-blur-md border-b border-white/[0.04] px-5 flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          {/* Logo element */}
          <div className="flex items-center gap-2.5">
            <Ghost className="w-5 h-5 text-red-500 animate-pulse" />
            <span className="text-sm font-semibold tracking-wider font-mono text-white">
              SPECTER <span className="text-[9px] text-red-400/80 bg-red-500/10 border border-red-500/20 px-1 py-0.5 rounded ml-1">V2.5</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono border-l border-white/[0.05] pl-4 text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>NOC ACCESS: SECURE</span>
          </div>
        </div>

        {/* TOP COGNITIVE NAVIGATION LINKS (Displayed when navMode is "top") */}
        {navMode === "top" && (
          <nav className="hidden md:flex items-center gap-1.5">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                    isActive
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        {/* UPPER CONTROL BOX: LAYOUT TOGGLER */}
        <div className="flex items-center gap-3">
          {/* Layout Quick Toggles */}
          <div className="flex items-center bg-[#0d0d12] border border-white/[0.04] rounded-lg p-0.5">
            <button
              onClick={() => setNavMode("side")}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-md transition-all ${
                navMode === "side"
                  ? "bg-red-500/10 text-red-400 border border-red-500/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Side Sidebar Navigation"
            >
              Side Bar
            </button>
            <button
              onClick={() => setNavMode("top")}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-md transition-all ${
                navMode === "top"
                  ? "bg-red-500/10 text-red-400 border border-red-500/10"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Top Navbar Navigation"
            >
              Top Bar
            </button>
          </div>

          <div className="hidden md:block w-px h-5 bg-white/[0.05]" />

          {/* Logout Action */}
          <button
            onClick={logout}
            className="hidden md:flex items-center gap-2 text-zinc-500 hover:text-red-400 text-xs transition-colors"
            title="Disconnect node"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-mono text-[10px] uppercase tracking-wider">LOGOUT</span>
          </button>

          {/* Mobile responsive hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── MAIN AREA CONTAINER ── */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDE BAR LAYOUT VIEW (Only when navMode is "side") */}
        {navMode === "side" && (
          <aside
            className={`hidden md:flex flex-col bg-[#08080c] border-r border-white/[0.04] transition-all duration-300 relative shrink-0 ${
              sidebarCollapsed ? "w-16" : "w-56"
            }`}
          >
            {/* Top Expand/Collapse toggle rail */}
            <div className="flex items-center justify-end px-3 py-2 border-b border-white/[0.02]">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-7 h-7 rounded-lg bg-white/[0.02] border border-white/[0.03] flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors"
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Sidebar Body Navigation */}
            <nav className="flex-1 p-3 space-y-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl p-2.5 text-xs transition-all duration-200 group relative ${
                      isActive
                        ? "bg-red-500/10 text-white font-semibold border border-red-500/15"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent"
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="ml-3 truncate">{label}</span>
                  )}

                  {/* Bubble tooltip when collapsed */}
                  {sidebarCollapsed && (
                    <div className="absolute left-14 bg-[#0a0a0e] text-zinc-200 text-[10px] font-mono px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap shadow-xl border border-white/[0.04] z-50">
                      {label}
                    </div>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Logout bottom slot in sidebar */}
            <div className="p-3 border-t border-white/[0.03]">
              <button
                onClick={logout}
                className={`flex items-center rounded-xl text-zinc-600 hover:text-red-400 transition-all ${
                  sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2 text-xs"
                }`}
              >
                <LogOut className="w-4 h-4 text-zinc-500" />
                {!sidebarCollapsed && <span className="ml-3 font-mono text-[10px] uppercase">DISCONNECT</span>}
              </button>
            </div>
          </aside>
        )}

        {/* MOBILE DRAWER MODAL SCREEN OVERLAY */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 z-40 md:hidden"
              />

              {/* Drawer Container */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 bottom-0 left-0 w-64 bg-[#08080c] border-r border-white/[0.05] z-50 p-5 flex flex-col justify-between md:hidden"
              >
                <div>
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <Ghost className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-bold font-mono text-white">SPECTER CONSOLE</span>
                    </div>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-zinc-500 hover:text-white"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>

                  <nav className="space-y-1">
                    {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center p-3 rounded-xl text-xs transition-all ${
                            isActive
                              ? "bg-red-500/10 text-red-400 font-semibold border border-red-500/10"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        <span>{label}</span>
                      </NavLink>
                    ))}
                  </nav>
                </div>

                <div className="border-t border-white/[0.03] pt-4">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-3 w-full p-2.5 rounded-xl text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-mono text-[10px] uppercase">LOGOUT CONNECTION</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* MAIN BODY SCROLL CONTAINER */}
        <main className="flex-1 overflow-auto bg-[#06060a]">
          <div className="max-w-6xl mx-auto px-6 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

