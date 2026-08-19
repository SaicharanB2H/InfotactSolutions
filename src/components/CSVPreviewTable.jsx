import { List } from "react-window";

function CSVPreviewTable({ headers, rows }) {
  const rowHeight = 48;
  const tableHeight = 500;

  const Row = ({ index, style }) => {
    const row = rows[index];

    return (
      <div
        style={style}
        className="flex border-b border-gray-200 bg-white hover:bg-gray-50"
      >
        {headers.map((header, columnIndex) => (
          <div
            key={columnIndex}
            className="min-w-[180px] flex-1 truncate px-6 py-3 text-sm text-gray-700"
            title={row[header]}
          >
            {row[header]}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mt-8">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          CSV Preview
        </h2>

        <p className="text-sm text-gray-500">
          {rows.length} rows × {headers.length} columns
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        {/* Table Header */}
        <div className="flex min-w-max bg-gray-800 text-left text-white">
          {headers.map((header, index) => (
            <div
              key={index}
              className="min-w-[180px] flex-1 px-6 py-4 text-sm font-semibold"
            >
              {header}
            </div>
          ))}
        </div>

        {/* Virtualized Rows */}
        <div className="min-w-max">
          <List
            rowCount={rows.length}
            rowHeight={rowHeight}
            rowComponent={Row}
            rowProps={{}}
            style={{
              height: tableHeight,
              width: "100%",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default CSVPreviewTable;