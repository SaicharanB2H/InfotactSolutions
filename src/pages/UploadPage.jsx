import { useState } from "react";
import CSVPreviewTable from "../components/CSVPreviewTable";

function UploadPage() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);

  // Parse CSV file
  const parseCSV = (text) => {
    const lines = text
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "");

    if (lines.length === 0) {
      setError("The CSV file is empty.");
      return;
    }

    const csvHeaders = lines[0]
      .split(",")
      .map((header) => header.trim());

    const csvRows = lines.slice(1).map((line) => {
      const values = line.split(",");
      const row = {};

      csvHeaders.forEach((header, index) => {
        row[header] = values[index]?.trim() || "";
      });

      return row;
    });

    setHeaders(csvHeaders);
    setRows(csvRows);
  };

  // Handle selected/dropped file
  const handleFile = (selectedFile) => {
    setError("");
    setHeaders([]);
    setRows([]);

    if (!selectedFile) {
      return;
    }

    // Check CSV extension
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setError("Please select a CSV file.");
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        parseCSV(event.target.result);
      } catch (err) {
        console.error(err);
        setError("Unable to read the CSV file.");
      }
    };

    reader.onerror = () => {
      setError("Error reading the file.");
    };

    reader.readAsText(selectedFile);
  };

  // File picker
  const handleFileInput = (event) => {
    const selectedFile = event.target.files[0];
    handleFile(selectedFile);
  };

  // Drag over
  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  // Drag leave
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Drop file
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files[0];
    handleFile(droppedFile);
  };

  // Remove selected file
  const removeFile = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-6xl">

        {/* Page Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800">
            CSV File Upload
          </h1>

          <p className="mt-2 text-gray-600">
            Upload your CSV file to preview its contents
          </p>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 border-dashed p-12 text-center transition ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-white"
          }`}
        >
          <div className="mb-5 text-5xl">
            📁
          </div>

          <h2 className="text-xl font-semibold text-gray-800">
            Drag & Drop your CSV file
          </h2>

          <p className="my-3 text-gray-500">
            or
          </p>

          {/* File Picker */}
          <label className="inline-block cursor-pointer rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700">
            Choose CSV File

            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>

          <p className="mt-4 text-sm text-gray-400">
            Only CSV files are supported
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Selected File */}
        {file && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h3 className="font-semibold text-gray-800">
                  Selected File
                </h3>

                <p className="mt-1 font-medium text-gray-700">
                  {file.name}
                </p>

                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>

              <button
                onClick={removeFile}
                className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-200"
              >
                Remove
              </button>

            </div>
          </div>
        )}

        {/* Virtualized CSV Preview */}
        {headers.length > 0 && (
          <CSVPreviewTable
            headers={headers}
            rows={rows}
          />
        )}

      </div>
    </div>
  );
}

export default UploadPage;