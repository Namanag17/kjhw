import React, { useState } from 'react';
import { X, Briefcase, Cpu, CheckCircle2, TrendingUp, ShieldAlert, Layers, Terminal } from 'lucide-react';

export default function ClientPitchModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('pitch'); // 'pitch' or 'tech'

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-3 mb-6 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('pitch')}
            className={`flex items-center space-x-2 text-sm font-semibold pb-3 -mb-3 transition ${
              activeTab === 'pitch'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Client Pitch Presentation (Trading Desk)</span>
          </button>
          <button
            onClick={() => setActiveTab('tech')}
            className={`flex items-center space-x-2 text-sm font-semibold pb-3 -mb-3 transition ${
              activeTab === 'tech'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Internal Technical Lead Review</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'pitch' ? (
          <div className="space-y-6 text-sm text-slate-300">
            {/* Hero Pitch */}
            <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-800/40 p-5 rounded-2xl">
              <div className="text-xs uppercase font-bold tracking-wider text-cyan-400">Executive Briefing</div>
              <h2 className="text-xl font-bold text-white mt-1">
                De-Risking UK Day-Ahead Electricity Procurement with Quantified Wind Forecast Intelligence
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Tailored for the UK Power Utility Trading Desk procuring electricity from wholesale day-ahead auctions (EPEX SPOT / Nord Pool) to reliably balance consumer demand against intermittent renewable generation.
              </p>
            </div>

            {/* The Business Challenge */}
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>The Core Business Challenge</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Electricity cannot be stored cost-effectively at national utility scale. As a UK energy supplier, your desk must contract thermal/dispatchable power 24–36 hours ahead to cover consumer demand net of wind generation:
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-center text-xs text-cyan-300 my-2">
                Thermal Power Needed = Consumer Load Profile - Renewable (Wind) Generation
              </div>
              <ul className="text-xs space-y-1.5 text-slate-300 list-disc list-inside mt-2">
                <li><strong className="text-amber-300">Over-Forecasting Wind:</strong> The utility under-procures day-ahead thermal power. During delivery, the wind fails to blow, forcing you into the Balancing Mechanism at punitive system cashout prices.</li>
                <li><strong className="text-blue-300">Under-Forecasting Wind:</strong> The utility over-procures thermal power at high day-ahead peak prices and is forced to dump surplus power at discount intraday.</li>
              </ul>
            </div>

            {/* How WindProcure Solves It */}
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Product Value Proposition</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                  <div className="font-semibold text-white text-xs">1. Decision-Time Visibility</div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Instantly reconstructs the exact forecast published before the 11:00 UTC auction gate closure, eliminating hindsight bias.
                  </p>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                  <div className="font-semibold text-white text-xs">2. Quantified Risk Buffers</div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Evaluates MAE (2,107 MW) and systematic bias (+1,839 MW) so traders know precisely how many MW of thermal reserve margin to bid.
                  </p>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                  <div className="font-semibold text-white text-xs">3. Horizon Degradation Insights</div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Proves how error drops from 2,371 MW at 48h to 1,768 MW intraday, informing optimal hedging across auction stages.
                  </p>
                </div>
              </div>
            </div>

            {/* January 2026 Finding */}
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs">
              <span className="font-bold text-amber-300">Critical Trading Desk Takeaway from January 2026:</span>
              <p className="text-slate-300 mt-1 leading-relaxed">
                National wind generation forecast exhibited a strong <strong>positive bias (+1,839 MW)</strong> throughout January 2026. Bidding purely on the raw forecast would have left the utility systematically short across 80% of delivery intervals. Using WindProcure’s quantified bias correction protects your trading desk from millions in cashout imbalance penalties.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-sm text-slate-300">
            {/* Tech Overview */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl font-mono text-xs">
              <div className="text-cyan-400 font-bold mb-1">SYSTEM ARCHITECTURE SPECIFICATION</div>
              <p className="text-slate-400">
                Full-Stack Architecture: React 19 + Vite + Tailwind CSS + Recharts (Frontend) / FastAPI + Pandas + SQLite (Backend) / Docker Compose
              </p>
            </div>

            {/* Core Architectural Pillars */}
            <div className="space-y-4 text-xs">
              <div className="border border-slate-800 bg-slate-950/50 p-4 rounded-xl">
                <h4 className="font-bold text-white flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>1. Pipeline & Ingestion Strategy (Elexon BMRS Stream)</span>
                </h4>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Implemented in <code className="text-cyan-300">app.elexon_client</code>. Ingests raw JSON streams in 5-day chunks with automated retry backoff to prevent gateway timeouts. Captured 1,488 half-hour actuals (100% January coverage) and 19,272 forecast records across 264 historical runs from 2025-12-30 to 2026-02-01.
                </p>
              </div>

              <div className="border border-slate-800 bg-slate-950/50 p-4 rounded-xl">
                <h4 className="font-bold text-white flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>2. Temporal Alignment & Decision Cutoff Logic</span>
                </h4>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Implemented in <code className="text-cyan-300">app.forecast_service</code>. Solves the key business requirement: for delivery on day <span className="font-mono">D</span>, selects <span className="font-mono">max(publish_time)</span> where <span className="font-mono">publish_time &le; (D-1 at 11:00 UTC)</span>. Supports both hourly exact matching (744 points) and 48-period settlement mapping (1,488 points).
                </p>
              </div>

              <div className="border border-slate-800 bg-slate-950/50 p-4 rounded-xl">
                <h4 className="font-bold text-white flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>3. Error Metrics & Statistical Methodology</span>
                </h4>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Implemented in <code className="text-cyan-300">app.metrics_service</code>. Computes MAE, RMSE, Mean Bias, MAPE, P10/P50/P90 quantiles, and Pearson correlation. Provides multidimensional slices by settlement period (1..48), daily timeline, and lead-time horizon buckets.
                </p>
              </div>

              <div className="border border-slate-800 bg-slate-950/50 p-4 rounded-xl">
                <h4 className="font-bold text-white flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>4. Containerization & Testing</span>
                </h4>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  13 unit and integration tests passing in Pytest verifying math correctness, gap detection, deduplication, and API contract fidelity. Multi-stage Docker configuration ensures reproducible local spin-up via <span className="font-mono text-cyan-300">docker compose up</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
