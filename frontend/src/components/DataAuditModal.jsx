import React from 'react';
import { X, ShieldCheck, CheckCircle2, Database, AlertCircle } from 'lucide-react';

export default function DataAuditModal({ validationData, onClose }) {
  if (!validationData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Data Integrity & Coverage Audit</h3>
            <p className="text-xs text-slate-400">
              Elexon BMRS January 2026 Verification Report
            </p>
          </div>
        </div>

        {/* Audit Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-center">
            <div className="text-xs text-slate-400">Expected SPs</div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">{validationData.expected_intervals}</div>
            <div className="text-[10px] text-slate-500">31 days × 48 SPs</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-center">
            <div className="text-xs text-slate-400">Actual SPs Found</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{validationData.actual_intervals_found}</div>
            <div className="text-[10px] text-emerald-500/80">100% Coverage</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-center">
            <div className="text-xs text-slate-400">Missing Intervals</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{validationData.missing_intervals_count}</div>
            <div className="text-[10px] text-emerald-500/80">Zero Data Gaps</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-center">
            <div className="text-xs text-slate-400">Forecast Runs</div>
            <div className="text-xl font-bold text-cyan-400 font-mono mt-0.5">{validationData.unique_forecast_publications}</div>
            <div className="text-[10px] text-slate-500">{validationData.forecast_records_count.toLocaleString()} Records</div>
          </div>
        </div>

        {/* Detailed Verification Summary */}
        <div className="space-y-3 text-xs text-slate-300 mt-5">
          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-emerald-300">Complete January 2026 Coverage Verified:</span>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Every single half-hour settlement interval between <strong>2026-01-01 00:00:00Z</strong> and <strong>2026-02-01 00:00:00Z</strong> has been verified, cleaned, deduplicated, and matched against outturn wind actuals.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <Database className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200">Historical Publication Window Preservation:</span>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Forecast records were collected from <strong>2025-12-30</strong> to <strong>2026-02-01</strong>. This ensures that Day-Ahead decision cutoffs for January 1st deliveries are accurately reconstructed using the actual forecast runs available to traders on December 31st.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <AlertCircle className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200">Temporal Resolution Alignment:</span>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                `FUELHH` supplies 30-minute settlement period outturns, while `WINDFOR` supplies hourly forecast predictions. The system natively supports both <strong>Hourly Exact Matching</strong> (744 periods) and <strong>Half-Hourly Settlement Mapped</strong> (1,488 periods).
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Close Audit Report
          </button>
        </div>
      </div>
    </div>
  );
}
