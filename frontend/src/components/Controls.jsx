import React from 'react';
import { SlidersHorizontal, Calendar, Clock, Layers } from 'lucide-react';

export default function Controls({
  presets,
  selectedPreset,
  onSelectPreset,
  cutoffType,
  setCutoffType,
  dayAheadTimeUtc,
  setDayAheadTimeUtc,
  leadTimeHours,
  setLeadTimeHours,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  alignmentMode,
  setAlignmentMode,
}) {
  const quickRanges = [
    { label: 'Full Jan 2026', start: '2026-01-01', end: '2026-01-31' },
    { label: 'Week 1', start: '2026-01-01', end: '2026-01-07' },
    { label: 'Week 2', start: '2026-01-08', end: '2026-01-14' },
    { label: 'High-Wind Storm (Jan 15-18)', start: '2026-01-15', end: '2026-01-18' },
    { label: 'Week 4', start: '2026-01-22', end: '2026-01-28' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg shadow-black/30">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Cutoff Preset & Time Rules */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span>Auction Gate Rule:</span>
          </div>

          <select
            value={selectedPreset}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="custom">Custom Parameters</option>
          </select>

          {/* If custom or day ahead fixed */}
          {cutoffType === 'day_ahead_fixed_time' && (
            <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">D-1 Cutoff:</span>
              <input
                type="time"
                value={dayAheadTimeUtc}
                onChange={(e) => {
                  setDayAheadTimeUtc(e.target.value);
                  onSelectPreset('custom');
                }}
                className="bg-transparent text-slate-200 font-mono text-xs focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 font-semibold">UTC</span>
            </div>
          )}

          {cutoffType === 'lead_time_hours' && (
            <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Lead Time:</span>
              <input
                type="number"
                min="1"
                max="72"
                value={leadTimeHours || 24}
                onChange={(e) => {
                  setLeadTimeHours(parseFloat(e.target.value));
                  onSelectPreset('custom');
                }}
                className="w-12 bg-transparent text-slate-200 font-mono text-xs focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 font-semibold">Hours</span>
            </div>
          )}

          {/* Alignment Mode Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg text-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Grid:</span>
            <select
              value={alignmentMode}
              onChange={(e) => setAlignmentMode(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none"
            >
              <option value="hourly_exact" className="bg-slate-900 text-white">Hourly Exact (744 pts)</option>
              <option value="half_hourly_mapped" className="bg-slate-900 text-white">Half-Hourly Mapped (1,488 SPs)</option>
            </select>
          </div>
        </div>

        {/* Right: Date Range Selector & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <input
              type="date"
              min="2026-01-01"
              max="2026-01-31"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              min="2026-01-01"
              max="2026-01-31"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none"
            />
          </div>

          <div className="hidden sm:flex items-center space-x-1">
            {quickRanges.map((q) => (
              <button
                key={q.label}
                onClick={() => {
                  setStartDate(q.start);
                  setEndDate(q.end);
                }}
                className={`text-[11px] px-2 py-1 rounded transition ${
                  startDate === q.start && endDate === q.end
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
