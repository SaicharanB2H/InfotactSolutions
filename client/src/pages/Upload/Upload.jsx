import { useRef, useState } from "react";
import Papa from "papaparse";
import { FixedSizeList } from "react-window";

function Upload() {

  const hasColumnsRef = useRef(false);
const hasRowsRef = useRef(false);
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
const [isDragging, setIsDragging] = useState(false);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

  // Check file size
  if (selectedFile.size === 0) {
    return "The selected CSV file is empty.";
  }

  // Maximum file size
  if (selectedFile.size > MAX_FILE_SIZE) {
    return "File is too large. Maximum allowed size is 10 MB.";
  }

  return "";
}; 

  // ==============================
  // SELECT CSV FILE
  // ==============================

const handleFileChange = (event) => {
  const selectedFile = event.target.files?.[0];

  if (!selectedFile) {
    return;
  }

  setError("");
  setRows([]);
  setColumns([]);
  setProgress(0);

  const validationError = validateCSVFile(selectedFile);

  if (validationError) {
    setError(validationError);
    setFile(null);
    event.target.value = "";
    return;
  }

  setFile(selectedFile);
};
  // ==============================
// DRAG & DROP
// ==============================

const handleDragOver = (event) => {
  event.preventDefault();
  event.stopPropagation();

  if (!isUploading) {
    setIsDragging(true);
  }
};

const handleDragLeave = (event) => {
  event.preventDefault();
  event.stopPropagation();

  setIsDragging(false);
};

const handleDrop = (event) => {
  event.preventDefault();
  event.stopPropagation();

  setIsDragging(false);

  if (isUploading) {
    return;
  }

  const droppedFile = event.dataTransfer.files?.[0];

  if (!droppedFile) {
    return;
  }

  setError("");
  setRows([]);
  setColumns([]);
  setProgress(0);

  const validationError = validateCSVFile(droppedFile);

  if (validationError) {
    setError(validationError);
    setFile(null);
    return;
  }

  setFile(droppedFile);
};



  // ==============================
  // UPLOAD + PARSE CSV
  // ==============================
  const handleUpload = () => {

     hasColumnsRef.current = false;
hasRowsRef.current = false;

    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError("");
    setRows([]);
    setColumns([]);

   

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      // Process large CSV in chunks
      chunkSize: 1024 * 1024,

      // Each chunk
      chunk: (results) => {
          // Check parsing errors
  if (results.errors && results.errors.length > 0) {
    console.warn("CSV parsing errors:", results.errors);
  }

  if (results.meta.fields && results.meta.fields.length > 0) {
  hasColumnsRef.current = true;
}

if (results.data && results.data.length > 0) {
  hasRowsRef.current = true;
}

        // Get columns
        if (results.errors && results.errors.length > 0) {
    console.warn("CSV parsing errors:", results.errors);
  }

  // Detect columns from parsed row
  if (results.data && results.data.length > 0) {
    const detectedColumns = Object.keys(results.data[0]);

    if (detectedColumns.length > 0) {
      hasColumnsRef.current = true;

      setColumns((previousColumns) => {
        if (previousColumns.length === 0) {
          return detectedColumns;
        }

        return previousColumns;
      });
    }

    // CSV contains data
    hasRowsRef.current = true;

    setRows((previousRows) => [
      ...previousRows,
      ...results.data,
    ]);
  }
        

        // Calculate progress
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

      // Completed
     complete: () => {
  setProgress(100);
  setIsUploading(false);

   if (!hasColumnsRef.current) {
    setError(
      "Invalid CSV file. No header columns were found."
    );
    setRows([]);
    setColumns([]);
    return;
  }

  if (!hasRowsRef.current) {
    setError(
      "The CSV file does not contain any data rows."
    );
    return;
  }
},
      // Error
      error: (parseError) => {
        console.error("CSV Error:", parseError);

        setError("Failed to read CSV file.");
        setIsUploading(false);
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
              w-[220px]
              shrink-0
              overflow-hidden
              text-ellipsis
              whitespace-nowrap
              px-4
              py-3
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
    <div className="min-h-screen bg-white p-5">

      {/* =================================
          PAGE HEADING
      ================================= */}
      <h1 className="text-4xl font-bold text-slate-900">
        Upload Files
      </h1>

      <p className="mt-2 text-lg text-slate-600">
        Upload your CSV files here.
      </p>

      {/* =================================
          UPLOAD AREA
      ================================= */}
 <div
  onDragOver={handleDragOver}
  onDragEnter={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  className={`
    mt-8
    flex
    min-h-[240px]
    flex-col
    items-center
    justify-center
    rounded-xl
    border-2
    border-dashed
    transition-all
    duration-200
    ${
      isDragging
        ? "border-blue-500 bg-blue-50 scale-[1.01]"
        : "border-slate-300 bg-white"
    }
  `}
>

       <h2 className="text-2xl font-semibold text-slate-900">
  {isDragging
    ? "Drop CSV File Here"
    : "Drag & Drop Files Here"}
</h2>

        <p className="mt-3 text-lg text-slate-500">
          or choose a file from your computer
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Choose File */}
        <button
          type="button"
          onClick={handleChooseFile}
          disabled={isUploading}
          className="
            mt-6
            rounded-lg
            bg-blue-600
            px-7
            py-4
            text-lg
            font-semibold
            text-white
            hover:bg-blue-700
            disabled:cursor-not-allowed
            disabled:bg-blue-300
          "
        >
          Choose File
        </button>

        {/* =================================
            SELECTED FILE
        ================================= */}
        {file && (
          <div className="mt-5 text-center">

            <p className="font-semibold text-green-600">
              File selected successfully
            </p>

            <p className="mt-1 text-slate-700">
              {file.name}
            </p>

            <p className="text-sm text-slate-500">
              {(file.size / 1024).toFixed(2)} KB
            </p>

            {/* Upload CSV */}
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="
                mt-4
                rounded-lg
                bg-green-600
                px-7
                py-3
                font-semibold
                text-white
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

        {/* =================================
            ERROR
        ================================= */}
        {error && (
          <p className="mt-4 font-medium text-red-600">
            {error}
          </p>
        )}

      </div>

      {/* =================================
          PROGRESS BAR
      ================================= */}
      {isUploading && (
        <div className="mx-auto mt-8 max-w-3xl">

          <div className="mb-2 flex justify-between">

            <span className="font-medium text-slate-700">
              Processing CSV...
            </span>

            <span className="font-semibold text-blue-600">
              {progress}%
            </span>

          </div>

          <div
            className="
              h-4
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

      {/* =================================
          CSV PREVIEW
      ================================= */}
      {rows.length > 0 && columns.length > 0 && (
        <div className="mt-10">

          {/* Preview heading */}
          <div
            className="
              mb-4
              flex
              items-center
              justify-between
            "
          >

            <h2 className="text-2xl font-bold text-slate-900">
              CSV Preview
            </h2>

            <span className="text-slate-600">
              {rows.length} rows × {columns.length} columns
            </span>

          </div>

          {/* =================================
              TABLE CONTAINER
          ================================= */}
          <div
            className="
              overflow-x-auto
              rounded-lg
              border
              border-slate-300
            "
          >

            {/* =================================
                TABLE HEADER
            ================================= */}
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
                    w-[220px]
                    shrink-0
                    border-b
                    border-slate-300
                    px-4
                    py-3
                    font-semibold
                    text-slate-800
                  "
                >
                  {column}
                </div>
              ))}

            </div>

            {/* =================================
                VIRTUALIZED ROWS
            ================================= */}
            <div className="min-w-max">

              <FixedSizeList
                height={500}
                itemCount={rows.length}
                itemSize={50}
                width={Math.max(
                  columns.length * 220,
                  800
                )}
              >
                {VirtualRow}
              </FixedSizeList>

            </div>

          </div>

          {/* Information */}
          <p className="mt-3 text-sm text-slate-500">
            Virtualized table: only visible rows are rendered.
          </p>

        </div>
      )}

    </div>
  );
}

export default Upload;