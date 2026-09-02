import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiGrid,
  FiPlusCircle,
  FiUploadCloud,
  FiLayers,
  FiSettings,
  FiLogOut,
  FiZap,
  FiX
} from "react-icons/fi";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: FiGrid },
    { name: "Create Pipeline", path: "/create-pipeline", icon: FiPlusCircle },
    { name: "Quick Upload", path: "/upload", icon: FiUploadCloud },
    { name: "Pipelines", path: "/pipelines", icon: FiLayers },
    { name: "Settings", path: "/settings", icon: FiSettings },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navContent = (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800 text-slate-300 w-64 p-5 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between mb-8 px-2">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <FiZap className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none group-hover:text-cyan-300 transition-colors">
              StreamWeaver
            </h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
              ETL Platform
            </span>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white p-1">
            <FiX className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Primary Navigation */}
      <div className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Workspace
      </div>
      <nav className="space-y-1.5 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-medium text-sm transition-all duration-200 ${
                isActive
                  ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* High-Throughput Banner */}
      <div className="mb-6 p-3.5 bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-indigo-500/20 rounded-xl">
        <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-indigo-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Native Node Streams
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Memory-safe ETL processing up to 10GB datasets with backpressure safety.
        </p>
      </div>

      {/* Logout */}
      <div className="border-t border-slate-800/80 pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <FiLogOut className="w-4 h-4 text-slate-500 hover:text-rose-400" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed top-0 bottom-0 left-0 z-30 w-64">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
          <div className="relative z-10 w-64 max-w-xs">{navContent}</div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
