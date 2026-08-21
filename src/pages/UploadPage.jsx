import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function UploadPage() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [error, setError] = useState("");

  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  // --------------------------------------------------
  // CSV PARSER
  // --------------------------------------------------

  const parseCSV = (text) => {
    const cleanText = text.trim();

    if (!cleanText) {
      throw new Error("The CSV file is empty.");
    }

    const lines = cleanText
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "");

    if (lines.length === 0) {
      throw new Error("The CSV file is empty.");
    }

    const csvHeaders = lines[0]
      .split(",")
      .map((header) => header.trim());

    if (
      csvHeaders.length === 0 ||
      csvHeaders.some((header) => !header)
    ) {
      throw new Error("Invalid CSV header.");
    }

    // Check duplicate headers
    const uniqueHeaders = new Set(csvHeaders);

    if (uniqueHeaders.size !== csvHeaders.length) {
      throw new Error("CSV contains duplicate column names.");
    }

    // Header-only CSV
    if (lines.length === 1) {
      throw new Error(
        "The CSV file does not contain any data rows."
      );
    }

    const csvRows = lines.slice(1).map((line) => {
      const values = line.split(",");
      const row = {};

      csvHeaders.forEach((header, index) => {
        row[header] = values[index]?.trim() || "";
      });

      return row;
    });

    return {
      headers: csvHeaders,
      rows: csvRows,
    };
  };

  // --------------------------------------------------
  // READ CSV FILE
  // --------------------------------------------------

  const readCSVFile = (selectedFile) => {
    setLoading(true);
    setError("");
    setHeaders([]);
    setRows([]);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const result = parseCSV(event.target.result);

        setHeaders(result.headers);
        setRows(result.rows);
      } catch (err) {
        console.error(err);

        setHeaders([]);
        setRows([]);
        setFile(null);

        setError(
          err.message || "Unable to process the CSV file."
        );
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setLoading(false);
      setFile(null);
      setError("Error reading the CSV file.");
    };

    reader.readAsText(selectedFile);
  };

  // --------------------------------------------------
  // FILE VALIDATION
  // --------------------------------------------------

  const handleFile = (selectedFile) => {
    setError("");
    setHeaders([]);
    setRows([]);
    setUploadProgress(0);
    setUploadComplete(false);

    if (!selectedFile) {
      return;
    }

    // CSV extension validation
    if (
      !selectedFile.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      setFile(null);

      setError(
        "Only CSV files are supported."
      );

      return;
    }

    // Empty file validation
    if (selectedFile.size === 0) {
      setFile(null);

      setError(
        "The CSV file is empty."
      );

      return;
    }

    // 25 MB limit
    const maxSize = 25 * 1024 * 1024;

    if (selectedFile.size > maxSize) {
      setFile(null);

      setError(
        "File size must be less than 25 MB."
      );

      return;
    }

    setFile(selectedFile);

    readCSVFile(selectedFile);
  };

  // --------------------------------------------------
  // FILE PICKER
  // --------------------------------------------------

  const handleFileInput = (event) => {
    const selectedFile = event.target.files[0];

    handleFile(selectedFile);

    // Allows selecting same file again
    event.target.value = "";
  };

  // --------------------------------------------------
  // DRAG EVENTS
  // --------------------------------------------------

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();

    setIsDragging(false);

    const droppedFile =
      event.dataTransfer.files[0];

    handleFile(droppedFile);
  };

  // --------------------------------------------------
  // UPLOAD FILE
  // --------------------------------------------------

  const handleUpload = async () => {
    if (!file) {
      setError(
        "Please select a CSV file first."
      );
      return;
    }

    if (
      headers.length === 0 ||
      rows.length === 0
    ) {
      setError(
        "Please select a valid CSV file containing data."
      );
      return;
    }

    setError("");
    setUploading(true);
    setUploadProgress(0);
    setUploadComplete(false);

    try {
      /*
       * Frontend demo upload.
       *
       * Backend upload API is not connected yet.
       */

      const formData = new FormData();

      formData.append("file", file);

      const axiosConfig = {
        headers: {
          "Content-Type": "multipart/form-data",
        },

        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentage = Math.round(
              (progressEvent.loaded * 100) /
                progressEvent.total
            );

            setUploadProgress(percentage);
          }
        },
      };

      // Simulated upload progress
      for (
        let progress = 0;
        progress <= 100;
        progress += 10
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, 150)
        );

        setUploadProgress(progress);
      }

      console.log(
        "FormData prepared:",
        formData.get("file")
      );

      console.log(
        "Axios configuration:",
        axiosConfig
      );

      setUploadProgress(100);
      setUploadComplete(true);

    } catch (err) {
      console.error(err);

      setError(
        "Upload failed. Please try again."
      );

      setUploadComplete(false);

    } finally {
      setUploading(false);
    }
  };

  // --------------------------------------------------
  // PREVIEW CSV
  // --------------------------------------------------

  const handlePreview = () => {
    navigate("/csv-preview", {
      state: {
        fileName: file.name,
        headers: headers,
        rows: rows,
      },
    });
  };

  // --------------------------------------------------
  // REMOVE FILE
  // --------------------------------------------------

  const removeFile = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setError("");
    setLoading(false);
    setUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">

      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-8 text-center">

          <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-600">
            CSV Upload
          </div>

          <h1 className="text-4xl font-bold text-slate-800">
            Upload Your CSV
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Upload a CSV file and preview its contents
            on a separate page.
          </p>

        </div>

        {/* UPLOAD AREA */}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-10 text-center shadow-sm transition sm:p-14 ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-slate-300 bg-white"
          }`}
        >

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-3xl">
            ↑
          </div>

          <h2 className="text-2xl font-bold text-slate-800">
            Drop your CSV here
          </h2>

          <p className="mt-2 text-slate-500">
            or choose a file from your device
          </p>

          {/* FILE PICKER */}

          <label className="mt-6 inline-block cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700">

            Choose CSV File

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileInput}
              className="hidden"
            />

          </label>

          <p className="mt-4 text-sm text-slate-400">
            CSV only · up to 25 MB
          </p>

        </div>

        {/* ERROR MESSAGE */}

        {error && (

          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">

            <p className="font-semibold">
              Upload Error
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>

          </div>

        )}

        {/* SELECTED FILE */}

        {file && !error && (

          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="font-semibold text-slate-800">
                  {file.name}
                </p>

                <p className="mt-1 text-sm text-slate-500">

                  {(file.size / 1024).toFixed(2)}
                  {" KB"}

                  {" · "}

                  {loading
                    ? "Processing..."
                    : uploadComplete
                    ? "Upload completed"
                    : "Ready to upload"}

                </p>

              </div>

              {!uploading && (

                <button
                  onClick={removeFile}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                >
                  Clear File
                </button>

              )}

            </div>

          </div>

        )}

        {/* PROCESSING */}

        {loading && (

          <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-10 shadow-sm">

            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>

            <p className="mt-4 font-semibold text-slate-700">
              Processing CSV...
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Preparing your CSV for upload.
            </p>

          </div>

        )}

        {/* UPLOAD BUTTON */}

        {file &&
          !loading &&
          !uploading &&
          !uploadComplete &&
          headers.length > 0 &&
          rows.length > 0 && (

            <div className="mt-6 text-center">

              <button
                onClick={handleUpload}
                className="rounded-lg bg-green-600 px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-green-700"
              >
                Upload CSV
              </button>

            </div>

          )}

        {/* UPLOAD PROGRESS */}

        {uploading && (

          <div className="mt-6 rounded-xl border border-blue-200 bg-white p-6 shadow-sm">

            <div className="mb-3 flex items-center justify-between">

              <div>

                <p className="font-semibold text-slate-800">
                  Uploading file...
                </p>

                <p className="text-sm text-slate-500">
                  Please wait
                </p>

              </div>

              <span className="font-bold text-blue-600">
                {uploadProgress}%
              </span>

            </div>

            <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200">

              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{
                  width: `${uploadProgress}%`,
                }}
              />

            </div>

            <p className="mt-3 text-center text-sm text-slate-500">
              Uploading {file.name}
            </p>

          </div>

        )}

        {/* UPLOAD SUCCESS */}

        {uploadComplete && (

          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="font-bold text-green-700">
                  ✓ Upload completed successfully
                </p>

                <p className="mt-1 text-sm text-green-600">
                  {file.name} is ready for preview.
                </p>

              </div>

              <button
                onClick={handlePreview}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Preview CSV
              </button>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

export default UploadPage;