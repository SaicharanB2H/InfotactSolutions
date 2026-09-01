import React, { useEffect, useState } from "react";
import { getJobStatus } from "../../services/jobService";

const ImportHistory = () => {
  const [selectedImport, setSelectedImport] = useState(null);
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    const loadImportHistory = async () => {
      try {
        setLoading(true);
        setHistoryError("");

        const savedImports = JSON.parse(
          localStorage.getItem("streamweaver_imports") || "[]",
        );

        if (!Array.isArray(savedImports) || savedImports.length === 0) {
          setImports([]);
          return;
        }

        const history = await Promise.all(
          savedImports.map(async (item) => {
            try {
              const job = await getJobStatus(item.jobId);

              console.log("Job history response:", job);

              // Safely read numeric values
              const totalRows = Number(job?.totalRows) || 0;
              const processedRows = Number(job?.processedRows) || 0;
              const failedRows = Number(job?.failedRows) || 0;
              const rowsPerSecond = Number(job?.rowsPerSecond) || 0;

              // If backend totalRows is 0,
              // calculate total from processed + failed.
              const calculatedTotalRows =
                totalRows > 0 ? totalRows : processedRows + failedRows;

              const status = job?.status
                ? String(job.status).toLowerCase()
                : "unknown";

              return {
                id: job?._id || item.jobId,

                file: job?.fileName || item.fileName || "Unknown file",

                status: status.charAt(0).toUpperCase() + status.slice(1),

                rows: calculatedTotalRows,

                processedRows,

                failed: failedRows,

                speed:
                  rowsPerSecond > 0
                    ? `${rowsPerSecond.toLocaleString()}/s`
                    : "—",

                date: new Date(
                  job?.createdAt || job?.startedAt || item.createdAt,
                ).toLocaleDateString(),
              };
            } catch (error) {
              console.error(`Failed to fetch job ${item.jobId}:`, error);

              return {
                id: item.jobId,

                file: item.fileName || "Unknown file",

                status: "Unknown",

                rows: 0,

                processedRows: 0,

                failed: 0,

                speed: "—",

                date: item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString()
                  : "—",
              };
            }
          }),
        );

        console.log("Final import history:", history);

        setImports(history);
      } catch (error) {
        console.error("Failed to load import history:", error);

        setHistoryError("Failed to load import history.");
      } finally {
        setLoading(false);
      }
    };

    loadImportHistory();
  }, []);

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700";

      case "processing":
        return "bg-blue-100 text-blue-700";

      case "failed":
        return "bg-red-100 text-red-700";

      case "cancelled":
        return "bg-yellow-100 text-yellow-700";

      case "pending":
        return "bg-gray-100 text-gray-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Import History</h1>

        <p className="mt-2 text-gray-600">
          View and monitor your previous CSV imports.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-8">
        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Total Imports</p>

          <p className="mt-2 text-2xl font-bold">{imports.length}</p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Completed</p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {
              imports.filter(
                (item) => item.status?.toLowerCase() === "completed",
              ).length
            }
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Processing</p>

          <p className="mt-2 text-2xl font-bold text-blue-600">
            {
              imports.filter(
                (item) => item.status?.toLowerCase() === "processing",
              ).length
            }
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm border">
          <p className="text-sm text-gray-500">Failed</p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {
              imports.filter((item) => item.status?.toLowerCase() === "failed")
                .length
            }
          </p>
        </div>
      </div>

      {loading && (
        <div className="mb-4 rounded-lg bg-blue-50 p-4 text-blue-700">
          Loading import history...
        </div>
      )}

      {historyError && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
          {historyError}
        </div>
      )}
      {/* History Table */}
      <div className="rounded-xl bg-white shadow-sm border overflow-hidden">
        <div className="border-b p-6">
          <h2 className="text-xl font-semibold">Recent Imports</h2>

          <p className="mt-1 text-sm text-gray-500">
            Your latest CSV import jobs
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold">File</th>

                <th className="px-6 py-4 text-sm font-semibold">Status</th>

                <th className="px-6 py-4 text-sm font-semibold">Rows</th>

                <th className="px-6 py-4 text-sm font-semibold">Failed</th>

                <th className="px-6 py-4 text-sm font-semibold">Speed</th>

                <th className="px-6 py-4 text-sm font-semibold">Date</th>

                <th className="px-6 py-4 text-sm font-semibold">Action</th>
              </tr>
            </thead>

            <tbody>
              {imports.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{item.file}</td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm ${getStatusStyle(
                        item.status,
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>

                  <td className="px-6 py-4">{item.rows.toLocaleString()}</td>

                  <td className="px-6 py-4">{item.failed.toLocaleString()}</td>

                  <td className="px-6 py-4">{item.speed}</td>

                  <td className="px-6 py-4 text-gray-500">{item.date}</td>

                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedImport(item)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedImport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedImport(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Import Details
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Detailed information about this import
                </p>
              </div>

              <button
                onClick={() => setSelectedImport(null)}
                className="text-2xl text-gray-400 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Details */}
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between border-b pb-3">
                  <span className="text-gray-500">File</span>

                  <span className="font-semibold">{selectedImport.file}</span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-gray-500">Status</span>

                  <span
                    className={`rounded-full px-3 py-1 text-sm ${getStatusStyle(
                      selectedImport.status,
                    )}`}
                  >
                    {selectedImport.status}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-gray-500">Total Rows</span>

                  <span className="font-semibold">
                    {selectedImport.rows.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-gray-500">Processed Rows</span>

                  <span className="font-semibold text-green-600">
                    {selectedImport.processedRows.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-gray-500">Failed Rows</span>

                  <span className="font-semibold text-red-600">
                    {selectedImport.failed.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between border-b pb-3">
                  <span className="text-gray-500">Processing Speed</span>

                  <span className="font-semibold">{selectedImport.speed}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>

                  <span className="font-semibold">{selectedImport.date}</span>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="mt-6 flex justify-end gap-3">
                {selectedImport.failed > 0 && (
                  <button
                    className="rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      alert(
                        `There are ${selectedImport.failed} failed rows. Error details will be connected to the backend later.`,
                      );
                    }}
                  >
                    View Errors
                  </button>
                )}

                <button
                  onClick={() => setSelectedImport(null)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportHistory;
