import React from 'react';
import { Wind, ShieldCheck, Database, FileText } from 'lucide-react';

export default function Header({ validationData, onOpenAudit, onOpenDocs }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Branding & Desk Title */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Wind className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                WindProcure UK <span className="text-cyan-400 text-sm font-semibold ml-1.5 px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800">Day-Ahead Desk</span>
              </h1>
              <span className="text-xs text-slate-400 border-l border-slate-700 pl-2"> 2026 Procurement</span>
            </div>
            <p className="text-xs text-slate-400">
              National Grid ESO / Elexon BMRS Stream Integration 
            </p>
          </div>
        </div>

        {/* Live Badges & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {validationData && (
            <button
              onClick={onOpenAudit}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-700/50 text-emerald-300 hover:bg-emerald-900/50 transition cursor-pointer"
              title="Click to view full 1,488 interval audit"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Coverage: <strong>{validationData.coverage_pct}%</strong> ({validationData.actual_intervals_found}/{validationData.expected_intervals} SPs)</span>
            </button>
          )}

          <div className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>19,272 Forecasts • 264 Runs</span>
          </div>

          <button
            onClick={onOpenDocs}
            className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-950/50 border border-indigo-700/60 text-indigo-300 hover:bg-indigo-900/60 transition cursor-pointer font-medium"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Client Pitch & Tech Specs</span>
          </button>
        </div>
      </div>
    </header>
  );
}
