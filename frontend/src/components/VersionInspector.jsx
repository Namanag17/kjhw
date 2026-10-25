import React, { useEffect, useState } from 'react';
import { fetchVersions } from '../api';
import { History } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function VersionInspector({
  selectedInterval,
  cutoffConfig,
  onClose,
}) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedInterval) return;
    setLoading(true);
    setError(null);
    fetchVersions(selectedInterval, cutoffConfig)
      .then((data) => {
        setVersions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedInterval, cutoffConfig]);

  if (!selectedInterval) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-300">Select a Delivery Interval</p>
        <p className="text-xs text-slate-500 mt-1">
          Click any point on the chart or row in the table to inspect how its forecast evolved across 20+ publication runs.
        </p>
      </div>
    );
  }

  const selectedDecision = versions.find((v) => v.is_selected_at_cutoff);
  const latestRun = versions.find((v) => v.is_latest);

  // Chart data: ordered by publication time
  const timelineChartData = versions.map((v) => ({
    publishTime: v.publish_time.slice(5, 16).replace('T', ' '),
    horizon: `${v.horizon_hours}h`,
    generation: v.forecast_generation,
    isSelected: v.is_selected_at_cutoff,
    isEligible: v.is_decision_eligible,
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/30">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">
              Historical Forecast Evolution & Cutoff Audit
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Target Delivery Interval:{' '}
            <span className="font-mono font-bold text-cyan-300">
              {selectedInterval.replace('T', ' ').replace('Z', ' UTC')}
            </span>
          </p>
        </div>

        {selectedDecision && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
              Committed at Cutoff: <strong>{selectedDecision.forecast_generation.toLocaleString()} MW</strong>
            </span>
            {latestRun && (
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 font-medium">
                Final Intraday: <strong>{latestRun.forecast_generation.toLocaleString()} MW</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading publication runs...</div>
      ) : error ? (
        <div className="py-6 text-center text-xs text-red-400">Error loading versions: {error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
          {/* Left: Forecast Evolution Chart (as lead time shrinks) */}
          <div className="lg:col-span-6 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">
              Forecast Trajectory by Publication Lead Time
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="publishTime" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} unit=" MW" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs">
                          <div className="font-semibold text-slate-200">{d.publishTime} UTC</div>
                          <div className="text-slate-400">Horizon: {d.horizon} prior</div>
                          <div className="font-mono font-bold text-amber-400">{d.generation.toLocaleString()} MW</div>
                          {d.isSelected && <div className="text-amber-300 text-[10px] font-bold">★ Selected at Decision Cutoff</div>}
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="generation"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (payload.isSelected) {
                        return <circle cx={cx} cy={cy} r={6} fill="#f59e0b" stroke="#ffffff" strokeWidth={2} />;
                      }
                      return <circle cx={cx} cy={cy} r={3} fill="#64748b" />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              <span className="text-amber-400 font-semibold">● Larger Gold Dot</span> marks the exact forecast locked at the Day-Ahead auction deadline.
            </p>
          </div>

          {/* Right: Detailed Publications Audit Table */}
          <div className="lg:col-span-6 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 overflow-hidden flex flex-col">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">
              All Publication Runs ({versions.length} Total Runs)
            </h4>
            <div className="overflow-y-auto max-h-60 text-xs divide-y divide-slate-800/80">
              <table className="w-full text-left">
                <thead className="text-[11px] text-slate-400 bg-slate-900/80 sticky top-0">
                  <tr>
                    <th className="py-1.5 px-2">Publication (UTC)</th>
                    <th className="py-1.5 px-2">Lead Time</th>
                    <th className="py-1.5 px-2 text-right">Forecast (MW)</th>
                    <th className="py-1.5 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {versions.map((v, i) => (
                    <tr
                      key={v.publish_time}
                      className={`${
                        v.is_selected_at_cutoff
                          ? 'bg-amber-500/15 font-semibold text-amber-200'
                          : v.is_latest
                          ? 'bg-sky-500/10 text-sky-200'
                          : 'text-slate-300 hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-1.5 px-2 font-mono text-[11px]">{v.publish_time.replace('T', ' ').replace('Z', '')}</td>
                      <td className="py-1.5 px-2 text-slate-400">{v.horizon_hours}h ahead</td>
                      <td className="py-1.5 px-2 text-right font-mono font-medium">
                        {v.forecast_generation.toLocaleString()}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {v.is_selected_at_cutoff ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40">
                            ★ Selected
                          </span>
                        ) : v.is_latest ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            Latest
                          </span>
                        ) : v.is_decision_eligible ? (
                          <span className="text-[10px] text-slate-400">Eligible</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Post-cutoff</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
