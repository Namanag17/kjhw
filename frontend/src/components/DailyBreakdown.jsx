import React, { useEffect, useState } from 'react';
import { fetchDailyMetrics } from '../api';
import { CalendarDays } from 'lucide-react';

export default function DailyBreakdown({ filterParams }) {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchDailyMetrics(filterParams)
      .then((res) => {
        setDays(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [JSON.stringify(filterParams)]);

  const formatDayName = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/30">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">
              Daily Accuracy & Outturn Ledger (January 2026)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Identify specific days impacted by high meteorological uncertainty, cold snaps, or frontal passages.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading daily ledger...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Evaluated SPs</th>
                <th className="py-2.5 px-3 text-right">MAE (MW)</th>
                <th className="py-2.5 px-3 text-right">RMSE (MW)</th>
                <th className="py-2.5 px-3 text-right">Bias (MW)</th>
                <th className="py-2.5 px-3 text-right">Avg Actual (MW)</th>
                <th className="py-2.5 px-3 text-right">Avg Forecast (MW)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {days.map((day) => {
                const isOver = day.bias > 0;
                return (
                  <tr key={day.date} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-3 font-sans text-slate-200 font-medium">
                      {formatDayName(day.date)}
                    </td>
                    <td className="py-2 px-3 text-slate-400">{day.sample_size}</td>
                    <td className="py-2 px-3 text-right text-cyan-400 font-semibold">{day.mae.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{day.rmse.toLocaleString()}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${isOver ? 'text-amber-400' : 'text-blue-400'}`}>
                      {day.bias > 0 ? `+${day.bias.toLocaleString()}` : day.bias.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-400">{day.avg_actual.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-amber-300">{day.avg_forecast.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
