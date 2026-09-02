import React from "react";
import { FiCheckCircle, FiAlertCircle, FiClock, FiRefreshCw, FiXCircle } from "react-icons/fi";

export function StatusBadge({ status }) {
  const normalized = (status || "").toUpperCase();

  switch (normalized) {
    case "COMPLETED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <FiCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          Completed
        </span>
      );
    case "PROCESSING":
    case "RUNNING":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <FiRefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
          Processing
        </span>
      );
    case "QUEUED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <FiClock className="w-3.5 h-3.5 text-amber-400" />
          Queued
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <FiAlertCircle className="w-3.5 h-3.5 text-rose-400" />
          Failed
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
          <FiXCircle className="w-3.5 h-3.5 text-slate-400" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
          {status || "Unknown"}
        </span>
      );
  }
}

export default StatusBadge;
