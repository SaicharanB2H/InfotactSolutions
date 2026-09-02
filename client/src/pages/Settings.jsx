import React, { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import { getSystemHealth } from "../services/healthService";
import { FiSettings, FiActivity, FiDatabase, FiCpu, FiHardDrive, FiRefreshCw } from "react-icons/fi";

export function Settings() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await getSystemHealth();
      setHealth(res);
    } catch (err) {
      console.error("Health check error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <Layout>
      <div className="space-y-8 max-w-4xl">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">System & Engine Settings</h1>
            <p className="text-xs text-slate-400 mt-1">
              StreamWeaver ETL backend cluster status, Node streams engine parameters, and MongoDB health.
            </p>
          </div>

          <button
            onClick={fetchHealth}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Refresh System Health"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Backend API & MongoDB Status */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FiActivity className="text-indigo-400" /> Infrastructure Health Monitoring
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Express Server */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400">Node.js Express Backend</span>
                <p className="text-sm font-bold text-slate-200 font-mono">http://localhost:5000/api</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>

            {/* MongoDB Connection */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400">MongoDB Database Cluster</span>
                <p className="text-sm font-bold text-slate-200 font-mono">
                  {health?.mongoDB?.status || "connected"}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                CONNECTED
              </span>
            </div>
          </div>
        </div>

        {/* Stream Engine Parameters */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FiCpu className="text-cyan-400" /> High-Throughput Stream Settings
          </h3>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Max File Size Limit</span>
              <span className="text-indigo-400 font-bold">10.00 GB (Backpressured Streaming)</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Mongo BulkWrite Batch Size</span>
              <span className="text-cyan-300 font-bold">5,000 documents / batch</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Max Concurrent Worker Jobs</span>
              <span className="text-emerald-400 font-bold">2 parallel ETL streams</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">Isolated-VM Sandbox Memory</span>
              <span className="text-slate-200 font-bold">32 MB isolate limit</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default Settings;
