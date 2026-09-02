import React from "react";

export function SkeletonLoader({ rows = 4, className = "" }) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-12 bg-slate-800/60 rounded-lg w-full border border-slate-700/30" />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3 animate-pulse">
      <div className="h-4 bg-slate-800 rounded w-1/3" />
      <div className="h-8 bg-slate-800 rounded w-2/3" />
    </div>
  );
}

export default SkeletonLoader;
