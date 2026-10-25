# WindProcure UK: Day-Ahead Wind Generation Forecasting & Power Procurement Platform

An enterprise decision-support platform designed for **UK energy utility trading desks** procuring electricity from the wholesale **Day-Ahead Market** (EPEX SPOT / Nord Pool). 

The platform integrates directly with **Elexon BMRS Insights Solution** streaming datasets (`FUELHH` outturn actuals and `WINDFOR` forecast runs) to provide:
1. **Decision-Time Forecast Visibility:** Reconstructs the exact wind forecasts available when traders commit day-ahead auction bids (e.g., $D-1$ at 11:00 UTC), eliminating hindsight bias.
2. **Quantified Error & Risk Analytics:** Measures Mean Absolute Error (MAE), Root Mean Square Error (RMSE), systematic forecast bias, percentiles ($P_{10}$, $P_{50}$, $P_{90}$), and lead-time horizon degradation across **January 2026**.
3. **100% Settlement Coverage:** Full reconciliation of all **1,488 half-hour settlement periods** across the 31 days of January 2026, matched against **19,272 forecast records** across **264 publication runs**.

---

## Table of Contents
1. [Client Pitch (Energy Utility Trading Desk)](#1-client-pitch-uk-energy-utility-day-ahead-trading-desk)
2. [Technical Lead Architecture Review](#2-technical-lead-architecture-review)
3. [Domain & Data Alignment Methodology](#3-domain--data-alignment-methodology)
4. [Statistical Accuracy Formulation](#4-statistical-accuracy-formulation)
5. [January 2026 Key Empirical Findings](#5-january-2026-key-empirical-findings)
6. [Technology Stack](#6-technology-stack)
7. [Local Quickstart & Docker](#7-local-quickstart--docker)
8. [Cloud Deployment (Vercel & Heroku)](#8-cloud-deployment-vercel--heroku)
9. [Automated Pytest Suite](#9-automated-pytest-suite)
10. [AI Tools Transparency Declaration](#10-ai-tools-transparency-declaration)

---

## 1. Client Pitch (UK Energy Utility Day-Ahead Trading Desk)

### The Executive Context
In the UK wholesale power market, utilities must procure sufficient power to serve their retail customer demand profile. Electricity cannot be stored cost-effectively at utility scale. Therefore, power purchase decisions for delivery day $D$ must be submitted in day-ahead auctions on day $D-1$ prior to gate closure (typically **11:00 UTC** on EPEX SPOT UK or **12:00 UTC** on Nord Pool).

To cover consumer demand net of renewable generation, utilities procure dispatchable thermal/peaker power or interconnector flows:

$$\text{Thermal Procured} = \text{Consumer Demand} - \text{Renewable (Wind) Generation}$$

Because wind generation is weather-dependent and volatile:
* **Over-Forecasting Wind:** The utility contracts too little thermal power in the Day-Ahead auction. During delivery, outturn wind falls short, leaving the utility short of power. The unhedged deficit must be bought in the Balancing Mechanism (BM) at volatile, often punitive system buy prices (cashout price).
* **Under-Forecasting Wind:** The utility contracts too much thermal power at high day-ahead prices, ending up long during delivery and selling back surplus generation at discounted system sell prices.

### How WindProcure Solves This
* **Zero Hindsight Bias:** BMRS publishes wind forecasts multiple times daily. Looking at the "latest" forecast gives a misleading impression of forecast accuracy because that forecast was published *after* auction gate closure. WindProcure strictly isolates the **Decision-Time Forecast** available at the trader's chosen auction cut-off.
* **Quantified Reserve Margins:** Instead of guessing weather buffers, traders can use quantitative metrics ($P_{10}$ to $P_{90}$ spreads and bias) to price exact insurance buffers into their bids.
* **Lead-Time Horizon Intelligence:** Clearly demonstrates how forecast error evolves from 48h out down to intraday, allowing trading desks to optimize how much power to hedge in the Day-Ahead auction vs. how much to leave for intraday continuous trading.

---

## 2. Technical Lead Architecture Review

### System Architecture Overview
The system follows a decoupled, resilient architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                   React 19 + Vite Frontend                  │
│   (Tailwind CSS • Recharts • Lucide • Dynamic Presets)      │
└──────────────────────────────▲──────────────────────────────┘
                               │ JSON REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Backend (Python)                 │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │   forecast_service    │       │    metrics_service    │  │
│  │ (Cutoff / Lead Time)  │       │ (MAE, RMSE, Bias, SP) │  │
│  └───────────▲───────────┘       └───────────▲───────────┘  │
│              │                               │              │
│  ┌───────────▼───────────┐       ┌───────────▼───────────┐  │
│  │    data_processor     │       │      data_store       │  │
│  │ (Cleaning, Gap Audit) │       │ (SQLite / PostgreSQL) │  │
│  └───────────▲───────────┘       └───────────────────────┘  │
│              │                                              │
│  ┌───────────▼───────────┐                                  │
│  │     elexon_client     │                                  │
│  │ (Chunked HTTP Stream) │                                  │
│  └───────────▲───────────┘                                  │
└──────────────┼──────────────────────────────────────────────┘
               │ HTTPS (Chunked UTC Streams)
┌──────────────▼──────────────────────────────────────────────┐
│              Elexon BMRS Insights Solution                  │
│       • FUELHH Stream (WIND Outturns, 30-min SP)            │
│       • WINDFOR Stream (Forecast Runs, 60-min Grid)         │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Highlights
1. **Streaming Data Ingestion (`app/elexon_client.py`):**
   * Connects to `/datasets/FUELHH/stream` and `/datasets/WINDFOR/stream`.
   * Queries in 5-day chunks with automated retry backoffs to prevent connection timeouts and memory spikes.
   * Caches raw data locally in SQLite (`data/windfor.db`) for sub-millisecond query performance.
2. **Standardization & Interval Audit (`app/data_processor.py`):**
   * Converts all timestamps to UTC ISO-8601 (`YYYY-MM-DDTHH:MM:SSZ`).
   * Validates generation values as non-negative floats, flags corrupted records, and deduplicates.
   * Executes a strict completeness check across the full January 2026 timeline:
     $$\text{Expected Intervals} = 31\text{ days} \times 48\text{ half-hours} = 1,488\text{ intervals}$$
     **Verification Result:** Exactly **1,488 out of 1,488** intervals found (100.0% coverage, 0 missing).
3. **Core Selection Logic (`app/forecast_service.py`):**
   * For every delivery period $t$ on day $D$:
     $$\text{Cutoff}(D) = (D - 1\text{ day}) \text{ at } \text{cutoff\_time (e.g. 11:00 UTC)}$$
     $$\text{Decision Forecast}(t) = \max_{\text{publish\_time} \le \text{Cutoff}(D)} \text{WINDFOR}(t)$$
   * Separately tracks the **Latest Benchmark Forecast** ($\max_{\text{publish\_time} \le t}$) and earlier multi-version runs.

---

## 3. Domain & Data Alignment Methodology

### The 30-Minute vs. 60-Minute Resolution Alignment
An important nuance discovered during API exploration:
* **FUELHH (Actuals):** Recorded every **30 minutes** (minutes `:00` and `:30`), corresponding to UK Settlement Periods 1 to 48.
* **WINDFOR (Forecasts):** Issued on an **hourly grid** (minutes `:00`, e.g., 00:00, 01:00, 02:00...) published multiple times daily (e.g., 02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30, 22:30 UTC).

WindProcure natively supports two user-configurable alignment modes:
1. **Hourly Exact (Default):** Matches forecasts on exact `:00` timestamps against corresponding `:00` actuals (744 points in January).
2. **Half-Hourly Mapped:** Maps each hourly forecast to both settlement periods of that hour (`:00` and `:30`), providing full evaluation across all 1,488 settlement periods.

---

## 4. Statistical Accuracy Formulation

For delivery intervals $i = 1, \dots, N$:

1. **Forecast Error:**
   $$e_i = \hat{y}_i - y_i \quad (\text{Forecast} - \text{Actual})$$
   * $e_i > 0$: **Over-forecast** (wind shortfall / utility short)
   * $e_i < 0$: **Under-forecast** (wind surplus / utility long)

2. **Mean Absolute Error (MAE):**
   $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |e_i|$$

3. **Root Mean Square Error (RMSE):**
   $$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N e_i^2}$$

4. **Mean Error / Bias:**
   $$\text{Bias} = \frac{1}{N} \sum_{i=1}^N e_i$$

5. **Mean Absolute Percentage Error (MAPE):**
   $$\text{MAPE} = \frac{1}{M} \sum_{i=1}^M \frac{|e_i|}{y_i} \times 100\% \quad (y_i > 10\text{ MW})$$

6. **Error Percentiles:** $P_{10}$, $P_{50}$ (Median), and $P_{90}$ defining the 80% operational confidence interval.

---

## 5. January 2026 Key Empirical Findings

Evaluating National Grid ESO / Elexon data for **January 2026** (Standard Day-Ahead Cutoff: $D-1$ 11:00 UTC):

| Metric | Day-Ahead Decision Forecast ($D-1$ 11:00 UTC) | Latest Real-Time Benchmark | Delta / Trader Impact |
| :--- | :---: | :---: | :---: |
| **Sample Evaluated** | 744 hourly delivery periods | 744 hourly delivery periods | Complete January 2026 coverage |
| **MAE (Mean Absolute Error)** | **2,107.18 MW** | **1,794.22 MW** | **-312.96 MW (-14.8%)** error reduction as delivery approaches |
| **RMSE** | **2,611.24 MW** | **2,280.90 MW** | Outlier sensitivity decreases near delivery |
| **Forecast Bias (Mean Error)** | **+1,839.92 MW** | **+1,592.49 MW** | **Systematic Over-Forecasting** across the month |
| **MAPE** | **21.88%** | **16.34%** | Normalized percentage error |
| **Correlation ($r$)** | **0.9287** | **0.9540** | High directional correlation with actuals |
| **$P_{10}$ / $P_{50}$ / $P_{90}$ Error** | **-502.7 MW / +1,661 MW / +4,377 MW** | -289.3 MW / +1,328 MW / +3,763 MW | 80% of Day-Ahead errors had positive wind deficit |

### Lead-Time Error Horizon Degradation
Evaluating all 19,272 forecast records across lead-time horizon buckets:
* **0h – 6h ahead (Intraday Gate Closure):** MAE = 1,767.72 MW | RMSE = 2,249.21 MW
* **6h – 12h ahead:** MAE = 1,833.73 MW | RMSE = 2,304.38 MW
* **12h – 24h ahead:** MAE = 1,990.88 MW | RMSE = 2,474.17 MW
* **24h – 36h ahead (Standard Day-Ahead Auction):** MAE = **2,122.56 MW** | RMSE = **2,586.87 MW**
* **36h – 48h ahead:** MAE = 2,337.01 MW | RMSE = 2,866.21 MW
* **48h – 72h ahead:** MAE = 2,371.92 MW | RMSE = 2,977.90 MW

> **Trader Takeaway:** The quantitative price of Day-Ahead auction commitment vs. Intraday flexibility is **~354 MW of MAE**. Furthermore, the +1,839 MW positive bias means traders who submitted unadjusted bids suffered continuous power shortages during delivery.

---

## 6. Technology Stack

* **Frontend:** React 19, Vite, Tailwind CSS, Recharts, Lucide React.
* **Backend:** Python 3.12, FastAPI, Uvicorn, Pandas, NumPy, HTTPX, SQLite.
* **Testing:** Pytest, HTTPX TestClient.
* **Containers:** Docker, Docker Compose, Nginx.
* **Deployment Targets:** Vercel (Frontend), Heroku / Render (Backend).

---

## 7. Local Quickstart & Docker

### Option A: Running with Docker Compose (Recommended)
Clone the repository and run:
```bash
docker compose up --build
```
* **Frontend UI:** Open [http://localhost:3000](http://localhost:3000)
* **Backend API Docs:** Open [http://localhost:8000/docs](http://localhost:8000/docs)

### Option B: Bare-Metal Local Development

#### 1. Start Backend:
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python sync_data.py          # Populates January 2026 SQLite database
uvicorn app.main:app --reload --port 8000
```

#### 2. Start Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 8. Cloud Deployment (Vercel & Heroku)

### Frontend on Vercel
1. Connect the repository to Vercel and set the Root Directory to `frontend`.
2. Framework Preset: `Vite`.
3. Set Environment Variable:
   * `VITE_API_URL`: URL of your deployed Python backend (e.g. `https://your-windfor-backend.herokuapp.com/api`).
4. `frontend/vercel.json` ensures client-side routing and rewrites are handled automatically.

### Backend on Heroku
1. The repository includes `backend/Procfile` and `backend/runtime.txt`.
2. In Heroku:
   ```bash
   heroku create windfor-backend
   git subtree push --prefix backend heroku main
   ```
3. Set config vars if needed: `PORT=8000`.

---

## 9. Automated Pytest Suite

Run the automated test suite from the project root:
```bash
pytest backend/tests
```
**Test Coverage Includes:**
* `test_data_processor.py`: Filtering `fuelType == "WIND"`, deduplication, timestamp normalization, and 1,488 interval gap verification.
* `test_forecast_service.py`: Decision-time cut-off calculations ($D-1$ 11:00 UTC vs. rolling hours), forecast selection, and multi-version horizon history.
* `test_metrics.py`: Mathematical accuracy of MAE, RMSE, Mean Bias, MAPE, and settlement period groupings against ground-truth analytical cases.
* `test_api.py`: FastAPI endpoints, health check, cutoff presets, and schema compliance.

---

## 10. AI Tools Transparency Declaration

In accordance with project guidelines, AI development tools (specifically **Google Antigravity** powered by **Gemini**) were utilized as an assistive pair-programmer to accelerate:
* Drafting initial boilerplate code and test scaffolds.
* Rapidly exploring and verifying live Elexon BMRS endpoint structures.
* Constructing statistical calculation routines and responsive dashboard UI layouts.
All domain logic, settlement period alignment, forecast-matching rules, data cleaning, and architectural designs were rigorously verified and validated against live Elexon data.
