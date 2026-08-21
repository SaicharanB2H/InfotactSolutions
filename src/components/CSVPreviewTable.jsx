import { List } from "react-window";

function CSVPreviewTable({ headers = [], rows = [] }) {
  const rowHeight = 52;
  const columnWidth = 180;

  const totalWidth = Math.max(
    headers.length * columnWidth,
    100
  );

  const gridColumns = headers
    .map(() => `${columnWidth}px`)
    .join(" ");

  const Row = ({ index, style }) => {
    const row = rows[index] || {};

    return (
      <div
        style={{
          ...style,
          display: "grid",
          gridTemplateColumns: gridColumns,
          width: totalWidth,
        }}
        className="border-b border-slate-200 bg-white hover:bg-slate-50"
      >
        {headers.map((header, columnIndex) => (
          <div
            key={columnIndex}
            className="flex items-center overflow-hidden border-r border-slate-200 px-5 text-sm text-slate-700"
            title={String(row[header] ?? "")}
          >
            <span className="truncate">
              {row[header] ?? ""}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (headers.length === 0) {
    return (
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-500">
          No CSV columns found.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">

      {/* PREVIEW TITLE */}

      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-800">
          CSV Preview
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {rows.length} rows × {headers.length} columns
        </p>
      </div>

      {/* TABLE CONTAINER */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* MOBILE / HORIZONTAL SCROLL */}

        <div className="w-full overflow-x-auto">

          <div
            style={{
              minWidth: totalWidth,
            }}
          >

            {/* TABLE HEADER */}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: gridColumns,
                width: totalWidth,
              }}
              className="bg-slate-800 text-white"
            >

              {headers.map((header, index) => (
                <div
                  key={index}
                  className="border-r border-slate-700 px-5 py-4 text-sm font-semibold"
                >
                  {header}
                </div>
              ))}

            </div>

            {/* TABLE BODY */}

            {rows.length > 0 ? (

              <List
                rowComponent={Row}
                rowCount={rows.length}
                rowHeight={rowHeight}
                rowProps={{}}
                style={{
                  height: Math.min(
                    rows.length * rowHeight,
                    400
                  ),
                  width: "100%",
                  minWidth: totalWidth,
                }}
              />

            ) : (

              <div className="p-8 text-center text-slate-500">
                No data rows found in this CSV file.
              </div>

            )}

          </div>

        </div>

      </div>

      {/* TABLE HELP */}

      <p className="mt-3 text-xs text-slate-400">
        Scroll horizontally to view additional columns.
      </p>

    </section>
  );
}

export default CSVPreviewTable;