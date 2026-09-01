import { useRef, useState } from "react";
import { FixedSizeList } from "react-window";

import { uploadFile } from "../../services/uploadService";
import { createPipeline } from "../../services/pipelineService";
import { previewCsv } from "../../services/previewService";

function Upload() {
  // ==========================================
  // WEBSOCKET
  // ==========================================
  const wsRef = useRef(null);

  const [jobId, setJobId] = useState(null);
  const [pipelineId, setPipelineId] = useState(null);

  const [wsProgress, setWsProgress] = useState(0);
  const [wsStatus, setWsStatus] = useState("");

  const [processedRows, setProcessedRows] = useState(0);
  const [failedRows, setFailedRows] = useState(0);

  // ==========================================
  // CSV PARSING / FILE
  // ==========================================
  const hasColumnsRef = useRef(false);
  const hasRowsRef = useRef(false);
  const hasParseErrorsRef = useRef(false);
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);

  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);

  const [isUploading, setIsUploading] = useState(false);

  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // ==========================================
  // FRONTEND TRANSFORMATION PROCESSING
  // ==========================================
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");

  // ==========================================
  // JOB STATUS
  // ==========================================
  const [jobStatus, setJobStatus] = useState("");
  const [jobError, setJobError] = useState("");

  // ==========================================
  // BULK INSERT
  // ==========================================
  const [bulkInsertLoading, setBulkInsertLoading] = useState(false);
  const [bulkInsertProgress, setBulkInsertProgress] = useState(0);
  const [bulkInsertStatus, setBulkInsertStatus] = useState("");
  const [bulkInsertError, setBulkInsertError] = useState("");
  const [bulkInsertSuccess, setBulkInsertSuccess] = useState(false);

  // ==========================================
  // TRANSFORMATION RULES
  // ==========================================
  const [transformRules, setTransformRules] = useState({
    trim: false,
    uppercase: false,
    lowercase: false,
    removeEmpty: false,
    removeDuplicates: false,
  });

  // ==========================================
  // SELECTED RULE COUNT
  // ==========================================
  const selectedRuleCount = Object.values(transformRules).filter(
    Boolean
  ).length;

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  // ==========================================
  // GET SELECTED TRANSFORMATIONS
  // ==========================================
  const getSelectedTransformations = () => {
    return Object.entries(transformRules)
      .filter(([_, enabled]) => enabled)
      .map(([rule]) => rule);
  };

  // ==========================================
  // TRANSFORMATION RULE CHANGE
  // ==========================================
  const handleTransformRuleChange = (rule) => {
    setTransformRules((previousRules) => ({
      ...previousRules,
      [rule]: !previousRules[rule],
    }));
  };

  // ==========================================
  // CREATE PIPELINE FOR UPLOAD
  // ==========================================
  const createPipelineForUpload = async () => {
    try {
      const selectedTransformations =
        getSelectedTransformations();

      const pipelineData = {
        name: `CSV Pipeline - ${file?.name || "Import"}`,

        mappings: columns.map((column) => ({
          source: column,
          destination: column,
        })),

        transformations: selectedTransformations,

        validationRules: [],
      };

      console.log(
        "Creating pipeline with transformations:",
        pipelineData
      );

      const data = await createPipeline(pipelineData);

      console.log("Pipeline created:", data);

      setPipelineId(data._id);

      return data._id;
    } catch (error) {
      console.error("Pipeline creation error:", error);

      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to create pipeline.";

      setError(message);

      return null;
    }
  };

  // ==========================================
  // TEST CREATE PIPELINE
  // ==========================================
  const testCreatePipeline = async () => {
    try {
      setError("");

      if (!columns.length) {
        setError("Please select and preview a CSV file first.");
        return;
      }

      const selectedTransformations =
        getSelectedTransformations();

      const pipelineData = {
        name: `Test Pipeline - ${file?.name || "CSV Import"}`,

        mappings: columns.map((column) => ({
          source: column,
          destination: column,
        })),

        transformations: selectedTransformations,

        validationRules: [],
      };

      console.log(
        "Sending pipeline data:",
        pipelineData
      );

      const data = await createPipeline(pipelineData);

      console.log(
        "Pipeline API response:",
        data
      );

      setPipelineId(data._id);

      setWsStatus("Pipeline created successfully.");
    } catch (error) {
      console.error(
        "Pipeline creation error:",
        error
      );

      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to create pipeline.";

      setError(message);
    }
  };

  // ==========================================
  // UPLOAD CSV TO BACKEND
  // ==========================================
  const uploadToBackend = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    try {
      setError("");
      setJobError("");

      setJobStatus("uploading");
      setWsStatus("Uploading file...");

      setWsProgress(0);
      setProcessedRows(0);
      setFailedRows(0);

      // ======================================
      // MAKE SURE PIPELINE EXISTS
      // ======================================
      let currentPipelineId = pipelineId;

      if (!currentPipelineId) {
        currentPipelineId =
          await createPipelineForUpload();

        if (!currentPipelineId) {
          setJobStatus("failed");
          setWsStatus(
            "Pipeline creation failed"
          );
          return;
        }
      }

      console.log(
        "Uploading CSV with pipeline:",
        currentPipelineId
      );

      // ======================================
      // UPLOAD CSV
      // ======================================
      const data = await uploadFile(
        file,
        currentPipelineId
      );

      console.log(
        "Upload API response:",
        data
      );

      // ======================================
      // SAVE IMPORT HISTORY
      // ======================================
      const existingImports = JSON.parse(
        localStorage.getItem(
          "streamweaver_imports"
        ) || "[]"
      );

      const newImport = {
        jobId: data.jobId,
        fileName:
          data.fileName || file.name,
        totalBytes:
          data.totalBytes || file.size,
        createdAt:
          new Date().toISOString(),
      };

      localStorage.setItem(
        "streamweaver_imports",
        JSON.stringify([
          newImport,
          ...existingImports,
        ])
      );

      console.log(
        "Import saved for history:",
        newImport
      );

      // ======================================
      // SET JOB
      // ======================================
      setJobId(data.jobId);
      setJobStatus("processing");
      setWsStatus("Processing started...");
      setWsProgress(0);

      // ======================================
      // CONNECT WEBSOCKET
      // ======================================
      connectWebSocket(data.jobId);
    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Failed to upload CSV file.";

      setJobStatus("failed");
      setJobError(message);
      setError(message);
      setWsStatus("Upload failed");
    }
  };

  // ==========================================
  // WEBSOCKET CONNECTION
  // ==========================================
  const connectWebSocket = (jobId) => {
    const ws = new WebSocket(
      `ws://localhost:5000/ws/jobs/${jobId}`
    );

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");

      setWsStatus(
        "Connected to processing job"
      );
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(
          event.data
        );

        console.log(
          "WebSocket message:",
          data
        );

        // ==================================
        // PROGRESS EVENT
        // ==================================
        if (data.event === "progress") {
          const status =
            data.status ?? "processing";

          setWsProgress(
            data.percentage ?? 0
          );

          setWsStatus(status);

          setProcessedRows(
            data.rowsProcessed ?? 0
          );

          setFailedRows(
            data.rowsFailed ?? 0
          );

          setJobStatus(status);

          if (status === "completed") {
            setWsProgress(100);

            setWsStatus(
              "Processing completed successfully"
            );
          }

          if (status === "failed") {
            setJobError(
              data.error ||
                "ETL processing failed."
            );

            setWsStatus(
              "Processing failed"
            );
          }

          if (status === "cancelled") {
            setWsStatus(
              "Processing cancelled"
            );
          }
        }

        // ==================================
        // CONNECTED EVENT
        // ==================================
        if (data.event === "connected") {
          console.log(
            "Connected to job:",
            data.jobId
          );
        }
      } catch (error) {
        console.error(
          "WebSocket message error:",
          error
        );
      }
    };

    ws.onerror = (error) => {
      console.error(
        "WebSocket error:",
        error
      );

      setWsStatus(
        "Live progress connection failed"
      );

      setJobError(
        "Unable to receive live processing updates. The backend job may still be running."
      );
    };

    ws.onclose = () => {
      console.log(
        "WebSocket disconnected"
      );
    };
  };

  // ==========================================
  // APPLY FRONTEND TRANSFORMATIONS
  // ==========================================
  const applyTransformations = () => {
    if (
      !rows.length ||
      selectedRuleCount === 0
    ) {
      return;
    }

    setProcessing(true);
    setProcessingProgress(0);
    setProcessingStatus(
      "Starting transformation..."
    );

    let transformedRows = [...rows];

    // ======================================
    // STEP 1 - TRIM
    // ======================================
    if (transformRules.trim) {
      setProcessingStatus(
        "Trimming whitespace..."
      );

      setProcessingProgress(20);

      transformedRows =
        transformedRows.map((row) => {
          const newRow = {};

          columns.forEach((column) => {
            newRow[column] =
              typeof row[column] === "string"
                ? row[column].trim()
                : row[column];
          });

          return newRow;
        });
    }

    // ======================================
    // STEP 2 - UPPERCASE / LOWERCASE
    // ======================================
    if (
      transformRules.uppercase ||
      transformRules.lowercase
    ) {
      setProcessingStatus(
        "Applying text transformations..."
      );

      setProcessingProgress(40);

      transformedRows =
        transformedRows.map((row) => {
          const newRow = {};

          columns.forEach((column) => {
            let value = row[column];

            if (typeof value === "string") {
              if (transformRules.uppercase) {
                value = value.toUpperCase();
              }

              if (transformRules.lowercase) {
                value = value.toLowerCase();
              }
            }

            newRow[column] = value;
          });

          return newRow;
        });
    }

    // ======================================
    // STEP 3 - REMOVE EMPTY ROWS
    // ======================================
    if (transformRules.removeEmpty) {
      setProcessingStatus(
        "Removing empty rows..."
      );

      setProcessingProgress(60);

      transformedRows =
        transformedRows.filter((row) =>
          columns.some(
            (column) =>
              row[column] !== null &&
              row[column] !== undefined &&
              String(
                row[column]
              ).trim() !== ""
          )
        );
    }

    // ======================================
    // STEP 4 - REMOVE DUPLICATES
    // ======================================
    if (
      transformRules.removeDuplicates
    ) {
      setProcessingStatus(
        "Removing duplicate rows..."
      );

      setProcessingProgress(80);

      const uniqueRows = [];
      const seen = new Set();

      transformedRows.forEach((row) => {
        const key = JSON.stringify(row);

        if (!seen.has(key)) {
          seen.add(key);
          uniqueRows.push(row);
        }
      });

      transformedRows = uniqueRows;
    }

    // ======================================
    // FINISH
    // ======================================
    setProcessingStatus(
      "Transformation completed!"
    );

    setProcessingProgress(100);

    setRows(transformedRows);

    setTimeout(() => {
      setProcessing(false);
    }, 800);
  };

  // ==========================================
  // BULK INSERT
  // ==========================================
  const handleBulkInsert = async () => {
    if (!rows.length) {
      setBulkInsertError(
        "No CSV records available for bulk insert."
      );

      return;
    }

    try {
      setBulkInsertLoading(true);
      setBulkInsertProgress(0);
      setBulkInsertStatus(
        "Preparing records..."
      );
      setBulkInsertError("");
      setBulkInsertSuccess(false);

      setBulkInsertProgress(20);

      const records = rows.map((row) => ({
        ...row,
      }));

      setBulkInsertStatus(
        "Sending records to server..."
      );

      setBulkInsertProgress(40);

      const response = await fetch(
        "http://localhost:5000/api/bulk-insert",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            records,
            jobId,
            totalRecords:
              records.length,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            "Bulk insert failed."
        );
      }

      setBulkInsertProgress(100);

      setBulkInsertStatus(
        "Bulk insert completed successfully."
      );

      setBulkInsertSuccess(true);

      console.log(
        "Bulk insert response:",
        data
      );
    } catch (error) {
      console.error(
        "Bulk insert error:",
        error
      );

      setBulkInsertProgress(0);

      setBulkInsertStatus(
        "Bulk insert failed."
      );

      setBulkInsertError(
        error.message ||
          "Failed to insert records."
      );

      setBulkInsertSuccess(false);
    } finally {
      setBulkInsertLoading(false);
    }
  };

  // ==========================================
  // RESET PREVIEW
  // ==========================================
  const resetPreview = () => {
    setRows([]);
    setColumns([]);
    setProgress(0);

    setTransformRules({
      trim: false,
      uppercase: false,
      lowercase: false,
      removeEmpty: false,
      removeDuplicates: false,
    });

    hasColumnsRef.current = false;
    hasRowsRef.current = false;
    hasParseErrorsRef.current = false;
  };

  // ==========================================
  // OPEN FILE PICKER
  // ==========================================
  const handleChooseFile = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  // ==========================================
  // CSV VALIDATION
  // ==========================================
  const validateCSVFile = (
    selectedFile
  ) => {
    if (!selectedFile) {
      return "Please select a file.";
    }

    if (
      !selectedFile.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      return "Invalid file type. Please select a CSV file.";
    }

    if (selectedFile.size === 0) {
      return "The selected CSV file is empty.";
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      return "File is too large. Maximum allowed size is 10 MB.";
    }

    return "";
  };

  // ==========================================
  // PROCESS SELECTED FILE
  // ==========================================
  const processSelectedFile = (
    selectedFile
  ) => {
    if (!selectedFile) {
      return;
    }

    setError("");

    resetPreview();

    setJobId(null);
    setJobStatus("");
    setJobError("");

    setWsProgress(0);
    setWsStatus("");

    const validationError =
      validateCSVFile(
        selectedFile
      );

    if (validationError) {
      setFile(null);
      setError(validationError);

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }

      return;
    }

    setFile(selectedFile);
  };

  // ==========================================
  // FILE PICKER
  // ==========================================
  const handleFileChange = (
    event
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    processSelectedFile(
      selectedFile
    );
  };

  // ==========================================
  // DRAG OVER
  // ==========================================
  const handleDragOver = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isUploading) {
      setIsDragging(true);
    }
  };

  // ==========================================
  // DRAG LEAVE
  // ==========================================
  const handleDragLeave = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);
  };

  // ==========================================
  // DROP FILE
  // ==========================================
  const handleDrop = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    if (isUploading) {
      return;
    }

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (!droppedFile) {
      setError(
        "No file was dropped."
      );

      return;
    }

    processSelectedFile(
      droppedFile
    );
  };

  // ==========================================
  // PREVIEW CSV
  // ==========================================
  const handleUpload = async () => {
    if (!file) {
      setError(
        "Please select a CSV file first."
      );

      return;
    }

    try {
      setIsUploading(true);
      setProgress(0);
      setError("");

      setRows([]);
      setColumns([]);

      const data =
        await previewCsv(file);

      console.log(
        "Preview API response:",
        data
      );

      setColumns(
        data.columns || []
      );

      setRows(
        data.rows || []
      );

      setProgress(100);

      if (
        !data.columns ||
        data.columns.length === 0
      ) {
        setError(
          "Invalid CSV file. No header columns were found."
        );

        return;
      }

      if (
        !data.rows ||
        data.rows.length === 0
      ) {
        setError(
          "The CSV file does not contain any data rows."
        );

        return;
      }

      setError("");
    } catch (error) {
      console.error(
        "CSV preview error:",
        error
      );

      const message =
        error.response?.data?.error
          ?.message ||
        error.response?.data
          ?.message ||
        error.message ||
        "Failed to preview CSV file.";

      setError(message);

      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // ==========================================
  // VIRTUALIZED ROW
  // ==========================================
  const VirtualRow = ({
    index,
    style,
  }) => {
    const row = rows[index];

    if (!row) {
      return null;
    }

    return (
      <div
        style={style}
        className="
          flex
          border-b
          border-slate-200
          bg-white
          hover:bg-slate-50
        "
      >
        {columns.map(
          (column) => (
            <div
              key={column}
              className="
                w-[180px]
                sm:w-[200px]
                md:w-[220px]
                shrink-0
                overflow-hidden
                text-ellipsis
                whitespace-nowrap
                px-3
                sm:px-4
                py-3
                text-sm
                sm:text-base
                text-slate-700
              "
              title={String(
                row[column] ?? ""
              )}
            >
              {row[column] ?? ""}
            </div>
          )
        )}
      </div>
    );
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-white p-3 sm:p-5 md:p-8">

      {/* PAGE HEADING */}
      <h1
        className="
          text-3xl
          sm:text-4xl
          font-bold
          text-slate-900
        "
      >
        Upload Files
      </h1>

      <p
        className="
          mt-2
          text-base
          sm:text-lg
          text-slate-600
        "
      >
        Upload your CSV files here.
      </p>

      {/* ======================================
          UPLOAD AREA
      ====================================== */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          mt-6
          sm:mt-8
          flex
          min-h-[260px]
          sm:min-h-[300px]
          flex-col
          items-center
          justify-center
          rounded-xl
          border-2
          border-dashed
          px-4
          py-8
          text-center
          transition-all
          duration-200

          ${
            isDragging
              ? "border-blue-500 bg-blue-50 scale-[1.01]"
              : "border-slate-300 bg-white"
          }
        `}
      >

        <h2
          className="
            text-xl
            sm:text-2xl
            font-semibold
            text-slate-900
          "
        >
          {isDragging
            ? "Drop CSV File Here"
            : "Drag & Drop Files Here"}
        </h2>

        <p
          className="
            mt-3
            text-sm
            sm:text-lg
            text-slate-500
          "
        >
          or choose a file from your computer
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={handleChooseFile}
          disabled={isUploading}
          className="
            mt-6
            w-full
            max-w-[220px]
            rounded-lg
            bg-blue-600
            px-6
            py-3
            sm:px-7
            sm:py-4
            text-base
            sm:text-lg
            font-semibold
            text-white
            transition
            hover:bg-blue-700
            disabled:cursor-not-allowed
            disabled:bg-blue-300
          "
        >
          Choose File
        </button>

        {/* SELECTED FILE */}
        {file && (
          <div
            className="
              mt-5
              w-full
              max-w-md
              text-center
            "
          >
            <p className="font-semibold text-green-600">
              File selected successfully
            </p>

            <p
              className="
                mt-1
                break-all
                text-sm
                sm:text-base
                text-slate-700
              "
            >
              {file.name}
            </p>

            <p className="text-sm text-slate-500">
              {(file.size / 1024).toFixed(2)} KB
            </p>

            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="
                mt-4
                w-full
                max-w-[220px]
                rounded-lg
                bg-green-600
                px-6
                py-3
                font-semibold
                text-white
                transition
                hover:bg-green-700
                disabled:cursor-not-allowed
                disabled:bg-green-300
              "
            >
              {isUploading
                ? "Processing..."
                : "Upload CSV"}
            </button>
          </div>
        )}

        {/* SEND TO BACKEND */}
        {rows.length > 0 &&
          columns.length > 0 && (
            <button
              type="button"
              onClick={uploadToBackend}
              disabled={
                isUploading ||
                jobStatus === "processing"
              }
              className="
                mt-3
                w-full
                max-w-[220px]
                rounded-lg
                bg-purple-600
                px-6
                py-3
                font-semibold
                text-white
                transition
                hover:bg-purple-700
                disabled:cursor-not-allowed
                disabled:bg-purple-300
              "
            >
              {jobStatus === "processing"
                ? "Uploading..."
                : "Send to Backend"}
            </button>
          )}

        {/* BACKEND PROCESSING */}
        {jobId && (
          <div className="mt-6 w-full max-w-2xl rounded-2xl border border-green-200 bg-green-50 p-5">

            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-slate-800">
                Backend Processing
              </span>

              <span className="font-bold text-green-600">
                {wsProgress}%
              </span>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-green-100">
              <div
                className="h-full rounded-full bg-green-600 transition-all duration-500"
                style={{
                  width: `${wsProgress}%`,
                }}
              />
            </div>

            <p className="mt-3 text-sm font-medium text-slate-600">
              {wsStatus ||
                "Waiting for updates..."}
            </p>

            <div className="mt-3 flex gap-6 text-sm text-slate-600">
              <span>
                Processed:{" "}
                <strong>
                  {processedRows}
                </strong>
              </span>

              <span>
                Failed:{" "}
                <strong>
                  {failedRows}
                </strong>
              </span>
            </div>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div
            className="
              mt-5
              w-full
              max-w-2xl
              rounded-lg
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              text-center
            "
          >
            <p className="text-sm sm:text-base font-medium text-red-600">
              {error}
            </p>
          </div>
        )}
      </div>

      {/* JOB STATUS */}
      {jobStatus === "processing" && (
        <p className="mb-3 font-medium text-blue-600">
          Processing your CSV file...
        </p>
      )}

      {jobStatus === "completed" && (
        <p className="mb-3 font-medium text-green-600">
          ✓ Processing completed successfully
        </p>
      )}

      {jobStatus === "failed" && (
        <p className="mb-3 font-medium text-red-600">
          ✕ Processing failed
        </p>
      )}

      {jobStatus === "cancelled" && (
        <p className="mb-3 font-medium text-orange-600">
          ⚠ Processing cancelled
        </p>
      )}

      {jobError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-600">
            {jobError}
          </p>
        </div>
      )}

      {/* CSV PREVIEW PROGRESS */}
      {isUploading && (
        <div className="mx-auto mt-6 w-full max-w-3xl">

          <div className="mb-2 flex items-center justify-between gap-3">

            <span className="text-sm sm:text-base font-medium text-slate-700">
              Processing CSV...
            </span>

            <span className="text-sm sm:text-base font-semibold text-blue-600">
              {progress}%
            </span>

          </div>

          <div className="h-3 sm:h-4 overflow-hidden rounded-full bg-slate-200">

            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>
        </div>
      )}

      {/* FRONTEND TRANSFORMATION PROGRESS */}
      {processing && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">

          <div className="mb-3 flex items-center justify-between">

            <span className="font-semibold text-slate-800">
              Processing CSV...
            </span>

            <span className="font-bold text-blue-600">
              {processingProgress}%
            </span>

          </div>

          <div className="h-4 overflow-hidden rounded-full bg-blue-100">

            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${processingProgress}%`,
              }}
            />

          </div>

          <p className="mt-3 text-sm font-medium text-slate-600">
            {processingStatus}
          </p>

        </div>
      )}

      {/* ======================================
          CSV TRANSFORMATION RULES
      ====================================== */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

        <div className="mb-6">

          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
            CSV Transformation Rules
          </h2>

          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            Clean and transform your CSV data before processing.
          </p>

        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          {/* TRIM */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">

            <input
              type="checkbox"
              checked={transformRules.trim}
              onChange={() =>
                handleTransformRuleChange(
                  "trim"
                )
              }
              className="h-5 w-5 rounded"
            />

            <div>
              <p className="font-medium text-slate-900">
                Trim whitespace
              </p>

              <p className="text-sm text-slate-500">
                Remove spaces before and after values
              </p>
            </div>

          </label>

          {/* UPPERCASE */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">

            <input
              type="checkbox"
              checked={transformRules.uppercase}
              onChange={() => {
                setTransformRules({
                  ...transformRules,
                  uppercase:
                    !transformRules.uppercase,
                  lowercase: false,
                });
              }}
              className="h-5 w-5 rounded"
            />

            <div>
              <p className="font-medium text-slate-900">
                Convert to UPPERCASE
              </p>

              <p className="text-sm text-slate-500">
                Convert text values to capital letters
              </p>
            </div>

          </label>

          {/* LOWERCASE */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">

            <input
              type="checkbox"
              checked={transformRules.lowercase}
              onChange={() => {
                setTransformRules({
                  ...transformRules,
                  lowercase:
                    !transformRules.lowercase,
                  uppercase: false,
                });
              }}
              className="h-5 w-5 rounded"
            />

            <div>
              <p className="font-medium text-slate-900">
                Convert to lowercase
              </p>

              <p className="text-sm text-slate-500">
                Convert text values to small letters
              </p>
            </div>

          </label>

          {/* REMOVE EMPTY */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">

            <input
              type="checkbox"
              checked={transformRules.removeEmpty}
              onChange={() =>
                handleTransformRuleChange(
                  "removeEmpty"
                )
              }
              className="h-5 w-5 rounded"
            />

            <div>
              <p className="font-medium text-slate-900">
                Remove empty rows
              </p>

              <p className="text-sm text-slate-500">
                Remove rows that contain no data
              </p>
            </div>

          </label>

          {/* REMOVE DUPLICATES */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50 sm:col-span-2">

            <input
              type="checkbox"
              checked={
                transformRules.removeDuplicates
              }
              onChange={() =>
                handleTransformRuleChange(
                  "removeDuplicates"
                )
              }
              className="h-5 w-5 rounded"
            />

            <div>
              <p className="font-medium text-slate-900">
                Remove duplicate rows
              </p>

              <p className="text-sm text-slate-500">
                Keep only unique CSV records
              </p>
            </div>

          </label>

        </div>

        {/* SELECTED COUNT */}
        <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">

          <p className="text-sm font-medium text-slate-700">

            {selectedRuleCount} rule
            {selectedRuleCount !== 1
              ? "s"
              : ""}{" "}
            selected

          </p>

          {selectedRuleCount > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Pipeline will receive:{" "}
              {getSelectedTransformations().join(
                ", "
              )}
            </p>
          )}

        </div>

        {/* BUTTONS */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">

          <button
            type="button"
            onClick={
              applyTransformations
            }
            disabled={
              !rows.length ||
              selectedRuleCount === 0
            }
            className="
              rounded-lg
              bg-blue-600
              px-6
              py-3
              font-semibold
              text-white
              transition
              hover:bg-blue-700
              disabled:cursor-not-allowed
              disabled:bg-slate-300
            "
          >
            {processing
              ? "Processing..."
              : "Apply Transformations"}
          </button>

          <button
            type="button"
            onClick={() =>
              setTransformRules({
                trim: false,
                uppercase: false,
                lowercase: false,
                removeEmpty: false,
                removeDuplicates: false,
              })
            }
            className="
              rounded-lg
              border
              border-slate-300
              bg-white
              px-6
              py-3
              font-semibold
              text-slate-700
              transition
              hover:bg-slate-50
            "
          >
            Reset Rules
          </button>

        </div>

      </div>

      {/* PIPELINE TEST */}
      <button
        type="button"
        onClick={
          testCreatePipeline
        }
        disabled={!columns.length}
        className="
          mt-4
          rounded-lg
          bg-purple-600
          px-6
          py-3
          font-semibold
          text-white
          hover:bg-purple-700
          disabled:cursor-not-allowed
          disabled:bg-slate-300
        "
      >
        Test Create Pipeline
      </button>

      {/* PIPELINE SUCCESS */}
      {pipelineId && (
        <div className="mt-4 rounded-lg bg-green-50 p-4">

          <p className="font-semibold text-green-700">
            Pipeline created successfully!
          </p>

          <p className="mt-1 break-all text-sm text-slate-600">
            Pipeline ID:{" "}
            {pipelineId}
          </p>

        </div>
      )}

      {/* BACKEND PROCESSING */}
      {jobId && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">

          <div className="mb-3 flex items-center justify-between">

            <span className="font-semibold text-slate-800">
              Backend Processing
            </span>

            <span className="font-bold text-green-600">
              {wsProgress}%
            </span>

          </div>

          <div className="h-4 overflow-hidden rounded-full bg-green-100">

            <div
              className="h-full rounded-full bg-green-600 transition-all duration-500"
              style={{
                width: `${wsProgress}%`,
              }}
            />

          </div>

          <p className="mt-3 text-sm font-medium text-slate-600">
            {wsStatus ||
              "Waiting for processing updates..."}
          </p>

          <div className="mt-3 flex gap-6 text-sm text-slate-600">

            <span>
              Processed:{" "}
              <strong>
                {processedRows}
              </strong>
            </span>

            <span>
              Failed:{" "}
              <strong>
                {failedRows}
              </strong>
            </span>

          </div>

        </div>
      )}

      {/* ======================================
          BULK INSERT
      ====================================== */}
      {rows.length > 0 && (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="mb-6">

            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
              Bulk Insert
            </h2>

            <p className="mt-1 text-sm text-slate-500 sm:text-base">
              Insert all processed CSV records into the backend at once.
            </p>

          </div>

          <div className="rounded-xl bg-slate-50 p-4">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Records ready for insertion
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {rows.length}
                </p>

              </div>

              <div>

                <p className="text-sm text-slate-500">
                  Columns
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {columns.length}
                </p>

              </div>

            </div>

          </div>

          {bulkInsertLoading && (
            <div className="mt-5">

              <div className="mb-2 flex items-center justify-between">

                <span className="text-sm font-medium text-slate-700">
                  {bulkInsertStatus}
                </span>

                <span className="text-sm font-semibold text-blue-600">
                  {bulkInsertProgress}%
                </span>

              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-200">

                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${bulkInsertProgress}%`,
                  }}
                />

              </div>

            </div>
          )}

          {bulkInsertSuccess && (
            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">

              <p className="text-sm font-medium text-green-700">
                ✓ {bulkInsertStatus}
              </p>

            </div>
          )}

          {bulkInsertError && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">

              <p className="text-sm font-medium text-red-600">
                ✕ {bulkInsertError}
              </p>

            </div>
          )}

          {!bulkInsertLoading &&
            !bulkInsertSuccess &&
            !bulkInsertError && (
              <p className="mt-5 text-sm text-slate-500">
                {rows.length} records are ready for bulk insertion.
              </p>
            )}

          <div className="mt-5">

            <button
              type="button"
              onClick={
                handleBulkInsert
              }
              disabled={
                bulkInsertLoading ||
                rows.length === 0
              }
              className="
                w-full
                rounded-lg
                bg-green-600
                px-6
                py-3
                font-semibold
                text-white
                transition
                hover:bg-green-700
                disabled:cursor-not-allowed
                disabled:bg-slate-300
                sm:w-auto
              "
            >
              {bulkInsertLoading
                ? "Inserting Records..."
                : "Bulk Insert Records"}
            </button>

          </div>

        </div>
      )}

      {/* ======================================
          CSV PREVIEW
      ====================================== */}
      {rows.length > 0 &&
        columns.length > 0 && (
          <div className="mt-8 sm:mt-10">

            <div
              className="
                mb-4
                flex
                flex-col
                gap-2
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >

              <h2
                className="
                  text-xl
                  sm:text-2xl
                  font-bold
                  text-slate-900
                "
              >
                CSV Preview
              </h2>

              <span className="text-sm sm:text-base text-slate-600">
                {rows.length} rows ×{" "}
                {columns.length} columns
              </span>

            </div>

            <div
              className="
                overflow-x-auto
                rounded-lg
                border
                border-slate-300
              "
            >

              {/* HEADER */}
              <div
                className="
                  flex
                  min-w-max
                  bg-slate-100
                "
              >

                {columns.map(
                  (column) => (
                    <div
                      key={column}
                      className="
                        w-[180px]
                        sm:w-[200px]
                        md:w-[220px]
                        shrink-0
                        border-b
                        border-slate-300
                        px-3
                        sm:px-4
                        py-3
                        text-sm
                        sm:text-base
                        font-semibold
                        text-slate-800
                      "
                    >
                      {column}
                    </div>
                  )
                )}

              </div>

              {/* ROWS */}
              <div className="min-w-max">

                <FixedSizeList
                  height={500}
                  itemCount={
                    rows.length
                  }
                  itemSize={50}
                  width={Math.max(
                    columns.length *
                      (window.innerWidth <
                      640
                        ? 180
                        : window.innerWidth <
                          768
                        ? 200
                        : 220),
                    800
                  )}
                >
                  {VirtualRow}
                </FixedSizeList>

              </div>

            </div>

            <p className="mt-3 text-xs sm:text-sm text-slate-500">
              Virtualized table: only visible rows are rendered.
            </p>

          </div>
        )}

    </div>
  );
}

export default Upload;