import { useRef, useState } from "react";
import Papa from "papaparse";
import { FixedSizeList } from "react-window";

function Upload() {
const wsRef = useRef(null);

const [jobId, setJobId] = useState(null);
const [wsProgress, setWsProgress] = useState(0);
const [wsStatus, setWsStatus] = useState("");
const [processedRows, setProcessedRows] = useState(0);
const [failedRows, setFailedRows] = useState(0);

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
  const [processing, setProcessing] = useState(false);
const [processingProgress, setProcessingProgress] = useState(0);
const [processingStatus, setProcessingStatus] = useState("");
const [jobStatus, setJobStatus] = useState("");
const [jobError, setJobError] = useState("");

const [bulkInsertLoading, setBulkInsertLoading] = useState(false);
const [bulkInsertProgress, setBulkInsertProgress] = useState(0);
const [bulkInsertStatus, setBulkInsertStatus] = useState("");
const [bulkInsertError, setBulkInsertError] = useState("");
const [bulkInsertSuccess, setBulkInsertSuccess] = useState(false);

 
  const [transformRules, setTransformRules] = useState({
  trim: false,
  uppercase: false,
  lowercase: false,
  removeEmpty: false,
  removeDuplicates: false,
});

 const selectedRuleCount = Object.values(transformRules).filter(
  Boolean
).length;
  const MAX_FILE_SIZE = 10 * 1024 * 1024;


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

    const formData = new FormData();

    formData.append("file", file);

    // You need the actual pipeline ID here
    formData.append("pipelineId", "YOUR_PIPELINE_ID");

    const response = await fetch("http://localhost:5000/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message || "Upload failed"
      );
    }

    console.log("Upload response:", data);

    setJobId(data.jobId);
setJobStatus("processing");

connectWebSocket(data.jobId);

setWsStatus("Processing started...");
  } catch (error) {
    console.error("Upload error:", error);

  setJobStatus("failed");
  setJobError(error.message || "Failed to upload file.");
  setError(error.message || "Failed to upload file.");

  setWsStatus("Upload failed");

  }
};

  const connectWebSocket = (jobId) => {
  const ws = new WebSocket(
    `ws://localhost:5000/ws/jobs/${jobId}`
  );

  wsRef.current = ws;

  ws.onopen = () => {
    console.log("WebSocket connected");
     setWsStatus("Connected to processing job");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      console.log("WebSocket message:", data);
if (data.event === "progress") {
  const status = data.status ?? "processing";

  setWsProgress(data.percentage ?? 0);
  setWsStatus(status);
  setProcessedRows(data.processedRows ?? 0);
  setFailedRows(data.failedRows ?? 0);
  setJobStatus(status);

  if (status === "completed") {
    setWsProgress(100);
    setWsStatus("Processing completed successfully");
  }

  if (status === "failed") {
    setJobError(data.error || "ETL processing failed.");
    setWsStatus("Processing failed");
  }

  if (status === "cancelled") {
    setWsStatus("Processing cancelled");
  }
}

      if (data.event === "connected") {
        console.log("Connected to job:", data.jobId);
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
    }
  };

ws.onerror = (error) => {
  console.error("WebSocket error:", error);

  setWsStatus("Live progress connection failed");
  setJobError(
    "Unable to receive live processing updates. The backend job may still be running."
  );
};

  ws.onclose = () => {
    console.log("WebSocket disconnected");
  };
};
  //Transformation function
 const applyTransformations = () => {
  if (!rows.length || selectedRuleCount === 0) {
    return;
  }

  setProcessing(true);
  setProcessingProgress(0);
  setProcessingStatus("Starting transformation...");

  let transformedRows = [...rows];

  // Step 1 - Trim whitespace
  if (transformRules.trim) {
    setProcessingStatus("Trimming whitespace...");
    setProcessingProgress(20);

    transformedRows = transformedRows.map((row) => {
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

  // Step 2 - Uppercase / lowercase
  if (transformRules.uppercase || transformRules.lowercase) {
    setProcessingStatus("Applying text transformations...");
    setProcessingProgress(40);

    transformedRows = transformedRows.map((row) => {
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

  // Step 3 - Remove empty rows
  if (transformRules.removeEmpty) {
    setProcessingStatus("Removing empty rows...");
    setProcessingProgress(60);

    transformedRows = transformedRows.filter((row) =>
      columns.some(
        (column) =>
          row[column] !== null &&
          row[column] !== undefined &&
          String(row[column]).trim() !== ""
      )
    );
  }

  // Step 4 - Remove duplicates
  if (transformRules.removeDuplicates) {
    setProcessingStatus("Removing duplicate rows...");
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

  // Finish
  setProcessingStatus("Transformation completed!");
  setProcessingProgress(100);

  setRows(transformedRows);

  setTimeout(() => {
    setProcessing(false);
  }, 800);
};

// ==============================
// BULK INSERT
// ==============================
const handleBulkInsert = async () => {
  if (!rows.length) {
    setBulkInsertError("No CSV records available for bulk insert.");
    return;
  }

  try {
    setBulkInsertLoading(true);
    setBulkInsertProgress(0);
    setBulkInsertStatus("Preparing records...");
    setBulkInsertError("");
    setBulkInsertSuccess(false);

    // Simulate preparation progress
    setBulkInsertProgress(20);

    const records = rows.map((row) => ({
      ...row,
    }));

    setBulkInsertStatus("Sending records to server...");
    setBulkInsertProgress(40);

    /*
      IMPORTANT:
      Replace this endpoint with the actual bulk-insert
      endpoint provided by your backend developer.

      Example:
      POST /api/jobs/:id/bulk-insert
    */

    const response = await fetch(
      "http://localhost:5000/api/bulk-insert",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records,
          jobId,
          totalRecords: records.length,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        data?.message ||
        "Bulk insert failed."
      );
    }

    setBulkInsertProgress(100);
    setBulkInsertStatus("Bulk insert completed successfully.");
    setBulkInsertSuccess(true);

    console.log("Bulk insert response:", data);

  } catch (error) {
    console.error("Bulk insert error:", error);

    setBulkInsertProgress(0);
    setBulkInsertStatus("Bulk insert failed.");
    setBulkInsertError(
      error.message || "Failed to insert records."
    );
    setBulkInsertSuccess(false);

  } finally {
    setBulkInsertLoading(false);
  }
};
  // ==============================
  // RESET DATA
  // ==============================
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

  // ==============================
  // OPEN FILE PICKER
  // ==============================
  const handleChooseFile = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  // ==============================
  // CSV FILE VALIDATION
  // ==============================
  const validateCSVFile = (selectedFile) => {
    if (!selectedFile) {
      return "Please select a file.";
    }

    // Check file extension
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      return "Invalid file type. Please select a CSV file.";
    }

    // Check empty file
    if (selectedFile.size === 0) {
      return "The selected CSV file is empty.";
    }

    // Check maximum file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      return "File is too large. Maximum allowed size is 10 MB.";
    }

    return "";
  };

  // ==============================
  // SET SELECTED FILE
  // ==============================
  const processSelectedFile = (selectedFile) => {
    if (!selectedFile) {
      return;
    }

    setError("");
    resetPreview();

    const validationError = validateCSVFile(selectedFile);

    if (validationError) {
      setFile(null);
      setError(validationError);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setFile(selectedFile);
  };

  // ==============================
  // FILE PICKER
  // ==============================
  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    processSelectedFile(selectedFile);
  };

  // ==============================
  // DRAG OVER
  // ==============================
  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isUploading) {
      setIsDragging(true);
    }
  };

  // ==============================
  // DRAG LEAVE
  // ==============================
  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);
  };

  // ==============================
  // DROP FILE
  // ==============================
  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    if (isUploading) {
      return;
    }

    const droppedFile = event.dataTransfer.files?.[0];

    if (!droppedFile) {
      setError("No file was dropped.");
      return;
    }

    processSelectedFile(droppedFile);
  };

  // ==============================
  // UPLOAD + PARSE CSV
  // ==============================
  const handleUpload = () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    hasColumnsRef.current = false;
    hasRowsRef.current = false;
    hasParseErrorsRef.current = false;

    setIsUploading(true);
    setProgress(0);
    setError("");
    setRows([]);
    setColumns([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      // Process large CSV files in chunks
      chunkSize: 256 * 1024,

      worker: true,

      // ==============================
      // PROCESS EACH CHUNK
      // ==============================
      chunk: (results) => {
        // Detect parsing errors
        if (results.errors && results.errors.length > 0) {
          console.warn("CSV parsing errors:", results.errors);

          hasParseErrorsRef.current = true;
        }

        // Detect columns
        if (
          results.meta?.fields &&
          results.meta.fields.length > 0
        ) {
          hasColumnsRef.current = true;

          setColumns((previousColumns) => {
            if (previousColumns.length === 0) {
              return results.meta.fields;
            }

            return previousColumns;
          });
        }

        // Detect rows
        if (
          results.data &&
          results.data.length > 0
        ) {
          hasRowsRef.current = true;

          // Detect columns from row if needed
          const detectedColumns = Object.keys(
            results.data[0] || {}
          );

          if (detectedColumns.length > 0) {
            hasColumnsRef.current = true;

            setColumns((previousColumns) => {
              if (previousColumns.length === 0) {
                return detectedColumns;
              }

              return previousColumns;
            });
          }

          setRows((previousRows) => [
            ...previousRows,
            ...results.data,
          ]);
        }

        // ==============================
        // PROGRESS
        // ==============================
        if (file.size > 0) {
          const progressValue = Math.min(
            Math.round(
              (results.meta.cursor / file.size) * 100
            ),
            100
          );

          setProgress(progressValue);
        }
      },

      // ==============================
      // COMPLETE
      // ==============================
      complete: () => {
        setProgress(100);

        setTimeout(() => {
          setIsUploading(false);

          // CSV parsing error
          if (hasParseErrorsRef.current) {
            setError(
              "The CSV contains formatting errors. Please check the file and try again."
            );
            return;
          }

          // No header
          if (!hasColumnsRef.current) {
            setError(
              "Invalid CSV file. No header columns were found."
            );

            setRows([]);
            setColumns([]);

            return;
          }

          // No rows
          if (!hasRowsRef.current) {
            setError(
              "The CSV file does not contain any data rows."
            );

            return;
          }

          // Success
          setError("");
        }, 500);
      },

      // ==============================
      // PARSE ERROR
      // ==============================
      error: (parseError) => {
        console.error("CSV Error:", parseError);

        setError(
          "Failed to read the CSV file. Please check the file and try again."
        );

        setIsUploading(false);
        setProgress(0);
      },
    });
  };

  // ==============================
  // VIRTUALIZED ROW
  // ==============================
  const VirtualRow = ({ index, style }) => {
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
        {columns.map((column) => (
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
            title={String(row[column] ?? "")}
          >
            {row[column] ?? ""}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white p-3 sm:p-5 md:p-8">

      {/* ==============================
          PAGE HEADING
      ============================== */}
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

      {/* ==============================
          UPLOAD AREA
      ============================== */}
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

        {/* Upload heading */}
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

        {/* Hidden input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Choose button */}
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

        {/* ==============================
            SELECTED FILE
        ============================== */}
        {file && (
          <div
            className="
              mt-5
              w-full
              max-w-md
              text-center
            "
          >
            <p
              className="
                font-semibold
                text-green-600
              "
            >
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

            {/* Upload button */}
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
      {wsStatus || "Waiting for updates..."}
    </p>

    <div className="mt-3 flex gap-6 text-sm text-slate-600">
      <span>
        Processed: <strong>{processedRows}</strong>
      </span>

      <span>
        Failed: <strong>{failedRows}</strong>
      </span>
    </div>

  </div>
)}

        {/* ==============================
            ERROR MESSAGE
        ============================== */}
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
            <p
              className="
                text-sm
                sm:text-base
                font-medium
                text-red-600
              "
            >
              {error}
            </p>
          </div>
        )}
      </div>





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
      {/* ==============================
          PROGRESS BAR
      ============================== */}
      {isUploading && (
        <div
          className="
            mx-auto
            mt-6
            w-full
            max-w-3xl
          "
        >
          <div
            className="
              mb-2
              flex
              items-center
              justify-between
              gap-3
            "
          >
            <span
              className="
                text-sm
                sm:text-base
                font-medium
                text-slate-700
              "
            >
              Processing CSV...
            </span>

            <span
              className="
                text-sm
                sm:text-base
                font-semibold
                text-blue-600
              "
            >
              {progress}%
            </span>
          </div>

          <div
            className="
              h-3
              sm:h-4
              overflow-hidden
              rounded-full
              bg-slate-200
            "
          >
            <div
              className="
                h-full
                rounded-full
                bg-blue-600
                transition-all
                duration-300
              "
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      )}






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

 {/* ==============================
          CSV Transformation Rules
      ============================== */}
<div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
  {/* Header */}
  <div className="mb-6">
    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
      CSV Transformation Rules
    </h2>

    <p className="mt-1 text-sm text-slate-500 sm:text-base">
      Clean and transform your CSV data before processing.
    </p>
  </div>

  {/* Rules */}
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    
    {/* Trim */}
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={transformRules.trim}
        onChange={(e) =>
          setTransformRules({
            ...transformRules,
            trim: e.target.checked,
          })
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

    {/* Uppercase */}
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={transformRules.uppercase}
        onChange={(e) =>
          setTransformRules({
            ...transformRules,
            uppercase: e.target.checked,
            lowercase: false,
          })
        }
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

    {/* Lowercase */}
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={transformRules.lowercase}
        onChange={(e) =>
          setTransformRules({
            ...transformRules,
            lowercase: e.target.checked,
            uppercase: false,
          })
        }
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

    {/* Empty rows */}
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={transformRules.removeEmpty}
        onChange={(e) =>
          setTransformRules({
            ...transformRules,
            removeEmpty: e.target.checked,
          })
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

    {/* Duplicates */}
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50 sm:col-span-2">
      <input
        type="checkbox"
        checked={transformRules.removeDuplicates}
        onChange={(e) =>
          setTransformRules({
            ...transformRules,
            removeDuplicates: e.target.checked,
          })
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

  {/* Status */}
  <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">
    <p className="text-sm font-medium text-slate-700">
      {selectedRuleCount} rule
      {selectedRuleCount !== 1 ? "s" : ""} selected
    </p>
  </div>

  {/* Buttons */}
  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
    <button
      type="button"
      onClick={applyTransformations}
      disabled={!rows.length || selectedRuleCount === 0}
      className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
    {processing ? "Processing..." : "Apply Transformations"}
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
      className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      Reset Rules
    </button>
  </div>
</div>


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
      {wsStatus || "Waiting for processing updates..."}
    </p>

    <div className="mt-3 flex gap-6 text-sm text-slate-600">
      <span>
        Processed: <strong>{processedRows}</strong>
      </span>

      <span>
        Failed: <strong>{failedRows}</strong>
      </span>
    </div>

  </div>
)}

{/* ==============================
    BULK INSERT
============================== */}
{rows.length > 0 && (
  <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

    {/* Header */}
    <div className="mb-6">
      <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
        Bulk Insert
      </h2>

      <p className="mt-1 text-sm text-slate-500 sm:text-base">
        Insert all processed CSV records into the backend at once.
      </p>
    </div>

    {/* Record information */}
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

    {/* Progress */}
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

    {/* Success */}
    {bulkInsertSuccess && (
      <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm font-medium text-green-700">
          ✓ {bulkInsertStatus}
        </p>
      </div>
    )}

    {/* Error */}
    {bulkInsertError && (
      <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm font-medium text-red-600">
          ✕ {bulkInsertError}
        </p>
      </div>
    )}

    {/* Status */}
    {!bulkInsertLoading &&
      !bulkInsertSuccess &&
      !bulkInsertError && (
        <p className="mt-5 text-sm text-slate-500">
          {rows.length} records are ready for bulk insertion.
        </p>
      )}

    {/* Button */}
    <div className="mt-5">

      <button
        type="button"
        onClick={handleBulkInsert}
        disabled={bulkInsertLoading || rows.length === 0}
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

      {/* ==============================
          CSV PREVIEW
      ============================== */}
      {rows.length > 0 && columns.length > 0 && (
        <div className="mt-8 sm:mt-10">

          {/* Preview heading */}
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

            <span
              className="
                text-sm
                sm:text-base
                text-slate-600
              "
            >
              {rows.length} rows × {columns.length} columns
            </span>
          </div>

          {/* Table */}
          <div
            className="
              overflow-x-auto
              rounded-lg
              border
              border-slate-300
            "
          >
            {/* Header */}
            <div
              className="
                flex
                min-w-max
                bg-slate-100
              "
            >
              {columns.map((column) => (
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
              ))}
            </div>

            {/* Virtualized rows */}
            <div className="min-w-max">
              <FixedSizeList
                height={500}
                itemCount={rows.length}
                itemSize={50}
                width={Math.max(
                  columns.length *
                    (window.innerWidth < 640
                      ? 180
                      : window.innerWidth < 768
                      ? 200
                      : 220),
                  800
                )}
              >
                {VirtualRow}
              </FixedSizeList>
            </div>
          </div>

          {/* Information */}
          <p
            className="
              mt-3
              text-xs
              sm:text-sm
              text-slate-500
            "
          >
            Virtualized table: only visible rows are rendered.
          </p>
        </div>
      )}
    </div>
  );
}




export default Upload;