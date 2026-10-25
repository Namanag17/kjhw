import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Controls from './components/Controls';
import KpiCards from './components/KpiCards';
import ForecastChart from './components/ForecastChart';
import VersionInspector from './components/VersionInspector';
import PeriodAnalysis from './components/PeriodAnalysis';
import DailyBreakdown from './components/DailyBreakdown';
import HorizonChart from './components/HorizonChart';
import DataAuditModal from './components/DataAuditModal';
import ClientPitchModal from './components/ClientPitchModal';
import { fetchValidation, fetchPresets, fetchSeries } from './api';
import { Activity, BarChart2, Calendar, Hourglass } from 'lucide-react';

export default function App() {
  // Config & Filter state
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState('epex_spot_1100');
  const [cutoffType, setCutoffType] = useState('day_ahead_fixed_time');
  const [dayAheadTimeUtc, setDayAheadTimeUtc] = useState('11:00');
  const [leadTimeHours, setLeadTimeHours] = useState(24.0);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-01-31');
  const [alignmentMode, setAlignmentMode] = useState('hourly_exact');

  // Series and metrics data
  const [seriesData, setSeriesData] = useState(null);
  const [validationData, setValidationData] = useState(null);
  const [selectedInterval, setSelectedInterval] = useState('2026-01-15T12:00:00Z');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState('curves'); // 'curves', 'periods', 'daily', 'horizon'

  // Modals
  const [showAudit, setShowAudit] = useState(false);
  const [showPitch, setShowPitch] = useState(false);

  // Load presets & validation initially
  useEffect(() => {
    fetchPresets()
      .then((p) => {
        setPresets(p);
      })
      .catch((err) => console.error(err));

    fetchValidation()
      .then((v) => setValidationData(v))
      .catch((err) => console.error(err));
  }, []);

  // Handle Preset selection
  const handleSelectPreset = (presetId) => {
    setSelectedPreset(presetId);
    if (presetId === 'custom') return;

    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    setCutoffType(preset.cutoff_type);
    if (preset.day_ahead_time_utc) {
      setDayAheadTimeUtc(preset.day_ahead_time_utc);
    }
    if (preset.lead_time_hours) {
      setLeadTimeHours(preset.lead_time_hours);
    }
  };

  // Fetch Series when filters change
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchSeries({
      startDate,
      endDate,
      cutoffType,
      dayAheadTimeUtc,
      leadTimeHours,
      alignmentMode,
    })
      .then((data) => {
        setSeriesData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [startDate, endDate, cutoffType, dayAheadTimeUtc, leadTimeHours, alignmentMode]);

  const filterParams = {
    start_date: startDate,
    end_date: endDate,
    cutoff_type: cutoffType,
    day_ahead_time_utc: dayAheadTimeUtc,
    lead_time_hours: leadTimeHours,
    alignment_mode: alignmentMode,
  };

  const cutoffConfig = {
    cutoffType,
    dayAheadTimeUtc,
    leadTimeHours,
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      <Header
        validationData={validationData}
        onOpenAudit={() => setShowAudit(true)}
        onOpenDocs={() => setShowPitch(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Trader Filter Controls */}
        <Controls
          presets={presets}
          selectedPreset={selectedPreset}
          onSelectPreset={handleSelectPreset}
          cutoffType={cutoffType}
          setCutoffType={setCutoffType}
          dayAheadTimeUtc={dayAheadTimeUtc}
          setDayAheadTimeUtc={setDayAheadTimeUtc}
          leadTimeHours={leadTimeHours}
          setLeadTimeHours={setLeadTimeHours}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          alignmentMode={alignmentMode}
          setAlignmentMode={setAlignmentMode}
        />

        {/* Top KPI Cards */}
        {seriesData && (
          <KpiCards
            decisionMetrics={seriesData.decision_metrics}
            latestMetrics={seriesData.latest_metrics}
          />
        )}

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('curves')}
            className={`flex items-center space-x-2 text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'curves'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Generation Curves & Version Inspector</span>
          </button>

          <button
            onClick={() => setActiveTab('periods')}
            className={`flex items-center space-x-2 text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'periods'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Settlement Periods (1-48 Diurnal)</span>
          </button>

          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center space-x-2 text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily Ledger (Jan 1 - 31)</span>
          </button>

          <button
            onClick={() => setActiveTab('horizon')}
            className={`flex items-center space-x-2 text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'horizon'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Hourglass className="w-3.5 h-3.5" />
            <span>Lead-Time Horizon Analysis</span>
          </button>
        </div>

        {/* Tab Views */}
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm font-medium text-slate-200">Recomputing Day-Ahead Aligned Curves...</p>
            <p className="text-xs text-slate-500 mt-1">Matching against historical Elexon publication runs</p>
          </div>
        ) : error ? (
          <div className="bg-red-950/40 border border-red-800 rounded-xl p-8 text-center text-red-300 text-sm">
            Failed to load data: {error}
          </div>
        ) : (
          <>
            {activeTab === 'curves' && (
              <div className="space-y-5">
                <ForecastChart
                  decisionSeries={seriesData.decision_series}
                  latestSeries={seriesData.latest_series}
                  onSelectInterval={(start_time) => setSelectedInterval(start_time)}
                  selectedInterval={selectedInterval}
                />

                <VersionInspector
                  selectedInterval={selectedInterval}
                  cutoffConfig={cutoffConfig}
                  onClose={() => setSelectedInterval(null)}
                />
              </div>
            )}

            {activeTab === 'periods' && (
              <PeriodAnalysis filterParams={filterParams} />
            )}

            {activeTab === 'daily' && (
              <DailyBreakdown filterParams={filterParams} />
            )}

            {activeTab === 'horizon' && (
              <HorizonChart />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-4 px-6 text-xs text-slate-500 text-center">
        WindProcure UK • Powered by Elexon Insights Solution (BMRS FUELHH & WINDFOR APIs) • Python FastAPI + React Vite
      </footer>

      {/* Modals */}
      {showAudit && (
        <DataAuditModal
          validationData={validationData}
          onClose={() => setShowAudit(false)}
        />
      )}

      {showPitch && (
        <ClientPitchModal
          onClose={() => setShowPitch(false)}
        />
      )}
    </div>
  );
}
