import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { getPipelineById } from "../services/pipelineService";
import StatusBadge from "../components/common/StatusBadge";
import SkeletonLoader from "../components/common/SkeletonLoader";
import {
  FiArrowLeft,
  FiLayers,
  FiDatabase,
  FiSliders,
  FiClock,
  FiAlertCircle
} from "react-icons/fi";

export function PipelineDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getPipelineById(id)
        .then((res) => {
          if (res?.success && res?.data) {
            setPipeline(res.data);
          } else if (res?.data) {
            setPipeline(res.data);
          } else if (res) {
            setPipeline(res);
          }
        })
        .catch((err) => {
          console.error("Error fetching pipeline details:", err);
          setError(err.response?.data?.error?.message || err.message || "Failed to load pipeline definition.");
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <SkeletonLoader rows={4} />
        </div>
      </Layout>
    );
  }

  if (error || !pipeline) {
    return (
      <Layout>
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <FiAlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-100">Pipeline Not Found</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">{error || "Requested pipeline definition missing."}</p>
          <button
            onClick={() => navigate("/pipelines")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer"
          >
            Back to Catalog
          </button>
        </div>
      </Layout>
    );
  }

  // Parse mappings safely without rendering objects directly
  const getMappingEntries = () => {
    if (!pipeline) return [];
    if (pipeline.mapping && typeof pipeline.mapping === "object") {
      if (pipeline.mapping instanceof Map) {
        return Array.from(pipeline.mapping.entries());
      }
      return Object.entries(pipeline.mapping);
    }
    if (Array.isArray(pipeline.mappings)) {
      return pipeline.mappings.map((m) => [
        String(m.source || m.sourceField || ""),
        String(m.destination || m.targetField || "")
      ]);
    }
    return [];
  };

  // Parse transformations safely
  const getTransformDisplay = (rule) => {
    if (typeof rule === "string") {
      return { col: "ALL", type: rule, code: "" };
    }
    if (typeof rule === "object" && rule !== null) {
      return {
        col: String(rule.column || rule.sourceField || "FIELD"),
        type: String(rule.type || rule.targetField || "TRANSFORM"),
        code: rule.code ? String(rule.code) : rule.param ? `Param: ${rule.param}` : ""
      };
    }
    return { col: "FIELD", type: "TRANSFORM", code: "" };
  };

  const mappingEntries = getMappingEntries();
  const rawTransforms = Array.isArray(pipeline.transformations) ? pipeline.transformations : [];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <button
              onClick={() => navigate("/pipelines")}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors cursor-pointer mb-2"
            >
              <FiArrowLeft /> Back to Pipelines
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
                {String(pipeline.name || "Pipeline Inspection")}
              </h1>
              <StatusBadge status={String(pipeline.status || "CREATED")} />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">Pipeline ID: {String(pipeline._id || pipeline.id || id)}</p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Destination Collection</span>
            <span className="text-lg font-bold font-mono text-indigo-400">
              {String(pipeline.destinationCollection || "default_collection")}
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Mapped Fields</span>
            <span className="text-lg font-bold font-mono text-slate-100">{mappingEntries.length} Columns</span>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">Transform Rules</span>
            <span className="text-lg font-bold font-mono text-cyan-300">
              {rawTransforms.length} Rules Configured
            </span>
          </div>
        </div>

        {/* Field Mappings Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FiLayers className="text-indigo-400" /> Source to Destination Field Mappings
          </h3>

          <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
            <div className="grid grid-cols-2 px-4 py-3 bg-slate-900/80 border-b border-slate-800 text-xs font-semibold text-slate-400">
              <div>Source CSV Column</div>
              <div>Destination MongoDB Field</div>
            </div>
            <div className="divide-y divide-slate-800/60 font-mono text-xs">
              {mappingEntries.length === 0 ? (
                <div className="p-4 text-center text-slate-500">No field mappings configured.</div>
              ) : (
                mappingEntries.map(([src, dst], idx) => (
                  <div key={idx} className="grid grid-cols-2 px-4 py-3 hover:bg-slate-900/30">
                    <span className="text-indigo-300">{String(src)}</span>
                    <span className="text-emerald-400">→ {String(dst)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Transformations Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FiSliders className="text-cyan-400" /> Configured Transformation Rules
          </h3>

          {rawTransforms.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No transformation rules configured for this pipeline.</p>
          ) : (
            <div className="space-y-2">
              {rawTransforms.map((rule, idx) => {
                const info = getTransformDisplay(rule);
                return (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-indigo-400 font-semibold">{info.col}</span>
                      <span className="uppercase text-slate-300 font-bold">{info.type}</span>
                    </div>
                    {info.code && <span className="font-mono text-cyan-300 truncate max-w-xs">{info.code}</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default PipelineDetails;
