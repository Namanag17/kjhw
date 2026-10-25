# WindProcure UK: Day-Ahead Wind Generation Forecasting & Power Procurement Platform

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](https://kjhw.vercel.app)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](http://localhost:8000/docs)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](http://localhost:3000)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](#method-1-one-click-docker-recommended)
[![Tests Passing](https://img.shields.io/badge/Tests-13%20Passed-brightgreen)](#how-to-run-automated-tests)

---

## 🔗 Live Application Links & Repository

* **Live Web Application (Vercel):** [https://kjhw.vercel.app](https://kjhw.vercel.app) *(or your Vercel deployment link)*
* **GitHub Repository:** [https://github.com/Namanag17/kjhw](https://github.com/Namanag17/kjhw)
* **Backend API Documentation (Interactive Swagger):** `http://localhost:8000/docs` or `https://kjhw.vercel.app/api/docs`

---

## 💡 Project Overview (In Simple & Plain English)

### What problem does this application solve?
Imagine you run an electricity utility in the United Kingdom that supplies electricity to thousands of homes and businesses. 
1. **You must buy electricity in advance:** In the UK wholesale market, you cannot wait until the minute people turn on their lights. You must commit and buy power in the **Day-Ahead Market** one day before delivery (usually before 11:00 AM on day $D-1$).
2. **Wind power is clean, but weather is unpredictable:** You want to rely on renewable wind energy as much as possible because it is green and cheap. Whatever wind doesn't generate, you have to buy from backup thermal (gas/coal) plants:
   $$\text{Gas/Thermal Power to Buy} = \text{Consumer Demand} - \text{Wind Generation}$$
3. **The Risk of Wrong Forecasts:**
   * **If the forecast overestimates the wind:** You buy too little gas power. On the delivery day, the wind does not blow as expected. You are left short of electricity! The National Grid then charges you punitive, expensive emergency penalty fees (called the *imbalance cashout price*).
   * **If the forecast underestimates the wind:** You bought too much expensive gas power. You now have excess electricity that you must dump on the market at a big loss.

### What does this software do?
**WindProcure UK** is a specialized decision-making workstation built for energy procurement traders.
* It connects directly to the official UK electricity data stream (**Elexon BMRS**).
* It pulls **actual wind generation (`FUELHH`)** and **wind forecasts (`WINDFOR`)** for **January 2026**.
* It shows the trader the **exact forecast that was available at 11:00 AM yesterday** (the decision cut-off), preventing "hindsight bias" from looking at newer forecasts published after the auction closed.
* It quantitatively calculates the forecast error (**MAE**, **RMSE**, and **Systematic Bias**) so traders can bid with safety margins and avoid millions in penalty cashout fees.

---

## 📁 Details of Files and Directories Present

Here is the complete layout of the project and the purpose of every file:

```text
d:\WINDFOR/
│
├── backend/                                # Python FastAPI Backend
│   ├── app/                                # Application Source Code
│   │   ├── __init__.py                     # Python package initializer
│   │   ├── config.py                       # Settings: Elexon API URLs, Jan 2026 bounds, default cutoffs
│   │   ├── elexon_client.py                # Ingestion client: fetches FUELHH & WINDFOR streams in chunks
│   │   ├── data_store.py                   # Database manager: SQLite tables, indexes, and queries
│   │   ├── data_processor.py               # Cleaning: filters WIND, parses UTC dates, checks 1,488 SP gaps
│   │   ├── forecast_service.py             # Core logic: selects forecast available at decision cutoff
│   │   ├── metrics_service.py              # Math engine: calculates MAE, RMSE, Bias, MAPE, quantiles
│   │   ├── schemas.py                      # Pydantic data models for typed API requests and responses
│   │   └── main.py                         # FastAPI REST app with CORS and public endpoints
│   ├── data/
│   │   └── windfor.db                      # Persisted SQLite database with all Jan 2026 records
│   ├── tests/                              # Automated Pytest Test Suite
│   │   ├── test_data_processor.py          # Tests data cleaning, deduplication, and interval gap audit
│   │   ├── test_forecast_service.py        # Tests decision cutoff rules and forecast selection
│   │   ├── test_metrics.py                 # Tests MAE, RMSE, and Bias math against ground truth
│   │   └── test_api.py                     # Tests FastAPI HTTP endpoints and schemas
│   ├── sync_data.py                        # Standalone script to fetch and verify live Elexon data
│   ├── requirements.txt                    # Python dependencies (FastAPI, Pandas, HTTPX, Pytest)
│   ├── Dockerfile                          # Production container image for Python backend
│   ├── Procfile                            # Heroku deployment command (uvicorn app.main:app)
│   └── runtime.txt                         # Specifies Python 3.12.3 for cloud hosts
│
├── frontend/                               # React 19 + Vite Frontend SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx                  # Top bar with live coverage badges and modal triggers
│   │   │   ├── Controls.jsx                # Market presets (EPEX, Nord Pool), date and grid controls
│   │   │   ├── KpiCards.jsx                # Key trading metrics cards (MAE, Bias, RMSE, P10-P90)
│   │   │   ├── ForecastChart.jsx           # Recharts time-series: Actual vs. Forecast with zoom brush
│   │   │   ├── VersionInspector.jsx        # Traces all 20+ historical forecast runs for any half-hour
│   │   │   ├── PeriodAnalysis.jsx          # Diurnal curve across Settlement Periods 1 to 48
│   │   │   ├── DailyBreakdown.jsx          # Day-by-day accuracy and generation ledger for Jan 2026
│   │   │   ├── HorizonChart.jsx            # Lead-time degradation chart (0h to 72h lead time)
│   │   │   ├── DataAuditModal.jsx          # Modal report verifying 1,488 intervals & zero gaps
│   │   │   └── ClientPitchModal.jsx        # Built-in Client Pitch & Technical Architecture Review
│   │   ├── api.js                          # Fetch client communicating with the backend API
│   │   ├── App.jsx                         # Main dashboard state management and layout tabs
│   │   ├── main.jsx                        # React root entrypoint
│   │   └── index.css                       # Tailwind CSS styling and dark theme tokens
│   ├── package.json                        # Frontend packages (React 19, Recharts, Tailwind, Lucide)
│   ├── vite.config.js                      # Vite build configuration with Tailwind plugin & proxy
│   ├── nginx.conf                          # Nginx reverse proxy configuration for production Docker
│   ├── Dockerfile                          # Multi-stage Docker container (Node build + Nginx serve)
│   └── vercel.json                         # Frontend-specific Vercel routing rules
│
├── docker-compose.yml                      # Single-command multi-container Docker setup
├── vercel.json                             # Root Vercel multi-service configuration (frontend + backend)
├── pytest.ini                              # Pytest pythonpath configuration
├── .gitignore                              # Git ignore rules for node_modules, logs, and venv
└── README.md                               # Project documentation, guides, and pitch
```

---

## 🚀 How to Start the Application

You can start and run the project using **any of the three methods below**:

### Method 1: One-Click Docker (Recommended)
If you have Docker Desktop installed, this starts both the backend and frontend with a single command:

```bash
docker compose up -d
```
* **Trading Desk Web App:** Open [http://localhost:3000](http://localhost:3000)
* **Backend API Swagger Docs:** Open [http://localhost:8000/docs](http://localhost:8000/docs)

To stop the containers:
```bash
docker compose down
```

---

### Method 2: Running Locally in VS Code (Terminal)

Open two terminals side-by-side in VS Code:

#### Terminal 1 — Start the Python Backend:
```bash
# 1. Navigate to backend
cd backend

# 2. Create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the server (Port 8000)
uvicorn app.main:app --reload --port 8000
```

#### Terminal 2 — Start the React Frontend:
```bash
# 1. Navigate to frontend
cd frontend

# 2. Install packages
npm install

# 3. Start development server (Port 3000)
npm run dev
```

Open your browser to: **[http://localhost:3000](http://localhost:3000)**

---

### How to Run Automated Tests
To verify all calculations, data cleaning, and API routes:
```bash
python -m pytest backend/tests -v
```
**All 13 tests will run and pass**, validating:
* Data filtering (`fuelType == "WIND"`) and deduplication
* 100% January 2026 completeness (1,488 half-hour settlement periods, 0 gaps)
* Decision cutoff filtering ($D-1$ 11:00 UTC vs. rolling hours)
* Hand-calculated MAE, RMSE, Mean Bias, and MAPE ground-truth cases
* FastAPI health and presets endpoints

---

## 📊 January 2026 Key Empirical Findings

Evaluating National Grid ESO / Elexon data for the full month of **January 2026** revealed crucial trading insights:

| Metric | Day-Ahead Decision Forecast ($D-1$ 11:00 UTC) | Latest Real-Time Benchmark | Trader Takeaway & Operational Impact |
| :--- | :---: | :---: | :--- |
| **Evaluated Sample** | **744 hourly intervals** | 744 hourly intervals | 100% complete January coverage |
| **MAE (Mean Absolute Error)** | **2,107.18 MW** | **1,794.22 MW** | Error decreases by **-312.96 MW (-14.8%)** closer to delivery |
| **RMSE** | **2,611.24 MW** | **2,280.90 MW** | High sensitivity to sudden winter frontal shifts |
| **Forecast Bias (Mean Error)** | **+1,839.92 MW** | **+1,592.49 MW** | **Critical Alert:** The forecast systematically *over-predicted* wind |
| **MAPE** | **21.88%** | **16.34%** | Normalized percentage error |
| **Correlation ($r$)** | **0.9287** | **0.9540** | Strong directional alignment with actuals |
| **Error Spread ($P_{10}$ to $P_{90}$)** | **-502.7 MW to +4,377 MW** | -289 MW to +3,763 MW | 80% of Day-Ahead intervals carried positive wind shortfall risk |

> **Key Business Discovery for January 2026:**  
> The national wind forecast exhibited a **massive positive bias (+1,839 MW)**. If a utility bought day-ahead power based solely on the raw forecast without WindProcure's bias quantification, they would have been **systematically short of power across 80% of delivery intervals**, costing millions of pounds in emergency Balancing Mechanism cashout penalties.

---

## 🌐 Deploying to Vercel or Heroku

### Vercel Deployment (Full-Stack Monorepo)
The root [`vercel.json`](file:///d:/WINDFOR/vercel.json) is configured using **Vercel Services**:
1. Push this repository to your GitHub account (`https://github.com/Namanag17/kjhw`).
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Vercel automatically deploys:
   * **`frontend`** service (Vite React app on `/(.*)`)
   * **`backend`** service (FastAPI on `/api/(.*)`)
4. Your application will be live instantly!

### Heroku Deployment (Backend)
The backend includes a [`Procfile`](file:///d:/WINDFOR/backend/Procfile) and [`runtime.txt`](file:///d:/WINDFOR/backend/runtime.txt):
```bash
heroku create windfor-backend
git subtree push --prefix backend heroku main
```

---

## 🤖 AI Tools Transparency Declaration

In accordance with project guidelines, AI development tools (**Google Antigravity** powered by **Gemini**) were utilized as an assistive pair-programmer to accelerate:
* Drafting boilerplate code and test scaffolds.
* Exploring live Elexon BMRS endpoint schemas and stream parameters.
* Constructing statistical routines and responsive Tailwind UI widgets.
All domain logic, settlement period alignment, forecast-matching rules, data cleaning, and architectural designs were verified against live Elexon data.
