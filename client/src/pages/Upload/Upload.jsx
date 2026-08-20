import { useRef, useState } from "react";
import Papa from "papaparse";
import { FixedSizeList } from "react-window";

function Upload() {
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

  const [transformRules, setTransformRules] = useState({
  trim: false,
  uppercase: false,
  lowercase: false,
  removeEmpty: false,
  removeDuplicates: false,
});
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  //Transformation function
  
const applyTransformations = () => {
  let transformed = [...rows];

  // Remove empty rows
  if (transformRules.removeEmpty) {
    transformed = transformed.filter((row) =>
      Object.values(row).some(
        (value) => String(value ?? "").trim() !== ""
      )
    );
  }

  // Transform values
  transformed = transformed.map((row) => {
    const newRow = {};

    Object.entries(row).forEach(([key, value]) => {
      let newValue = String(value ?? "");

      if (transformRules.trim) {
        newValue = newValue.trim();
      }

      if (transformRules.uppercase) {
        newValue = newValue.toUpperCase();
      }

      if (transformRules.lowercase) {
        newValue = newValue.toLowerCase();
      }

      newRow[key] = newValue;
    });

    return newRow;
  });

  // Remove duplicates
  if (transformRules.removeDuplicates) {
    const seen = new Set();

    transformed = transformed.filter((row) => {
      const key = JSON.stringify(row);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  setRows(transformed);
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






<div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
  <h2 className="mb-4 text-xl font-semibold text-gray-900">
    CSV Transformation Rules
  </h2>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={transformRules.trim}
        onChange={(e) =>
          setTransformRules({
            ...transformRules,
            trim: e.target.checked,
          })
        }
        className="h-4 w-4"
      />
      <span className="text-gray-700">
        Trim whitespace
      </span>
    </label>

    <label className="flex cursor-pointer items-center gap-3">
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
        className="h-4 w-4"
      />
      <span className="text-gray-700">
        Convert text to UPPERCASE
      </span>
    </label>

    <label className="flex cursor-pointer items-center gap-3">
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
        className="h-4 w-4"
      />
      <span className="text-gray-700">
        Convert text to lowercase
      </span>
    </label>

    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={transformRules.removeEmpty}
        onChange={(e) =>
          setTransformRules({
            ...transformRules,
            removeEmpty: e.target.checked,
          })
        }
        className="h-4 w-4"
      />
      <span className="text-gray-700">
        Remove empty rows
      </span>
    </label>

    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={transformRules.removeDuplicates}
        onChange={(e) =>
          setTransformRules({
            ...transformRules,
            removeDuplicates: e.target.checked,
          })
        }
        className="h-4 w-4"
      />
      <span className="text-gray-700">
        Remove duplicate rows
      </span>
    </label>

  </div>

  <button
    type="button"
    onClick={applyTransformations}
    disabled={!rows.length}
    className="mt-5 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
  >
    Apply Transformations
  </button>
</div>

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