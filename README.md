# AI Software Dependency Risk Analyzer

An automated, full-stack software supply chain security risk analyzer built for an IEEE Final-Year B.Tech IT project. Scans software dependency manifest and lock files (`package.json`, `package-lock.json`, `yarn.lock`, `requirements.txt`, `requirements-lock.txt`, `pom.xml`), detects direct and transitive CVE vulnerabilities using the OSV.dev database, checks package staleness via registry APIs (npm, PyPI, Maven Central), visualizes dependency trees via React Flow, and generates plain-English AI risk explanations with copyable CLI remediation commands.

---

## 🏗️ Repository Structure

```
dep_analyzer/
├── backend/
│   ├── main.py                # FastAPI server & routes
│   ├── parsers.py             # Dependency manifest & lockfile parsers
│   ├── osv_client.py          # OSV.dev batch API client
│   ├── registry_client.py     # Package registry staleness client
│   ├── ai_risk_engine.py      # LLM risk explanation engine
│   ├── database.py            # SQLite database manager
│   ├── schemas.py             # Pydantic validation schemas
│   ├── dep_analyzer.db        # SQLite database
│   └── requirements.txt       # Backend dependencies
│
├── frontend/
│   ├── public/                # Favicon and static assets
│   ├── src/
│   │   ├── components/        # Reusable UI (Navbar, Footer, FileUpload, DependencyGraph, AIRiskModal)
│   │   ├── pages/             # Pages (HomePage, ResultsPage, HistoryPage, PrivacyPolicyPage, TermsPage)
│   │   ├── App.jsx            # Main app container & routing
│   │   ├── main.jsx           # React entry point
│   │   └── index.css          # Tailwind CSS styles
│   ├── package.json           # Frontend dependencies
│   └── vite.config.js         # Vite configuration
│
├── README.md                  # Project documentation
└── .gitignore                 # Root gitignore
```

---

## 🚀 Quick Start Guide

### 1. Backend Setup
```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8000
```

### 2. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

Open your browser at **http://localhost:5173**.
