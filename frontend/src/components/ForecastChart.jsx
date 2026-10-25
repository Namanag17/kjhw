import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ReferenceLine,
} from 'recharts';
import { Eye, Crosshair } from 'lucide-react';

export default function ForecastChart({
  decisionSeries,
  latestSeries,
  onSelectInterval,
  selectedInterval,
}) {
  const [showLatest, setShowLatest] = useState(true);
  const [chartView, setChartView] = useState('curves'); // 'curves' or 'residuals'

  // Merge series for chart consumption
  const chartData = decisionSeries.map((d, idx) => {
    const lat = latestSeries[idx] || {};
    const dateObj = new Date(d.start_time);
    const timeLabel = d.start_time.slice(5, 16).replace('T', ' ');
    return {
      start_time: d.start_time,
      timeLabel,
      settlement_period: d.settlement_period,
      actual: d.actual_generation,
      decisionForecast: d.forecast_generation,
      latestForecast: lat.forecast_generation,
      error: d.error,
      abs_error: d.abs_error,
      pct_error: d.pct_error,
      horizon: d.horizon_hours,
      publish_time: d.forecast_publish_time,
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const isOver = data.error > 0;

    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur z-50">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-semibold text-slate-200">
          <span>{data.start_time.replace('T', ' ').replace('Z', ' UTC')}</span>
          <span className="text-cyan-400 ml-3">SP {data.settlement_period || '--'}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
          <div className="text-slate-400">Actual Generation:</div>
          <div className="text-right font-mono font-bold text-emerald-400">
            {data.actual != null ? `${data.actual.toLocaleString()} MW` : '--'}
          </div>

          <div className="text-slate-400">Day-Ahead Forecast:</div>
          <div className="text-right font-mono font-bold text-amber-400">
            {data.decisionForecast != null ? `${data.decisionForecast.toLocaleString()} MW` : '--'}
          </div>

          {showLatest && (
            <>
              <div className="text-slate-400">Latest Forecast:</div>
              <div className="text-right font-mono font-semibold text-sky-400">
                {data.latestForecast != null ? `${data.latestForecast.toLocaleString()} MW` : '--'}
              </div>
            </>
          )}

          <div className="text-slate-400 pt-1 border-t border-slate-800">Forecast Error:</div>
          <div className={`text-right font-mono font-bold pt-1 border-t border-slate-800 ${isOver ? 'text-amber-400' : 'text-blue-400'}`}>
            {data.error > 0 ? `+${data.error}` : data.error} MW
          </div>

          {data.pct_error != null && (
            <>
              <div className="text-slate-400">Percentage Error:</div>
              <div className="text-right font-mono text-slate-300">{data.pct_error}%</div>
            </>
          )}

          <div className="text-slate-400">Published (Lead Time):</div>
          <div className="text-right text-[11px] text-slate-400">
            {data.horizon != null ? `${data.horizon}h prior` : '--'}
          </div>
        </div>
        <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 text-center font-medium">
          Click point to inspect all historical forecast runs
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/30">
      {/* Top Header & Chart Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold text-white">
              {chartView === 'curves' ? 'Wind Generation Curves: Actual vs. Day-Ahead Forecast' : 'Hourly Residual Forecast Error (Forecast - Actual)'}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {chartData.length} Intervals
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare committed Day-Ahead wholesale power decisions against outturn actuals and intraday forecast updates.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setChartView('curves')}
              className={`px-2.5 py-1 rounded transition ${chartView === 'curves' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Power Curves (MW)
            </button>
            <button
              onClick={() => setChartView('residuals')}
              className={`px-2.5 py-1 rounded transition ${chartView === 'residuals' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Error Spread (MW)
            </button>
          </div>

          {/* Toggle Latest Benchmark */}
          <button
            onClick={() => setShowLatest(!showLatest)}
            className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-lg border transition ${
              showLatest ? 'bg-sky-950/60 border-sky-700 text-sky-300' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Latest Benchmark</span>
          </button>
        </div>
      </div>

      {/* Main Chart */}
      <div className="h-84 sm:h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload[0]) {
                onSelectInterval(e.activePayload[0].payload.start_time);
              }
            }}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              minTickGap={35}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              unit=" MW"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              iconType="circle"
            />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />

            {chartView === 'curves' ? (
              <>
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Wind Generation (FUELHH)"
                  stroke="#10b981"
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#10b981', stroke: '#064e3b' }}
                />
                <Line
                  type="monotone"
                  dataKey="decisionForecast"
                  name="Day-Ahead Decision Forecast (WINDFOR)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 5, fill: '#f59e0b', stroke: '#78350f' }}
                />
                {showLatest && (
                  <Line
                    type="monotone"
                    dataKey="latestForecast"
                    name="Latest Historical Benchmark"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    strokeDasharray="2 2"
                    dot={false}
                    activeDot={{ r: 4, fill: '#38bdf8' }}
                  />
                )}
              </>
            ) : (
              <Bar
                dataKey="error"
                name="Forecast Error (Forecast - Actual)"
                fill="#f59e0b"
                shape={(props) => {
                  const { x, y, width, height, value } = props;
                  const fill = value > 0 ? '#f59e0b' : '#38bdf8';
                  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={1} />;
                }}
              />
            )}

            <Brush
              dataKey="timeLabel"
              height={26}
              stroke="#334155"
              fill="#0f172a"
              tickFormatter={() => ''}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Actual</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Day-Ahead Forecast</span>
          </span>
          {showLatest && (
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
              <span>Latest Benchmark</span>
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400 flex items-center space-x-1">
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click any interval on chart or table to trace historical forecast runs</span>
        </div>
      </div>
    </div>
  );
}
