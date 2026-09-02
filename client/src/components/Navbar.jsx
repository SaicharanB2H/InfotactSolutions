import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getSystemHealth } from "../services/healthService";
import { FiMenu, FiCheckCircle, FiAlertCircle, FiPlus, FiUser, FiActivity } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";

const pageTitles = {
  "/dashboard": "Overview Dashboard",
  "/create-pipeline": "Create ETL Pipeline",
  "/upload": "Quick Dataset Upload",
  "/pipelines": "Pipeline Catalog",
  "/settings": "Engine Settings",
};

const Navbar = ({ onMenuClick }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [health, setHealth] = useState({ online: true, mongo: true });

  useEffect(() => {
    getSystemHealth()
      .then((res) => {
        setHealth({
          online: true,
          mongo: res?.mongoDB?.status === "connected" || true,
        });
      })
      .catch(() => {
        setHealth({ online: false, mongo: false });
      });
  }, []);

  const userName = user?.name || "Data Engineer";
  const userEmail = user?.email || "user@streamweaver.io";
  const initial = userName.charAt(0).toUpperCase();

  const currentTitle =
    pageTitles[location.pathname] ||
    (location.pathname.startsWith("/pipelines/")
      ? "Pipeline Details"
      : location.pathname.startsWith("/processing/")
      ? "Live Processing Stream"
      : "StreamWeaver");

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-lg"
          aria-label="Open sidebar"
        >
          <FiMenu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-100 tracking-tight">{currentTitle}</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* System Health Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span className="flex h-2 w-2 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                health.online ? "bg-emerald-400 opacity-75" : "bg-rose-400 opacity-75"
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                health.online ? "bg-emerald-500" : "bg-rose-500"
              }`}
            ></span>
          </span>
          <span className="font-medium text-slate-300">
            {health.online ? "API Active" : "Backend Offline"}
          </span>
        </div>

        {/* Quick New Pipeline Action */}
        <button
          onClick={() => navigate("/create-pipeline")}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <FiPlus className="w-4 h-4" />
          <span>New Pipeline</span>
        </button>

        {/* User Info */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="hidden lg:block text-right">
            <p className="text-xs font-semibold text-slate-200 leading-none">{userName}</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{userEmail}</p>
          </div>
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 text-slate-950 font-bold flex items-center justify-center text-sm shadow-sm">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
