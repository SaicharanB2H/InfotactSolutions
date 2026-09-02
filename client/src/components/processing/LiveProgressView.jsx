import React, { useState, useEffect } from "react";
import StatusBadge from "../common/StatusBadge";
import {
  FiZap,
  FiDatabase,
  FiAlertTriangle,
  FiCheckCircle,
  FiXSquare,
  FiClock,
  FiActivity,
  FiWifi
} from "react-icons/fi";

export function LiveProgressView({
  jobId,
  status,
  progress = 0,
  processedRows = 0,
  failedRows = 0,
  rowsPerSecond = 0,
  isConnected = false,
  error = null,
  onCancel,
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Compute effective status to handle fast-executing small files smoothly
  const isCompletedState =
    status === "COMPLETED" ||
    progress >= 100 ||
    (processedRows > 0 && status !== "FAILED" && status !== "CANCELLED" && status !== "PROCESSING");

  const effectiveStatus = isCompletedState
    ? "COMPLETED"
    : status === "PROCESSING" || progress > 0
    ? "PROCESSING"
    : status || "QUEUED";

  useEffect(() => {
    if (effectiveStatus === "PROCESSING" || effectiveStatus === "QUEUED") {
      const timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [effectiveStatus]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Calculate processing steps
  const steps = [
    { label: "File Uploaded & Stream Created", done: true },
    { label: "CSV Schema Parsed & Validated", done: true },
    { label: "Column Mapping & Transformations Applied", done: true },
    {
      label: "MongoDB Bulk Ingestion Streaming",
      current: effectiveStatus === "PROCESSING",
      done: isCompletedState,
    },
    { label: "Pipeline Execution Finished", done: isCompletedState },
  ];

  const displayProgress = isCompletedState ? 100 : progress;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-slate-100 tracking-tight">ETL Processing Stream</h2>
              <StatusBadge status={effectiveStatus} />
            </div>
            <p className="text-xs text-slate-400 font-mono">Job ID: {jobId}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Socket Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs">
              <FiWifi className={`w-3.5 h-3.5 ${isConnected ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
              <span className="text-slate-300 font-medium">{isConnected ? "WebSocket Live" : "Connecting..."}</span>
            </div>

            {/* Cancel trigger */}
            {effectiveStatus === "PROCESSING" && onCancel && (
              <button
                onClick={onCancel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <FiXSquare className="w-4 h-4" /> Cancel Run
              </button>
            )}
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between items-baseline text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <FiActivity className="text-indigo-400" /> Overall Progress
            </span>
            <span className="text-indigo-300 font-mono text-base">{Math.round(displayProgress)}%</span>
          </div>

          <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 rounded-full transition-all duration-300 ease-out shadow-lg shadow-indigo-500/50"
              style={{ width: `${Math.min(Math.max(displayProgress, 2), 100)}%` }}
            />
          </div>
        </div>

        {/* Real-time Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Rows Processed */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Rows Processed</span>
              <FiDatabase className="text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100">
              {processedRows.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400 mt-1 inline-block">Ingested to MongoDB</span>
          </div>

          {/* Rows / Sec Speed */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Throughput</span>
              <FiZap className="text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-300">
              {Math.round(rowsPerSecond).toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1">r/s</span>
            </div>
            <span className="text-[10px] text-cyan-400 mt-1 inline-block">High-Speed Node Streams</span>
          </div>

          {/* Failed Rows */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Failed Records</span>
              <FiAlertTriangle className="text-amber-400" />
            </div>
            <div className={`text-2xl font-bold font-mono ${failedRows > 0 ? "text-rose-400" : "text-slate-300"}`}>
              {failedRows.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 inline-block">Validation exceptions</span>
          </div>

          {/* Elapsed Timer */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Elapsed Time</span>
              <FiClock className="text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-300">
              {formatTimer(elapsedSeconds)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 inline-block">Live execution duration</span>
          </div>
        </div>

        {/* Error message alert if any */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <FiAlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Execution Error</p>
              <p className="mt-0.5 text-rose-300/90">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Execution Timeline Phases */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Pipeline Processing Timeline</h3>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step.done
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : step.current
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 animate-pulse"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {step.done ? <FiCheckCircle className="w-4 h-4" /> : idx + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  step.done
                    ? "text-slate-200"
                    : step.current
                    ? "text-indigo-300 font-semibold"
                    : "text-slate-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LiveProgressView;
