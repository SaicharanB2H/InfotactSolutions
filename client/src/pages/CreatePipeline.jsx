import React, { useState } from "react";
import Layout from "../components/layout/Layout";
import VirtualizedTable from "../components/preview/VirtualizedTable";
import ColumnMapper from "../components/mapping/ColumnMapper";
import TransformBuilder from "../components/transformation/TransformBuilder";
import { previewCsv } from "../services/previewService";
import { createPipeline } from "../services/pipelineService";
import { uploadFile } from "../services/uploadService";
import { startJob } from "../services/jobService";
import { useNavigate } from "react-router-dom";
import {
  FiUploadCloud,
  FiEye,
  FiLayers,
  FiSliders,
  FiDatabase,
  FiCheckCircle,
  FiPlay,
  FiArrowRight,
  FiArrowLeft,
  FiAlertCircle,
  FiFileText
} from "react-icons/fi";

const WIZARD_STEPS = [
  { id: 1, name: "Upload", icon: FiUploadCloud },
  { id: 2, name: "Preview", icon: FiEye },
  { id: 3, name: "Mapping", icon: FiLayers },
  { id: 4, name: "Transform", icon: FiSliders },
  { id: 5, name: "Destination", icon: FiDatabase },
  { id: 6, name: "Review", icon: FiCheckCircle },
  { id: 7, name: "Process", icon: FiPlay },
];

export function CreatePipeline() {
  const [currentStep, setCurrentStep] = useState(1);

  // Pipeline configuration state
  const [pipelineName, setPipelineName] = useState("");
  const [file, setFile] = useState(null);
  const [previewColumns, setPreviewColumns] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [transformations, setTransformations] = useState([]);
  const [destinationCollection, setDestinationCollection] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // File selection & preview triggering
  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");

    if (!pipelineName) {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
      setPipelineName(`${baseName.toUpperCase()} Pipeline`);
    }

    if (!destinationCollection) {
      const cleanCol = selectedFile.name
        .replace(/\.[^/.]+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_");
      setDestinationCollection(`import_${cleanCol}`);
    }

    try {
      setLoading(true);
      const data = await previewCsv(selectedFile);

      if (data?.success) {
        const cols = data.columns || [];
        const rows = data.rows || [];
        setPreviewColumns(cols);
        setPreviewRows(rows);

        // Default auto-mapping
        const autoMap = {};
        cols.forEach((col) => {
          autoMap[col] = col.toLowerCase().replace(/[^a-z0-9]/g, "_");
        });
        setMapping(autoMap);
      }
    } catch (err) {
      console.error("CSV preview error:", err);
      setError(err.response?.data?.error?.message || "Failed to parse preview data from file.");
    } finally {
      setLoading(false);
    }
  };

  // Launch Pipeline Execution
  const handleStartPipeline = async () => {
    if (!file) {
      setError("Please select a file to process.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // 1. Format mappings for backend
      const mappedArray = Object.entries(mapping).map(([src, dst]) => ({
        source: src,
        destination: dst || src,
      }));

      // 2. Create pipeline definition
      const pipelinePayload = {
        name: pipelineName || `Pipeline ${Date.now()}`,
        destinationCollection: destinationCollection || `import_${Date.now()}`,
        mapping: mapping,
        mappings: mappedArray,
        transformations: transformations,
        validationRules: {},
      };

      const createdPipe = await createPipeline(pipelinePayload);
      const pipelineId = createdPipe?.data?._id || createdPipe?._id || createdPipe?.id;

      // 3. Upload dataset attached to pipeline
      const uploadRes = await uploadFile(file, pipelineId);
      const jobId = uploadRes?.jobId;

      if (!jobId) {
        throw new Error("Failed to create upload job ID.");
      }

      // 4. Start execution job
      await startJob(jobId, { pipelineId });

      // 5. Navigate to Live Processing Stream page
      navigate(`/processing/${jobId}`);
    } catch (err) {
      console.error("Pipeline start error:", err);
      setError(err.response?.data?.error?.message || err.message || "Failed to start ETL pipeline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Wizard Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Create ETL Pipeline</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure visual mapping, streaming transformations, and ingestion destination.
          </p>
        </div>

        {/* Wizard Progress Steps Bar */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px]">
            {WIZARD_STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isPassed = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center gap-2">
                  <div
                    onClick={() => {
                      if (isPassed || (step.id <= 6 && file)) setCurrentStep(step.id);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                        : isPassed
                        ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                        : "bg-slate-950 text-slate-500 border border-slate-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>
                      0{step.id} {step.name}
                    </span>
                  </div>
                  {step.id < 7 && <div className="h-0.5 w-6 bg-slate-800" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <FiAlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step Contents */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          {/* STEP 1: UPLOAD */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-100">Step 1: Select & Upload Dataset</h3>
                <p className="text-xs text-slate-400">Choose a CSV or JSON file to parse schema and start mapping.</p>
              </div>

              {/* Drag & Drop Area */}
              <div className="p-10 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl bg-slate-950/60 text-center transition-all">
                <input
                  type="file"
                  accept=".csv,.json,.ndjson"
                  id="file-upload-input"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                <label htmlFor="file-upload-input" className="cursor-pointer block space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                    <FiUploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-indigo-400">Click to browse</span>{" "}
                    <span className="text-sm text-slate-400">or drop CSV dataset file here</span>
                  </div>
                  <p className="text-xs text-slate-500">Supports CSV, JSON, NDJSON up to 10GB streaming upload</p>
                </label>
              </div>

              {/* Selected File Details */}
              {file && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FiFileText className="w-6 h-6 text-indigo-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{file.name}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB • {previewColumns.length} columns detected
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    Ready for Preview
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Step 2: Virtualized Data Preview</h3>
                <p className="text-xs text-slate-400">
                  Inspect the first {previewRows.length} virtualized rows using memory-safe react-window.
                </p>
              </div>
              <VirtualizedTable columns={previewColumns} rows={previewRows} />
            </div>
          )}

          {/* STEP 3: MAPPING */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Step 3: Column Field Mapping</h3>
                <p className="text-xs text-slate-400">Map dataset CSV columns to target MongoDB document fields.</p>
              </div>
              <ColumnMapper sourceColumns={previewColumns} mapping={mapping} onChange={setMapping} />
            </div>
          )}

          {/* STEP 4: TRANSFORM */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Step 4: Data Transformation Builder</h3>
                <p className="text-xs text-slate-400">
                  Configure string transformations executed inside isolated backend sandboxes.
                </p>
              </div>
              <TransformBuilder
                sourceColumns={previewColumns}
                transformations={transformations}
                onChange={setTransformations}
              />
            </div>
          )}

          {/* STEP 5: DESTINATION */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-100">Step 5: Target Destination</h3>
                <p className="text-xs text-slate-400">Specify pipeline metadata and MongoDB destination collection.</p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pipeline Name</label>
                  <input
                    type="text"
                    value={pipelineName}
                    onChange={(e) => setPipelineName(e.target.value)}
                    placeholder="e.g. Sales Ingestion Pipeline"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Destination Collection Name</label>
                  <input
                    type="text"
                    value={destinationCollection}
                    onChange={(e) => setDestinationCollection(e.target.value)}
                    placeholder="e.g. sales_records"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono text-indigo-300 outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Documents will be bulk-inserted using MongoBulkStream.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6 & 7: REVIEW & PROCESS */}
          {(currentStep === 6 || currentStep === 7) && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-100">Step 6: Review Pipeline Configuration</h3>
                <p className="text-xs text-slate-400">Verify dataset details before triggering high-throughput ETL run.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400">Dataset File</span>
                  <p className="text-sm font-bold text-slate-200">{file?.name || "No file selected"}</p>
                  <p className="text-xs text-slate-400 font-mono">
                    {previewColumns.length} Columns • {previewRows.length} Preview Rows
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs text-slate-400">Destination Collection</span>
                  <p className="text-sm font-bold font-mono text-indigo-400">
                    {destinationCollection || "default"}
                  </p>
                  <p className="text-xs text-slate-400">{Object.keys(mapping).length} Mapped Fields</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <button
              type="button"
              disabled={currentStep === 1 || loading}
              onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 1))}
              className="flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
            >
              <FiArrowLeft /> Back
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                disabled={!file || loading}
                onClick={() => setCurrentStep((prev) => Math.min(prev + 1, 6))}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40 cursor-pointer"
              >
                <span>Continue Step 0{currentStep + 1}</span> <FiArrowRight />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleStartPipeline}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <FiPlay className="w-4 h-4" />
                <span>{loading ? "Initializing Pipeline..." : "Start Pipeline Execution"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default CreatePipeline;
