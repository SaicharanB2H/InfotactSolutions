import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import LiveProgressView from "../components/processing/LiveProgressView";
import { useWebSocket } from "../hooks/useWebSocket";
import { cancelJob, getJobErrors, getJobStatus } from "../services/jobService";
import SkeletonLoader from "../components/common/SkeletonLoader";
import { FiDownload, FiAlertCircle, FiArrowLeft, FiRefreshCw } from "react-icons/fi";

export function Processing() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const wsMetrics = useWebSocket(jobId);

  const [jobInfo, setJobInfo] = useState(null);
  const [errorLogs, setErrorLogs] = useState([]);
  const [errorTotal, setErrorTotal] = useState(0);
  const [errorPage, setErrorPage] = useState(1);
  const [loadingErrors, setLoadingErrors] = useState(false);

  // Poll job status from API as backup sync
  const fetchStatus = async () => {
    if (!jobId) return;
    try {
      const res = await getJobStatus(jobId);
      if (res?.success && res?.data) {
        setJobInfo(res.data);
      }
    } catch (err) {
      console.error("Error fetching job status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId]);

  // Fetch failed rows if any exist
  const loadJobErrors = async (page = 1) => {
    if (!jobId) return;
    try {
      setLoadingErrors(true);
      const res = await getJobErrors(jobId, page, 50);
      if (res?.success && res?.data) {
        setErrorLogs(res.data.errors || []);
        setErrorTotal(res.data.total || 0);
        setErrorPage(res.data.page || 1);
      }
    } catch (err) {
      console.error("Failed to load job errors:", err);
    } finally {
      setLoadingErrors(false);
    }
  };

  const currentStatus =
    wsMetrics.status === "COMPLETED" || jobInfo?.status === "COMPLETED"
      ? "COMPLETED"
      : wsMetrics.status === "FAILED" || jobInfo?.status === "FAILED"
      ? "FAILED"
      : wsMetrics.status === "CANCELLED" || jobInfo?.status === "CANCELLED"
      ? "CANCELLED"
      : wsMetrics.status === "PROCESSING" || jobInfo?.status === "PROCESSING"
      ? "PROCESSING"
      : jobInfo?.status || wsMetrics.status || "QUEUED";

  const currentProgress =
    wsMetrics.progress > 0
      ? wsMetrics.progress
      : jobInfo?.progress !== undefined
      ? jobInfo.progress
      : currentStatus === "COMPLETED"
      ? 100
      : 0;

  const currentProcessedRows = wsMetrics.processedRows || jobInfo?.processedRows || 0;
  const currentFailedRows = wsMetrics.failedRows || jobInfo?.failedRows || 0;
  const currentRowsPerSecond = wsMetrics.rowsPerSecond || jobInfo?.rowsPerSecond || 0;

  useEffect(() => {
    if (currentFailedRows > 0 || currentStatus === "COMPLETED" || currentStatus === "FAILED") {
      loadJobErrors(1);
    }
  }, [currentFailedRows, currentStatus]);

  // Cancel processing job
  const handleCancelJob = async () => {
    try {
      await cancelJob(jobId);
      fetchStatus();
    } catch (err) {
      console.error("Cancel job error:", err);
    }
  };

  // Export failed records as JSON
  const handleDownloadFailedRows = () => {
    if (!errorLogs || errorLogs.length === 0) return;
    const blob = new Blob([JSON.stringify(errorLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `failed_rows_job_${jobId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Top Breadcrumb Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <FiArrowLeft /> Back to Dashboard
          </button>

          <button
            onClick={() => {
              fetchStatus();
              loadJobErrors(errorPage);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <FiRefreshCw className={`w-3.5 h-3.5 ${loadingErrors ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Live WebSocket Progress Monitor */}
        <LiveProgressView
          jobId={jobId}
          status={currentStatus}
          progress={currentProgress}
          processedRows={currentProcessedRows}
          failedRows={currentFailedRows}
          rowsPerSecond={currentRowsPerSecond}
          isConnected={wsMetrics.isConnected}
          error={wsMetrics.error || jobInfo?.error}
          onCancel={handleCancelJob}
        />

        {/* Failed Rows / Exception Inspector */}
        {(currentFailedRows > 0 || errorTotal > 0) && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                  <FiAlertCircle /> Failed Records Log ({errorTotal.toLocaleString()})
                </h3>
                <p className="text-xs text-slate-400">Rows that failed schema validation or transformation constraints.</p>
              </div>

              <button
                onClick={handleDownloadFailedRows}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-200 rounded-xl transition-all cursor-pointer"
              >
                <FiDownload className="w-4 h-4 text-indigo-400" /> Export Failed Rows (JSON)
              </button>
            </div>

            {loadingErrors ? (
              <SkeletonLoader rows={3} />
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold bg-slate-900/60">
                      <th className="py-3 px-4">Row #</th>
                      <th className="py-3 px-4">Error Code / Reason</th>
                      <th className="py-3 px-4">Raw Row Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {errorLogs.map((errItem, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/30">
                        <td className="py-3 px-4 text-slate-400 font-bold">{errItem.rowNumber || idx + 1}</td>
                        <td className="py-3 px-4 text-rose-400 font-semibold">{errItem.reason || "Validation Error"}</td>
                        <td className="py-3 px-4 text-slate-300 max-w-md truncate">
                          {typeof errItem.rawData === "object"
                            ? JSON.stringify(errItem.rawData)
                            : String(errItem.rawData || "")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Processing;
