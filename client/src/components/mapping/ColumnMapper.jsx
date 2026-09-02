import React from "react";
import { FiArrowRight, FiTrash2, FiPlus, FiZap, FiAlertTriangle, FiCheck } from "react-icons/fi";

export function ColumnMapper({ sourceColumns = [], mapping = {}, onChange }) {
  // Mapping structure: { [sourceCol]: destinationField }

  const handleDestinationChange = (sourceCol, destVal) => {
    const updated = { ...mapping, [sourceCol]: destVal };
    onChange(updated);
  };

  const handleRemoveMapping = (sourceCol) => {
    const updated = { ...mapping };
    delete updated[sourceCol];
    onChange(updated);
  };

  const handleAutoMap = () => {
    const autoMapped = {};
    sourceColumns.forEach((col) => {
      // Clean column name to camelCase or sanitized name
      const clean = col
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, "");
      autoMapped[col] = clean || col;
    });
    onChange(autoMapped);
  };

  const mappedCount = Object.keys(mapping).length;
  const unmappedCount = sourceColumns.length - mappedCount;

  return (
    <div className="space-y-6">
      {/* Mapper Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Column Field Mapping</h3>
          <p className="text-xs text-slate-400">Map dataset CSV columns to target collection schema fields.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAutoMap}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <FiZap className="w-3.5 h-3.5 text-indigo-400" />
            Auto-Map All Fields
          </button>
        </div>
      </div>

      {/* Mapping Status summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Mapped Columns</span>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {mappedCount} / {sourceColumns.length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">Unmapped Columns</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            unmappedCount > 0
              ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
              : "text-slate-400 bg-slate-800"
          }`}>
            {unmappedCount}
          </span>
        </div>
      </div>

      {/* Mapping Rows Table */}
      <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-3 bg-slate-900/80 border-b border-slate-800 text-xs font-semibold text-slate-400">
          <div className="col-span-5">Source CSV Column</div>
          <div className="col-span-1 text-center">→</div>
          <div className="col-span-5">Destination MongoDB Field</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
          {sourceColumns.map((col) => {
            const isMapped = Boolean(mapping[col]);
            const destValue = mapping[col] || "";

            return (
              <div key={col} className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-slate-900/40 transition-colors">
                <div className="col-span-5 flex items-center gap-2 pr-2">
                  <span className="font-mono text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-800/40 px-2.5 py-1 rounded-md truncate">
                    {col}
                  </span>
                </div>

                <div className="col-span-1 flex justify-center text-slate-500">
                  <FiArrowRight className="w-4 h-4 text-slate-600" />
                </div>

                <div className="col-span-5 pr-2">
                  <input
                    type="text"
                    value={destValue}
                    placeholder={`e.g. ${col.toLowerCase().replace(/[^a-z0-9]/g, "")}`}
                    onChange={(e) => handleDestinationChange(col, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono outline-none transition-all"
                  />
                </div>

                <div className="col-span-1 text-right">
                  {isMapped ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveMapping(col)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Clear mapping"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-amber-400/80 italic">Unmapped</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ColumnMapper;
