import React, { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";
import { getAllPipelines, deletePipeline } from "../services/pipelineService";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import SkeletonLoader from "../components/common/SkeletonLoader";
import { useNavigate } from "react-router-dom";
import {
  FiLayers,
  FiSearch,
  FiFilter,
  FiPlus,
  FiEye,
  FiTrash2,
  FiRefreshCw
} from "react-icons/fi";

export function Pipelines() {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();

  const loadPipelines = async () => {
    try {
      setLoading(true);
      const res = await getAllPipelines();
      if (res?.success && Array.isArray(res?.data)) {
        setPipelines(res.data);
      } else if (Array.isArray(res)) {
        setPipelines(res);
      } else {
        setPipelines([]);
      }
    } catch (err) {
      console.error("Failed to fetch pipelines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipelines();
  }, []);

  const handleDeletePipeline = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this pipeline configuration?")) {
      try {
        await deletePipeline(id);
        setPipelines((prev) => prev.filter((p) => (p._id || p.id) !== id));
      } catch (err) {
        console.error("Failed to delete pipeline:", err);
      }
    }
  };

  // Filter & Search pipelines
  const filteredPipelines = pipelines.filter((p) => {
    const rawStatus = (p.status || "COMPLETED").toUpperCase();

    const matchStatus =
      filterStatus === "ALL"
        ? true
        : filterStatus === "RUNNING"
        ? rawStatus === "PROCESSING" || rawStatus === "RUNNING" || rawStatus === "QUEUED"
        : filterStatus === "COMPLETED"
        ? rawStatus === "COMPLETED" || rawStatus === "CREATED" || rawStatus === "ACTIVE"
        : rawStatus === filterStatus;

    const matchSearch =
      !searchQuery ||
      (p.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.destinationCollection || "").toLowerCase().includes(searchQuery.toLowerCase());

    return matchStatus && matchSearch;
  });

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Pipeline Catalog</h1>
            <p className="text-xs text-slate-400 mt-1">Manage and inspect all configured ETL data pipelines.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadPipelines}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Refresh"
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

        {/* Filter Controls Bar */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3.5 top-3 text-slate-500 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pipelines by name or collection..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-slate-200 outline-none"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {["ALL", "RUNNING", "COMPLETED", "FAILED"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  filterStatus === st
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Pipeline Table */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          {loading ? (
            <SkeletonLoader rows={5} />
          ) : filteredPipelines.length === 0 ? (
            <EmptyState
              title="No Pipelines Found"
              description={
                searchQuery
                  ? "No pipelines match your search query."
                  : filterStatus !== "ALL"
                  ? `No pipelines with status '${filterStatus}' found.`
                  : "No pipelines created yet. Launch your first pipeline wizard."
              }
              actionText={filterStatus !== "ALL" ? "Clear Status Filter" : "Create Pipeline"}
              onAction={() => (filterStatus !== "ALL" ? setFilterStatus("ALL") : navigate("/create-pipeline"))}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Pipeline Name</th>
                    <th className="py-3 px-4">Target Collection</th>
                    <th className="py-3 px-4">Mappings</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredPipelines.map((pipe) => {
                    const pipeId = pipe._id || pipe.id;
                    const mappingsCount = pipe.mappings?.length || Object.keys(pipe.mapping || {}).length;

                    return (
                      <tr
                        key={pipeId}
                        onClick={() => navigate(`/pipelines/${pipeId}`)}
                        className="hover:bg-slate-950/40 transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-bold text-slate-200">{pipe.name || "Untitled Pipeline"}</td>
                        <td className="py-3.5 px-4 font-mono text-indigo-300">
                          {pipe.destinationCollection || "default"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{mappingsCount} fields mapped</td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={pipe.status || "COMPLETED"} />
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {pipe.createdAt ? new Date(pipe.createdAt).toLocaleString() : "Recently"}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/pipelines/${pipeId}`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Inspect Details"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeletePipeline(pipeId, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete Pipeline"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Pipelines;
