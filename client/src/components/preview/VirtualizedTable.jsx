import React, { useMemo } from "react";
import { FixedSizeList as List } from "react-window";

export function VirtualizedTable({ columns = [], rows = [], height = 420 }) {
  if (!columns || columns.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm border border-slate-800 rounded-xl bg-slate-900/50">
        No columns detected in preview data.
      </div>
    );
  }

  // Calculate approximate width per column
  const columnWidth = 180;
  const indexWidth = 60;
  const totalWidth = indexWidth + columns.length * columnWidth;

  const Row = ({ index, style }) => {
    const rowData = rows[index] || {};
    const isEven = index % 2 === 0;

    return (
      <div
        style={style}
        className={`flex items-center text-xs font-mono border-b border-slate-800/60 ${
          isEven ? "bg-slate-950/40" : "bg-slate-900/30"
        } hover:bg-indigo-500/10 transition-colors`}
      >
        <div
          style={{ width: indexWidth }}
          className="flex-shrink-0 px-3 py-2 text-slate-500 text-right font-sans font-semibold border-r border-slate-800/40"
        >
          {index + 1}
        </div>
        {columns.map((col) => {
          const val = rowData[col];
          const isEmpty = val === undefined || val === null || val === "";
          return (
            <div
              key={col}
              style={{ width: columnWidth }}
              className="flex-shrink-0 px-3 py-2 truncate text-slate-300 border-r border-slate-800/30"
              title={String(val ?? "")}
            >
              {isEmpty ? (
                <span className="text-slate-600 italic text-[11px]">&lt;null&gt;</span>
              ) : (
                String(val)
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden shadow-inner">
      {/* Table Header */}
      <div className="overflow-x-auto border-b border-slate-800 bg-slate-900/80">
        <div style={{ minWidth: totalWidth }} className="flex items-center text-xs font-semibold text-slate-300 py-2.5">
          <div style={{ width: indexWidth }} className="flex-shrink-0 px-3 text-right text-slate-500 border-r border-slate-800">
            #
          </div>
          {columns.map((col) => (
            <div
              key={col}
              style={{ width: columnWidth }}
              className="flex-shrink-0 px-3 truncate text-indigo-400 border-r border-slate-800/60"
            >
              {col}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Body */}
      <div className="overflow-x-auto">
        <div style={{ width: Math.max(totalWidth, 600) }}>
          <List
            height={height}
            itemCount={rows.length}
            itemSize={36}
            width={totalWidth}
          >
            {Row}
          </List>
        </div>
      </div>

      {/* Table Footer Stats */}
      <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Showing {rows.length.toLocaleString()} virtualized preview records</span>
        <span>{columns.length} columns detected</span>
      </div>
    </div>
  );
}

export default VirtualizedTable;
