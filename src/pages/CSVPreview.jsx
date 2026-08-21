import { useLocation, useNavigate } from "react-router-dom";
import CSVPreviewTable from "../components/CSVPreviewTable";

function CSVPreview() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state;

  // --------------------------------------------------
  // NO CSV DATA
  // --------------------------------------------------

  if (
    !state ||
    !state.fileName ||
    !Array.isArray(state.headers) ||
    !Array.isArray(state.rows)
  ) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">

        <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center">

          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

            {/* Icon */}

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
              📄
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-800">
              No CSV file found
            </h1>

            <p className="mx-auto mt-2 max-w-md text-slate-500">
              There is no CSV data available to preview.
              Please upload a CSV file first.
            </p>

            <button
              onClick={() => navigate("/")}
              className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Go to Upload
            </button>

          </div>

        </div>

      </div>
    );
  }

  const { fileName, headers, rows } = state;

  // --------------------------------------------------
  // EMPTY CSV DATA
  // --------------------------------------------------

  if (
    headers.length === 0 ||
    rows.length === 0
  ) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 py-10">

        <div className="mx-auto max-w-2xl">

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-8 text-center">

            <div className="text-4xl">
              ⚠️
            </div>

            <h1 className="mt-4 text-2xl font-bold text-yellow-800">
              No preview data available
            </h1>

            <p className="mt-2 text-yellow-700">
              This CSV file does not contain enough data
              to display a preview.
            </p>

            <button
              onClick={() => navigate("/")}
              className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              Upload Another CSV
            </button>

          </div>

        </div>

      </div>
    );
  }

  // --------------------------------------------------
  // MAIN PREVIEW PAGE
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">

      <div className="mx-auto max-w-7xl">

        {/* PAGE HEADER */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            {/* File information */}

            <div className="min-w-0">

              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                CSV Preview
              </p>

              <h1 className="mt-1 break-all text-2xl font-bold text-slate-800 sm:text-3xl">
                {fileName}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2">

                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  {rows.length} rows
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                  {headers.length} columns
                </span>

              </div>

            </div>

            {/* Upload another button */}

            <button
              onClick={() => navigate("/")}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
            >
              Upload Another CSV
            </button>

          </div>

        </div>

        {/* PREVIEW INFORMATION */}

        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">

          <p className="text-sm text-blue-800">

            <span className="font-semibold">
              Preview:
            </span>{" "}

            Your CSV data is displayed below. Large files
            use virtualized scrolling for better performance.

          </p>

        </div>

        {/* CSV TABLE */}

        <CSVPreviewTable
          headers={headers}
          rows={rows}
        />

      </div>

    </div>
  );
}

export default CSVPreview;