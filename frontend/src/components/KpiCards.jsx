import React from 'react';
import { TrendingUp, AlertTriangle, Scale, Target, ArrowUpRight } from 'lucide-react';

export default function KpiCards({ decisionMetrics, latestMetrics }) {
  if (!decisionMetrics) return null;

  const isOverforecast = decisionMetrics.mean_error > 0;
  const maeReduction = latestMetrics
    ? Math.round(((decisionMetrics.mae - latestMetrics.mae) / decisionMetrics.mae) * 1000) / 10
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {/* 1. MAE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Mean Absolute Error (MAE)</span>
          <Scale className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold tracking-tight text-white">
            {decisionMetrics.mae.toLocaleString()} <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
          {decisionMetrics.mape && (
            <div className="text-xs text-slate-400 mt-0.5">
              MAPE: <span className="text-slate-200 font-semibold">{decisionMetrics.mape}%</span>
            </div>
          )}
        </div>
        <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
          <span>Latest Benchmark:</span>
          <span className="text-cyan-400 font-medium">{latestMetrics ? `${latestMetrics.mae.toLocaleString()} MW (-${maeReduction}%)` : '--'}</span>
        </div>
      </div>

      {/* 2. Mean Error / Systematic Bias */}
      <div className={`bg-slate-900 border ${isOverforecast ? 'border-amber-900/50 bg-amber-950/10' : 'border-blue-900/50 bg-blue-950/10'} rounded-xl p-4 flex flex-col justify-between`}>
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Forecast Bias (Mean Error)</span>
          <AlertTriangle className={`w-4 h-4 ${isOverforecast ? 'text-amber-400' : 'text-blue-400'}`} />
        </div>
        <div className="my-2">
          <div className={`text-2xl font-bold tracking-tight ${isOverforecast ? 'text-amber-300' : 'text-blue-300'}`}>
            {decisionMetrics.mean_error > 0 ? `+${decisionMetrics.mean_error.toLocaleString()}` : decisionMetrics.mean_error.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
          <div className="text-[11px] font-medium text-amber-400/90 flex items-center mt-0.5">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 inline" />
            Net Over-Forecast (Shortage Risk)
          </div>
        </div>
        <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-800/80">
          Day-ahead procurements carried systematic wind deficit
        </div>
      </div>

      {/* 3. RMSE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Root Mean Square Error</span>
          <TrendingUp className="w-4 h-4 text-purple-400" />
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold tracking-tight text-white">
            {decisionMetrics.rmse.toLocaleString()} <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Outlier Ratio: <span className="text-purple-300 font-semibold">{Math.round((decisionMetrics.rmse / decisionMetrics.mae) * 100) / 100}x</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-800/80">
          Penalizes large rapid storm ramp errors
        </div>
      </div>

      {/* 4. Risk Confidence Band (P10 - P90) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Error Band (P10 - P90)</span>
          <Target className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="my-2">
          <div className="text-sm font-semibold text-slate-200">
            <span className="text-emerald-400">{decisionMetrics.p10_error > 0 ? `+${decisionMetrics.p10_error}` : decisionMetrics.p10_error}</span>
            <span className="text-slate-500 mx-1.5">to</span>
            <span className="text-amber-400">+{decisionMetrics.p90_error.toLocaleString()} MW</span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Median (P50): <span className="text-white font-medium">+{decisionMetrics.p50_error.toLocaleString()} MW</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-800/80">
          80% of Day-Ahead errors fall in this spread
        </div>
      </div>

      {/* 5. Directional Correlation */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Pearson Correlation (r)</span>
          <Scale className="w-4 h-4 text-blue-400" />
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold tracking-tight text-white">
            {decisionMetrics.correlation ?? '--'}
          </div>
          <div className="text-xs text-emerald-400 mt-0.5 font-medium">
            Strong Directional Tracking
          </div>
        </div>
        <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-800/80">
          Sample: {decisionMetrics.sample_size.toLocaleString()} evaluated intervals
        </div>
      </div>
    </div>
  );
}
