# QueryPilot AI

A production-ready AI SQL Assistant. Connect a PostgreSQL database and query it using plain English — powered by OpenAI / Gemini / OpenRouter.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI + SQLAlchemy (async) |
| Frontend | Next.js 15 + TypeScript + TailwindCSS |
| Database | PostgreSQL |
| Auth | JWT (python-jose + bcrypt) |
| Charts | Recharts |
| LLM | OpenAI / Gemini / OpenRouter |
| Cache | Redis (optional) |

## Features

- **Natural Language → SQL** — Ask "Show monthly revenue" and get a ready-to-run SELECT query
- **Schema Understanding** — Auto-discovers tables, columns, PKs, and FKs
- **SQL Safety Layer** — Blocks DROP, DELETE, UPDATE, INSERT, ALTER, etc.
- **SQL Explanation** — Every query comes with a plain-English explanation
- **Query Optimization** — AI suggests index hints and rewrites
- **Data Visualization** — Auto-picks bar/line/pie chart based on result shape
- **Query History** — Browse, re-run, or delete past queries
- **Multiple DB Connections** — Manage many PostgreSQL connections per user
- **CSV Upload** — Upload CSV files and query them like regular tables
- **Dashboard** — Usage stats, most-queried tables, execution trends

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### 1. Clone & Setup

```bash
# Windows PowerShell
.\setup.ps1

# macOS / Linux
bash setup.sh
```

### 2. Configure Backend

Edit `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/querypilot
SYNC_DATABASE_URL=postgresql+psycopg2://postgres:yourpassword@localhost:5432/querypilot
SECRET_KEY=your-super-secret-key

# Choose ONE provider:
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...

# OR
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
GEMINI_API_KEY=AIza...

# OR
LLM_PROVIDER=openrouter
LLM_MODEL=openai/gpt-4o-mini
OPENROUTER_API_KEY=sk-or-...
```

### 3. Create PostgreSQL Database

```sql
CREATE DATABASE querypilot;
```

### 4. Start Services

**Backend:**
```bash
cd backend
# Windows: .\venv\Scripts\Activate.ps1
# macOS/Linux: source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:3000**

## Project Structure

```
QueryPilot AI/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # auth, connections, queries, dashboard, csv
│   │   ├── core/               # config, security, logging
│   │   ├── db/                 # SQLAlchemy engine, init
│   │   ├── models/             # User, DBConnection, QueryHistory, CSVTable
│   │   ├── schemas/            # Pydantic request/response models
│   │   ├── services/           # llm_service, db_service, cache_service, csv_service
│   │   ├── utils/              # sql_safety, chart_suggester, encryption
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── app/                    # Next.js App Router pages
    ├── components/             # Reusable UI components
    ├── lib/                    # API client, utils
    └── store/                  # Zustand state management
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/connections` | List DB connections |
| POST | `/api/v1/connections` | Add connection (tests it first) |
| GET | `/api/v1/connections/{id}/schema` | Fetch schema |
| POST | `/api/v1/queries/generate` | NL → SQL |
| POST | `/api/v1/queries/execute` | Execute SQL |
| GET | `/api/v1/queries/history` | Query history |
| GET | `/api/v1/dashboard/stats` | Usage analytics |
| POST | `/api/v1/csv/upload` | Upload CSV |

Interactive docs: **http://localhost:8000/docs**

## Safety

All generated SQL is validated before execution:
- Must start with `SELECT` or `WITH`
- Blocks: DROP, DELETE, UPDATE, INSERT, ALTER, CREATE, TRUNCATE, GRANT, REVOKE, COPY, pg_sleep
- SQL comments stripped
- 10,000 character limit
