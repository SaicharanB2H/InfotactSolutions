import React from "react";
import { FiInbox } from "react-icons/fi";

export function EmptyState({ title, description, actionText, onAction, icon: Icon = FiInbox }) {
  return (
    <div className="py-12 px-4 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
      <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-medium text-slate-200">{title || "No data available"}</h3>
      <p className="mt-1 text-sm text-slate-400 max-w-sm mx-auto">
        {description || "Get started by creating your first item or importing data."}
      </p>
      {actionText && onAction && (
        <div className="mt-6">
          <button
            onClick={onAction}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
