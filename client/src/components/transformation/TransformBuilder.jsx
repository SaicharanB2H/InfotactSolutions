import React, { useState } from "react";
import { FiPlus, FiTrash2, FiCode, FiSliders, FiCheckCircle } from "react-icons/fi";

const TRANSFORM_TYPES = [
  { id: "uppercase", label: "UPPERCASE", description: "Convert string values to uppercase" },
  { id: "lowercase", label: "lowercase", description: "Convert string values to lowercase" },
  { id: "trim", label: "Trim Whitespace", description: "Remove leading and trailing spaces" },
  { id: "remove_whitespace", label: "Remove All Whitespace", description: "Strip all spaces from text" },
  { id: "prefix", label: "Add Prefix", description: "Prepend custom text string" },
  { id: "suffix", label: "Add Suffix", description: "Append custom text string" },
  { id: "custom", label: "Custom JavaScript (Sandbox)", description: "Secure isolated sandbox transformation" },
];

export function TransformBuilder({ sourceColumns = [], transformations = [], onChange }) {
  const [selectedColumn, setSelectedColumn] = useState(sourceColumns[0] || "");
  const [transformType, setTransformType] = useState("uppercase");
  const [customParam, setCustomParam] = useState("");
  const [customCode, setCustomCode] = useState("return String(value).trim().toUpperCase();");

  const handleAddTransform = () => {
    if (!selectedColumn) return;

    const newRule = {
      id: `rule_${Date.now()}`,
      column: selectedColumn,
      type: transformType,
      param: customParam,
      code: transformType === "custom" ? customCode : null,
      enabled: true,
    };

    onChange([...transformations, newRule]);
    setCustomParam("");
  };

  const handleRemoveTransform = (id) => {
    onChange(transformations.filter((t) => t.id !== id));
  };

  const handleToggleTransform = (id) => {
    onChange(
      transformations.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  };

  return (
    <div className="space-y-6">
      {/* Transformation Form Card */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <FiSliders className="text-indigo-400" /> Apply Data Transformation
            </h3>
            <p className="text-xs text-slate-400">
              Transformations execute safely inside backend stream pipeline sandboxes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Target Column Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Column</label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
            >
              {sourceColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          {/* Transform Rule Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Transformation Rule</label>
            <select
              value={transformType}
              onChange={(e) => setTransformType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
            >
              {TRANSFORM_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Add Rule Trigger */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAddTransform}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg shadow-md transition-all cursor-pointer"
            >
              <FiPlus className="w-4 h-4" /> Add Transformation Rule
            </button>
          </div>
        </div>

        {/* Param/Prefix input if needed */}
        {(transformType === "prefix" || transformType === "suffix") && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Value String ({transformType})
            </label>
            <input
              type="text"
              value={customParam}
              onChange={(e) => setCustomParam(e.target.value)}
              placeholder="e.g. USER_"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none"
            />
          </div>
        )}

        {/* Custom JS Code Box */}
        {transformType === "custom" && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FiCode className="text-cyan-400" /> Custom JS Code (Sandbox String)
            </label>
            <textarea
              rows={3}
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-cyan-300 outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-500">
              The function receives <code className="text-cyan-400">value</code> string and must return transformed string value.
            </p>
          </div>
        )}
      </div>

      {/* Applied Rules List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Configured Transformation Rules ({transformations.length})
        </h4>

        {transformations.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No transformations added yet. Data will pass through as parsed.
          </div>
        ) : (
          <div className="space-y-2">
            {transformations.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition-all"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={rule.enabled !== false}
                    onChange={() => handleToggleTransform(rule.id)}
                    className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/40">
                        {rule.column}
                      </span>
                      <span className="text-xs font-semibold text-slate-200 uppercase">
                        {rule.type}
                      </span>
                      {rule.param && (
                        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                          "{rule.param}"
                        </span>
                      )}
                    </div>
                    {rule.code && (
                      <p className="mt-1 font-mono text-[11px] text-cyan-400 truncate max-w-md">
                        {rule.code}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveTransform(rule.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TransformBuilder;
