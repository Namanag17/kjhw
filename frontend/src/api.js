const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchValidation() {
  const res = await fetch(`${API_BASE}/validation`);
  if (!res.ok) throw new Error('Validation fetch failed');
  return res.json();
}

export async function fetchPresets() {
  const res = await fetch(`${API_BASE}/config/cutoff-presets`);
  if (!res.ok) throw new Error('Presets fetch failed');
  return res.json();
}

export async function fetchSeries({
  startDate = '2026-01-01',
  endDate = '2026-01-31',
  cutoffType = 'day_ahead_fixed_time',
  dayAheadTimeUtc = '11:00',
  leadTimeHours = null,
  alignmentMode = 'hourly_exact',
}) {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_type: cutoffType,
    day_ahead_time_utc: dayAheadTimeUtc,
    alignment_mode: alignmentMode,
  });
  if (leadTimeHours) params.append('lead_time_hours', leadTimeHours);

  const res = await fetch(`${API_BASE}/forecasts/series?${params.toString()}`);
  if (!res.ok) throw new Error('Series fetch failed');
  return res.json();
}

export async function fetchVersions(startTime, cutoffConfig) {
  const params = new URLSearchParams({
    start_time: startTime,
    cutoff_type: cutoffConfig.cutoffType || 'day_ahead_fixed_time',
    day_ahead_time_utc: cutoffConfig.dayAheadTimeUtc || '11:00',
  });
  if (cutoffConfig.leadTimeHours) params.append('lead_time_hours', cutoffConfig.leadTimeHours);

  const res = await fetch(`${API_BASE}/forecasts/versions?${params.toString()}`);
  if (!res.ok) throw new Error('Versions fetch failed');
  return res.json();
}

export async function fetchPeriodMetrics(params) {
  const q = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}/metrics/by-settlement-period?${q.toString()}`);
  if (!res.ok) throw new Error('Period metrics fetch failed');
  return res.json();
}

export async function fetchDailyMetrics(params) {
  const q = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}/metrics/by-day?${q.toString()}`);
  if (!res.ok) throw new Error('Daily metrics fetch failed');
  return res.json();
}

export async function fetchHorizonMetrics() {
  const res = await fetch(`${API_BASE}/metrics/by-horizon`);
  if (!res.ok) throw new Error('Horizon metrics fetch failed');
  return res.json();
}
