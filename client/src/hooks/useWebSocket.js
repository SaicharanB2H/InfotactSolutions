import { useState, useEffect, useRef } from "react";
import { JobWebSocket } from "../services/websocket";

export function useWebSocket(jobId) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState("QUEUED");
  const [progress, setProgress] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);
  const [failedRows, setFailedRows] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [rowsPerSecond, setRowsPerSecond] = useState(0);
  const [error, setError] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    // Reset state
    setIsConnected(false);
    setStatus("QUEUED");
    setProgress(0);
    setProcessedRows(0);
    setFailedRows(0);
    setTotalRows(0);
    setRowsPerSecond(0);
    setError(null);
    setIsCompleted(false);
    setIsFailed(false);

    const socket = new JobWebSocket(jobId, {
      onConnect: () => {
        setIsConnected(true);
      },
      onMessage: (data) => {
        if (!data) return;

        if (data.status) setStatus(data.status);

        if (data.type === "started") {
          setStatus("PROCESSING");
        } else if (data.type === "progress") {
          if (data.progress !== undefined) {
            setProgress(data.progress);
            if (data.progress >= 100) {
              setStatus("COMPLETED");
              setIsCompleted(true);
            } else if (data.progress > 0) {
              setStatus("PROCESSING");
            }
          }
          if (data.processedRows !== undefined) setProcessedRows(data.processedRows);
          if (data.failedRows !== undefined) setFailedRows(data.failedRows);
          if (data.rowsPerSecond !== undefined) setRowsPerSecond(data.rowsPerSecond);
        } else if (data.type === "completed") {
          setStatus("COMPLETED");
          setProgress(100);
          if (data.processedRows !== undefined) setProcessedRows(data.processedRows);
          if (data.failedRows !== undefined) setFailedRows(data.failedRows);
          if (data.totalRows !== undefined) setTotalRows(data.totalRows);
          if (data.rowsPerSecond !== undefined) setRowsPerSecond(data.rowsPerSecond);
          setIsCompleted(true);
        } else if (data.type === "error") {
          setStatus("FAILED");
          setError(data.message || "Pipeline processing failed");
          setIsFailed(true);
        } else if (data.type === "cancelled") {
          setStatus("CANCELLED");
          setIsFailed(true);
        }
      },
      onError: () => {
        setIsConnected(false);
      },
      onClose: () => {
        setIsConnected(false);
      },
    });

    socketRef.current = socket;
    socket.connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [jobId]);

  return {
    isConnected,
    status,
    progress,
    processedRows,
    failedRows,
    totalRows,
    rowsPerSecond,
    error,
    isCompleted,
    isFailed,
  };
}
