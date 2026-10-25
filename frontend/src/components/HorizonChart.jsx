import React, { useEffect, useState } from 'react';
import { fetchHorizonMetrics } from '../api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Hourglass, AlertCircle } from 'lucide-react';

export default function HorizonChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchHorizonMetrics()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const chartData = data.map((d) => ({
    ...d,
    bucketLabel: `${d.horizon_hours_min}h - ${d.horizon_hours_max}h`,
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/30">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Hourglass className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">
              Lead-Time Degradation Curve (Horizon Error Analysis)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Demonstrates how wind forecast accuracy degrades as lead time increases from intraday (0-6h) to Day-Ahead (24-36h) and beyond.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading horizon analysis...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="bucketLabel" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} unit=" MW" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded-lg text-xs space-y-1">
                        <div className="font-bold text-slate-200">Horizon: {item.bucketLabel} ahead</div>
                        <div className="text-slate-400">Sample: {item.sample_size} predictions</div>
                        <div className="text-slate-400">MAE: <span className="text-cyan-400 font-semibold">{item.mae} MW</span></div>
                        <div className="text-slate-400">RMSE: <span className="text-purple-400 font-semibold">{item.rmse} MW</span></div>
                        <div className="text-slate-400">Bias: <span className="text-amber-400 font-semibold">+{item.bias} MW</span></div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="mae" name="Mean Absolute Error (MW)" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                <Bar dataKey="rmse" name="RMSE (MW)" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-4 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between text-xs">
            <div>
              <div className="flex items-center space-x-1.5 text-amber-400 font-semibold mb-2">
                <AlertCircle className="w-4 h-4" />
                <span>Trader Procurement Takeaway</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                At the standard Day-Ahead auction window (<strong>24h - 36h lead time</strong>), the MAE is <strong>~2,122 MW</strong> compared to <strong>~1,768 MW</strong> near real-time (0-6h).
              </p>
              <p className="text-slate-400 mt-2 leading-relaxed">
                This quantified error delta of <strong>~354 MW</strong> represents the statistical uncertainty premium the utility must hedge through reserve margins or intraday flexibility.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500">
              Computed across 14,000+ matched prediction intervals in January 2026.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
