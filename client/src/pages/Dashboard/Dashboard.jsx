const Dashboard = () => {
  const stats = [
    {
      title: "Total Uploads",
      value: "12",
    },
    {
      title: "Last Upload",
      value: "users_data.csv",
    },
    {
      title: "Total Rows",
      value: "25,430",
    },
    {
      title: "Failed Rows",
      value: "120",
    },
  ];

  const uploads = [
    {
      file: "users.csv",
      rows: "5,000",
      status: "Completed",
      date: "Today",
    },
    {
      file: "sales.csv",
      rows: "3,200",
      status: "Processing",
      date: "Today",
    },
    {
      file: "products.csv",
      rows: "1,200",
      status: "Failed",
      date: "Yesterday",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Welcome to StreamWeaver
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-xl bg-white p-6 shadow-sm"
          >
            <p className="text-sm text-gray-500">
              {stat.title}
            </p>

            <h2 className="mt-2 text-2xl font-bold text-gray-900">
              {stat.value}
            </h2>
          </div>
        ))}
      </div>

      {/* Processing Status */}
      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-semibold text-gray-900">
          Processing Status
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-gray-600">
              Completed
            </p>

            <p className="mt-1 text-2xl font-bold text-green-600">
              8
            </p>
          </div>

          <div className="rounded-lg bg-yellow-50 p-4">
            <p className="text-sm text-gray-600">
              Processing
            </p>

            <p className="mt-1 text-2xl font-bold text-yellow-600">
              2
            </p>
          </div>

          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-gray-600">
              Failed
            </p>

            <p className="mt-1 text-2xl font-bold text-red-600">
              1
            </p>
          </div>
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="mt-8 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-semibold text-gray-900">
          Recent Uploads
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-sm text-gray-500">
                <th className="px-4 py-3">File Name</th>
                <th className="px-4 py-3">Rows</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>

            <tbody>
              {uploads.map((upload) => (
                <tr
                  key={upload.file}
                  className="border-b last:border-0"
                >
                  <td className="px-4 py-4 font-medium">
                    {upload.file}
                  </td>

                  <td className="px-4 py-4">
                    {upload.rows}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm ${
                        upload.status === "Completed"
                          ? "bg-green-100 text-green-700"
                          : upload.status === "Processing"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {upload.status}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-gray-600">
                    {upload.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;