import React, { useEffect, useState } from "react";
import Layout from "../../components/layout/Layout";
import { getAllPipelines } from "../../services/pipelineService";
import StatusBadge from "../../components/common/StatusBadge";
import EmptyState from "../../components/common/EmptyState";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import { useNavigate } from "react-router-dom";
import {
  FiPlus,
  FiLayers,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowRight,
  FiEye,
  FiZap
} from "react-icons/fi";

export function Dashboard() {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAllPipelines();
      if (res?.success && Array.isArray(res?.data)) {
        setPipelines(res.data);
      } else if (Array.isArray(res)) {
        setPipelines(res);
      } else {
        setPipelines([]);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Compute metrics exclusively from real backend objects
  const totalPipelines = pipelines.length;
  const runningCount = pipelines.filter(
    (p) => p.status === "PROCESSING" || p.status === "RUNNING" || p.status === "QUEUED"
  ).length;
  const completedCount = pipelines.filter((p) => p.status === "COMPLETED").length;
  const failedCount = pipelines.filter((p) => p.status === "FAILED").length;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">ETL Pipelines Overview</h1>
            <p className="text-xs text-slate-400 mt-1">
              Monitor, launch, and inspect high-throughput data processing jobs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboardData}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => navigate("/create-pipeline")}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <FiPlus className="w-4 h-4" />
              <span>Create New Pipeline</span>
            </button>
          </div>
        </div>

        {/* Real Backend Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Pipelines */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Total Pipelines</span>
              <FiLayers className="text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-slate-100">{totalPipelines}</div>
            <p className="text-[11px] text-slate-500 mt-1">Configured pipeline definitions</p>
          </div>

          {/* Running Pipelines */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Running / Queued</span>
              <FiRefreshCw className="text-indigo-400 animate-spin" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-indigo-400">{runningCount}</div>
            <p className="text-[11px] text-indigo-400/80 mt-1">Active stream execution</p>
          </div>

          {/* Completed Pipelines */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Completed</span>
              <FiCheckCircle className="text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-emerald-400">{completedCount}</div>
            <p className="text-[11px] text-emerald-400/80 mt-1">Ingested into MongoDB</p>
          </div>

          {/* Failed Pipelines */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Failed</span>
              <FiAlertCircle className="text-rose-400" />
            </div>
            <div className="text-3xl font-extrabold font-mono text-rose-400">{failedCount}</div>
            <p className="text-[11px] text-rose-400/80 mt-1">Execution errors logged</p>
          </div>
        </div>

        {/* Quick Action Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-slate-900 to-indigo-950/30 border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <FiZap className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Ready to ingest a new dataset?</h3>
              <p className="text-xs text-slate-400">
                Upload CSV or JSON files and configure visual column mappings in 7 simple steps.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/create-pipeline")}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer self-start md:self-auto"
          >
            <span>Launch Pipeline Wizard</span> <FiArrowRight />
          </button>
        </div>

        {/* Recent Pipelines Table */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-100">Recent Pipelines</h3>
              <p className="text-xs text-slate-400">Latest pipeline configurations and job execution status</p>
            </div>
            <button
              onClick={() => navigate("/pipelines")}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View All</span> <FiArrowRight />
            </button>
          </div>

          {loading ? (
            <SkeletonLoader rows={4} />
          ) : pipelines.length === 0 ? (
            <EmptyState
              title="No Pipelines Created Yet"
              description="Start by creating your first ETL pipeline to upload and transform datasets."
              actionText="Create ETL Pipeline"
              onAction={() => navigate("/create-pipeline")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Pipeline Name</th>
                    <th className="py-3 px-4">Target Collection</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {pipelines.slice(0, 10).map((pipe) => (
                    <tr key={pipe._id || pipe.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {pipe.name || "Untitled Pipeline"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-indigo-300">
                        {pipe.destinationCollection || "default_collection"}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={pipe.status || "CREATED"} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {pipe.createdAt ? new Date(pipe.createdAt).toLocaleDateString() : "Recently"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate(`/pipelines/${pipe._id || pipe.id}`)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <FiEye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Dashboard;