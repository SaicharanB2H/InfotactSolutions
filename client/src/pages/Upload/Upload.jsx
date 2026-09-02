import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { FixedSizeList } from "react-window";
import Layout from "../../components/layout/Layout";
import { uploadFile } from "../../services/uploadService";
import { createPipeline } from "../../services/pipelineService";
import { startJob } from "../../services/jobService";
import { previewCsv } from "../../services/previewService";
import { useNavigate } from "react-router-dom";
import {
  FiUploadCloud,
  FiFileText,
  FiSliders,
  FiDatabase,
  FiPlay,
  FiCheckCircle,
  FiAlertCircle,
  FiZap,
  FiTrash2
} from "react-icons/fi";

export function Upload() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // State
  const [file, setFile] = useState(null);
  const [pipelineName, setPipelineName] = useState("");
  const [destinationCollection, setDestinationCollection] = useState("");
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Transformation Rules State
  const [transformRules, setTransformRules] = useState({
    trim: true,
    uppercase: false,
    lowercase: false,
    removeEmpty: false,
  });

  const handleTransformRuleChange = (rule) => {
    setTransformRules((prev) => ({
      ...prev,
      [rule]: !prev[rule],
    }));
  };

  // Process File Selection
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setSuccessMsg("");

    const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
    if (!pipelineName) {
      setPipelineName(`${baseName} Pipeline`);
    }
    if (!destinationCollection) {
      const cleanCol = baseName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      setDestinationCollection(`import_${cleanCol}`);
    }

    // Parse CSV preview locally or via API
    setLoading(true);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      preview: 1000,
      complete: (results) => {
        setLoading(false);
        if (results.meta && results.meta.fields) {
          setColumns(results.meta.fields);
          setRows(results.data || []);
          setSuccessMsg(`Parsed ${results.data.length} preview rows successfully.`);
        }
      },
      error: (err) => {
        setLoading(false);
        console.error("PapaParse error:", err);
        // Fallback to preview service
        previewCsv(selectedFile)
          .then((res) => {
            if (res?.success) {
              setColumns(res.columns || []);
              setRows(res.rows || []);
            }
          })
          .catch((e) => setError("Failed to parse CSV file."));
      },
    });
  };

  // Drag & Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Build Transformations Array for Backend
  const getSelectedTransformations = () => {
    const list = [];
    if (transformRules.trim) {
      columns.forEach((col) => {
        list.push({ sourceField: col, targetField: col, code: "return String(value).trim();" });
      });
    }
    if (transformRules.uppercase) {
      columns.forEach((col) => {
        list.push({ sourceField: col, targetField: col, code: "return String(value).toUpperCase();" });
      });
    }
    if (transformRules.lowercase) {
      columns.forEach((col) => {
        list.push({ sourceField: col, targetField: col, code: "return String(value).toLowerCase();" });
      });
    }
    return list;
  };

  // Trigger Upload & Job Processing
  const handleStartETL = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    const colName = destinationCollection || `import_${Date.now()}`;
    const pipeName = pipelineName || `CSV Pipeline - ${file.name}`;

    try {
      setLoading(true);
      setError("");

      // Default auto-mapping object
      const mappingObj = {};
      columns.forEach((c) => {
        mappingObj[c] = c.toLowerCase().replace(/[^a-z0-9]/g, "_");
      });

      // 1. Create pipeline definition with required destinationCollection & name
      const pipelinePayload = {
        name: pipeName,
        destinationCollection: colName,
        sourceFormat: file.name.endsWith(".json") ? "JSON" : "CSV",
        mapping: mappingObj,
        transformations: getSelectedTransformations(),
        validationRules: {},
      };

      const pipeRes = await createPipeline(pipelinePayload);
      const pipelineId = pipeRes?.data?._id || pipeRes?._id || pipeRes?.id;

      if (!pipelineId) {
        throw new Error("Pipeline creation returned invalid ID.");
      }

      // 2. Upload file attached to pipeline ID
      const uploadRes = await uploadFile(file, pipelineId);
      const jobId = uploadRes?.jobId;

      if (!jobId) {
        throw new Error("Upload did not return a valid jobId.");
      }

      // 3. Start execution job
      await startJob(jobId, { pipelineId });

      // 4. Redirect to Live Processing Stream Monitor
      navigate(`/processing/${jobId}`);
    } catch (err) {
      console.error("ETL Start Error:", err);
      setError(
        err.response?.data?.error?.message || err.message || "Failed to launch dataset processing."
      );
    } finally {
      setLoading(false);
    }
  };

  // Virtualized Row Renderer
  const VirtualRow = ({ index, style }) => {
    const rowData = rows[index] || {};
    const isEven = index % 2 === 0;

    return (
      <div
        style={style}
        className={`flex items-center text-xs font-mono border-b border-slate-800/60 ${
          isEven ? "bg-slate-950/40" : "bg-slate-900/30"
        } hover:bg-indigo-500/10 transition-colors`}
      >
        <div className="w-12 flex-shrink-0 px-3 py-2 text-slate-500 text-right font-sans font-semibold border-r border-slate-800/40">
          {index + 1}
        </div>
        {columns.map((col) => (
          <div
            key={col}
            className="w-48 flex-shrink-0 px-3 py-2 truncate text-slate-300 border-r border-slate-800/30"
            title={String(rowData[col] ?? "")}
          >
            {rowData[col] === undefined || rowData[col] === null || rowData[col] === "" ? (
              <span className="text-slate-600 italic text-[11px]">&lt;null&gt;</span>
            ) : (
              String(rowData[col])
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Quick Dataset Upload</h1>
            <p className="text-xs text-slate-400 mt-1">
              Upload CSV or JSON files for high-speed streaming ingestion into MongoDB.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <FiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main Upload Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-10 border-2 border-dashed rounded-2xl text-center transition-all ${
              isDragging
                ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                : "border-slate-800 hover:border-indigo-500/40 bg-slate-950/60"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.json,.ndjson"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer space-y-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                <FiUploadCloud className="w-7 h-7" />
              </div>
              <div>
                <span className="text-sm font-semibold text-indigo-400">Click to choose a file</span>{" "}
                <span className="text-sm text-slate-400">or drag & drop your dataset here</span>
              </div>
              <p className="text-xs text-slate-500">Supports CSV, JSON, NDJSON up to 10GB streaming upload</p>
            </div>
          </div>

          {/* Config Controls if file is selected */}
          {file && (
            <div className="space-y-6 border-t border-slate-800 pt-6">
              {/* File Info Banner */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FiFileText className="w-6 h-6 text-indigo-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{file.name}</p>
                    <p className="text-xs text-slate-400 font-mono">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • {columns.length} Columns • {rows.length} Preview Rows
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setColumns([]);
                    setRows([]);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  title="Remove File"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Destination & Name Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pipeline Name</label>
                  <input
                    type="text"
                    value={pipelineName}
                    onChange={(e) => setPipelineName(e.target.value)}
                    placeholder="e.g. User Import Pipeline"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Destination Collection</label>
                  <input
                    type="text"
                    value={destinationCollection}
                    onChange={(e) => setDestinationCollection(e.target.value)}
                    placeholder="e.g. import_users"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs font-mono text-indigo-300 outline-none"
                  />
                </div>
              </div>

              {/* Transformation Checkboxes */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FiSliders className="text-indigo-400" /> Pre-Ingestion Data Cleanup Rules
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {Object.entries(transformRules).map(([ruleKey, enabled]) => (
                    <label
                      key={ruleKey}
                      className="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => handleTransformRuleChange(ruleKey)}
                        className="w-4 h-4 accent-indigo-500 rounded"
                      />
                      <span className="text-slate-200 capitalize font-medium">{ruleKey}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Start Trigger */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleStartETL}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <FiPlay className="w-4 h-4" />
                  <span>{loading ? "Initializing Processing Stream..." : "Start ETL Processing Stream"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Data Preview Table */}
        {columns.length > 0 && (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">Virtualized Dataset Preview ({rows.length} rows)</h3>

            <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
              <div className="overflow-x-auto border-b border-slate-800 bg-slate-900/80">
                <div
                  style={{ minWidth: 48 + columns.length * 192 }}
                  className="flex items-center text-xs font-semibold text-slate-300 py-2.5"
                >
                  <div className="w-12 flex-shrink-0 px-3 text-right text-slate-500 border-r border-slate-800">
                    #
                  </div>
                  {columns.map((col) => (
                    <div key={col} className="w-48 flex-shrink-0 px-3 truncate text-indigo-400 border-r border-slate-800/60">
                      {col}
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <div style={{ width: Math.max(48 + columns.length * 192, 600) }}>
                  <FixedSizeList
                    height={400}
                    itemCount={rows.length}
                    itemSize={36}
                    width={48 + columns.length * 192}
                  >
                    {VirtualRow}
                  </FixedSizeList>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Upload;