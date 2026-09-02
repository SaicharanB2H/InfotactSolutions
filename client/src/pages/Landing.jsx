import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  FiZap,
  FiArrowRight,
  FiDatabase,
  FiGrid,
  FiCheckCircle,
  FiCpu,
  FiLayers,
  FiShield,
  FiActivity,
  FiUploadCloud
} from "react-icons/fi";

export function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: FiUploadCloud,
      title: "Massive File Processing",
      description: "Process multi-gigabyte CSV and JSON datasets with zero browser crashes using Node.js backpressured streams.",
    },
    {
      icon: FiGrid,
      title: "Virtualized Data Preview",
      description: "Inspect the first 1,000+ dataset rows instantly with high-performance virtualized scrolling using react-window.",
    },
    {
      icon: FiLayers,
      title: "Visual Column Mapping",
      description: "Map source CSV header columns to target MongoDB fields with auto-mapping heuristics and field validation.",
    },
    {
      icon: FiCpu,
      title: "Custom Transformations",
      description: "Apply string casing, trimming, prefixing, and custom JS sandbox transformations before database ingestion.",
    },
    {
      icon: FiActivity,
      title: "Real-Time WebSocket Progress",
      description: "Track live ingestion speed (rows/sec), processed counts, and progress percentages updated via WebSockets.",
    },
    {
      icon: FiShield,
      title: "Detailed Error Tracking",
      description: "Capture failed rows, validation exceptions, and downloadable error reports without halting valid pipeline rows.",
    },
  ];

  const steps = [
    { num: "01", name: "Upload", desc: "Drag & drop CSV/JSON files" },
    { num: "02", name: "Preview", desc: "Inspect virtualized data rows" },
    { num: "03", name: "Map", desc: "Match fields visually" },
    { num: "04", name: "Transform", desc: "Apply cleanup rules" },
    { num: "05", name: "Process", desc: "Stream into MongoDB" },
    { num: "06", name: "Monitor", desc: "Track live WebSocket metrics" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <FiZap className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">StreamWeaver</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-slate-200 transition-colors">
              Features
            </a>
            <a href="#workflow" className="hover:text-slate-200 transition-colors">
              How It Works
            </a>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
              >
                Go to Dashboard <FiArrowRight />
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-slate-300 hover:text-white font-medium text-xs transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-slate-800/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950" />
        <div className="max-w-5xl mx-auto px-6 relative text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            High-Throughput No-Code ETL Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">
            Build Powerful ETL Pipelines{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-200 bg-clip-text text-transparent">
              Without Writing Complex Code
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed mb-8">
            Transform massive datasets without writing complex code. Upload, transform, map, and process massive datasets with a memory-safe streaming architecture.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate(isAuthenticated ? "/create-pipeline" : "/register")}
              className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Start Building Pipelines <FiArrowRight />
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm rounded-xl transition-all cursor-pointer"
            >
              View Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section id="features" className="py-24 bg-slate-950 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-3">
              Engineered for Enterprise Datasets
            </h2>
            <p className="text-slate-400 text-sm">
              StreamWeaver leverages Node.js streaming pipelines and MongoDB bulk operations for memory-bounded execution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24 bg-slate-900/40 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-3">How StreamWeaver Works</h2>
            <p className="text-slate-400 text-sm">From raw CSV/JSON uploads to live ingestion monitoring in 6 simple steps.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {steps.map((s) => (
              <div key={s.num} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-xs font-mono font-bold text-indigo-400">{s.num}</span>
                <h4 className="text-sm font-bold text-white mt-1">{s.name}</h4>
                <p className="text-[11px] text-slate-500 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-12 bg-slate-950 text-slate-500 text-xs text-center">
        <p className="font-semibold text-slate-400 mb-1">StreamWeaver ETL Platform</p>
        <p>Transform massive datasets without writing complex code.</p>
      </footer>
    </div>
  );
}

export default Landing;
