import React, { useEffect, useState } from 'react';
import { fetchPeriodMetrics } from '../api';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { SunMedium } from 'lucide-react';

export default function PeriodAnalysis({ filterParams }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPeriodMetrics(filterParams)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [JSON.stringify(filterParams)]);

  const formatPeriodLabel = (sp) => {
    const totalMinutes = (sp - 1) * 30;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `SP ${sp} (${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')})`;
  };

  const chartData = data.map((d) => ({
    ...d,
    label: `SP${d.settlement_period}`,
    timeStr: formatPeriodLabel(d.settlement_period),
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/30">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <SunMedium className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-semibold text-white">
              Diurnal Accuracy Profile (Settlement Periods 1 to 48)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Evaluate how forecast error and systematic bias fluctuate throughout the 24-hour daily cycle.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading period metrics...</div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={3} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} unit=" MW" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg text-xs space-y-1">
                      <div className="font-bold text-slate-200">{item.timeStr}</div>
                      <div className="text-slate-400">MAE: <span className="text-cyan-400 font-semibold">{item.mae} MW</span></div>
                      <div className="text-slate-400">Bias: <span className={`${item.bias > 0 ? 'text-amber-400' : 'text-blue-400'} font-semibold`}>{item.bias > 0 ? `+${item.bias}` : item.bias} MW</span></div>
                      <div className="text-slate-400">Avg Actual Generation: <span className="text-emerald-400 font-semibold">{item.avg_actual} MW</span></div>
                      <div className="text-slate-400">Avg Forecast: <span className="text-amber-400 font-semibold">{item.avg_forecast} MW</span></div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
              <Bar dataKey="bias" name="Mean Error / Bias (MW)" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              <Line type="monotone" dataKey="mae" name="Mean Absolute Error (MW)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
