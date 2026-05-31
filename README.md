<div align="center">

<img src="https://img.shields.io/badge/QueryPilot_AI-Text_to_SQL-7c3aed?style=for-the-badge&logo=lightning&logoColor=white" alt="QueryPilot AI" />

# QueryPilot AI

### Talk to your PostgreSQL database in plain English

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Live Demo](#) · [Report Bug](https://github.com/issues) · [Request Feature](https://github.com/issues)

</div>

---

## What is QueryPilot AI?

**QueryPilot AI** is a full-stack AI-powered SQL assistant that lets anyone — technical or not — interact with a PostgreSQL database using plain English. Instead of writing complex SQL queries, you simply describe what you want to know, and the AI generates, explains, and executes the query for you.

> *"Show me monthly revenue for this year"* → generates a `DATE_TRUNC` GROUP BY query, explains it, executes it, and renders a line chart — all in under 3 seconds.

This project was built to demonstrate end-to-end product engineering across **LLM integration, database intelligence, full-stack development, and production-ready architecture** — skills in high demand for modern AI/data engineering roles.

---

## Skills Demonstrated

| Domain | Technologies & Concepts |
|--------|------------------------|
| **LLM Integration** | OpenAI API, Gemini API, OpenRouter, prompt engineering, structured JSON output, retry logic |
| **Text-to-SQL** | Schema introspection, FK-aware JOIN generation, CTE support, SQL safety validation |
| **Backend Engineering** | FastAPI, async SQLAlchemy, Alembic migrations, JWT auth, bcrypt, service layer pattern |
| **Frontend Engineering** | Next.js 16 App Router, TypeScript, Tailwind CSS v4, Zustand, TanStack Query |
| **Database** | PostgreSQL, asyncpg, complex aggregation queries, JSONB operations |
| **Cloud & Storage** | Cloudinary file storage, Render PostgreSQL, environment-based config |
| **Security** | SQL injection prevention, read-only enforcement, XOR encryption, token auth |
| **UI/UX** | Dark/light theme, responsive design, shadcn-style components, Recharts |
| **DevOps** | Git workflow, Alembic schema versioning, modular project structure |

---

## Features

### Core
- **Natural Language → SQL** — Ask questions in plain English; AI generates production-ready SELECT queries using full schema context (tables, columns, PKs, FKs)
- **Multi-LLM Support** — Switch between OpenAI (GPT-4o), Google Gemini (2.5 Flash), or any OpenRouter model via a single env variable
- **Schema Understanding** — Automatically discovers all tables, columns, data types, nullable flags, primary keys, and foreign key relationships
- **SQL Explanation** — Every query is accompanied by a plain-English explanation of what it does and why
- **Query Optimization** — AI suggests index hints and rewrites after generating the initial query
- **Safety Layer** — Blocks `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `CREATE`, `TRUNCATE`, `GRANT`, `COPY`, `pg_sleep`, and SQL comments before any query reaches the database

### Data & Visualization
- **Auto Chart Detection** — Automatically picks bar, line, or pie chart based on column names and data shape (dates → line, categories → bar/pie)
- **Recharts Integration** — Fully themed interactive charts that respect dark/light mode
- **Table View** — Paginated, striped result table with NULL highlighting
- **CSV Upload** — Upload any CSV; it becomes a queryable PostgreSQL table instantly with type inference (TEXT, BIGINT, DOUBLE PRECISION, BOOLEAN, TIMESTAMP)
- **Cloudinary Storage** — Original CSV files stored on Cloudinary for permanent access with download links

### Database Management
- **Multiple Connections** — Manage many PostgreSQL databases per account
- **URL Parser** — Paste a full `postgresql://` connection URL; fields auto-populate
- **Live Connection Test** — Every connection is verified before saving
- **Credential Encryption** — Passwords are XOR-encrypted with an HMAC-derived key before database storage

### Analytics & History
- **Query History** — Every query saved with SQL, explanation, execution time, row count, and table metadata
- **Dashboard** — Usage stats, daily query trend chart, most-queried tables bar chart, success rate tracking
- **Re-run Queries** — Browse and re-execute any historical query

### UX & Auth
- **JWT Authentication** — Stateless auth with 24-hour token expiry
- **Persistent Sessions** — Auth state survives page refresh via Zustand + localStorage
- **Dark / Light Theme** — Full theme system using CSS custom properties, toggleable from the sidebar
- **ElevenLabs-Inspired UI** — Clean dark aesthetic with purple gradient accents, glassmorphism cards, smooth animations
- **Sonner Toasts** — Multicolor bottom-right notifications (green/red/blue/yellow)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         QueryPilot AI                           │
│                                                                 │
│  ┌─────────────────┐       ┌─────────────────────────────────┐ │
│  │   Next.js 16    │       │        FastAPI Backend           │ │
│  │   Frontend      │◄─────►│                                 │ │
│  │                 │  REST │  ┌──────────┐  ┌─────────────┐  │ │
│  │  Zustand Store  │  JSON │  │  LLM     │  │  DB Service │  │ │
│  │  TanStack Query │       │  │  Service │  │  (asyncpg)  │  │ │
│  │  Tailwind v4    │       │  └────┬─────┘  └──────┬──────┘  │ │
│  │  Recharts       │       │       │                │         │ │
│  └─────────────────┘       │  ┌────▼─────┐  ┌──────▼──────┐  │ │
│                            │  │  OpenAI  │  │  Your       │  │ │
│                            │  │  Gemini  │  │  PostgreSQL │  │ │
│                            │  │  OpenRtr │  │  Database   │  │ │
│                            │  └──────────┘  └─────────────┘  │ │
│                            │                                   │ │
│                            │  ┌──────────┐  ┌─────────────┐  │ │
│                            │  │ Alembic  │  │  Cloudinary │  │ │
│                            │  │Migration │  │  CSV Store  │  │ │
│                            │  └──────────┘  └─────────────┘  │ │
│                            └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow — Natural Language → SQL → Results

```
User types question
      │
      ▼
POST /api/v1/queries/generate
      │
      ├── Fetch DB schema (tables, columns, PKs, FKs, row counts)
      ├── Build LLM prompt with schema context + safety rules
      ├── Call LLM  →  returns { sql, explanation, tables_used }
      ├── Call LLM again  →  optimization suggestions
      └── Save to query_history → return to frontend
              │
              ▼
User reviews & optionally edits SQL → clicks Execute
              │
              ▼
POST /api/v1/queries/execute
              │
              ├── Safety validation (12+ blocked mutation keywords)
              ├── Execute on user's PostgreSQL (fresh async connection)
              ├── Auto-detect chart type (bar / line / pie / table)
              └── Return columns, rows, execution_time_ms, suggested_chart
```

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Backend** | FastAPI | 0.115+ | Async REST API |
| **ORM** | SQLAlchemy | 2.0+ | Async DB sessions |
| **Migrations** | Alembic | 1.14+ | Schema versioning |
| **DB Driver** | asyncpg | 0.31+ | PostgreSQL async driver |
| **Auth** | python-jose + bcrypt | — | JWT + password hashing |
| **LLM** | openai / google-generativeai | — | SQL generation |
| **File Storage** | Cloudinary | 1.40+ | CSV file hosting |
| **Frontend** | Next.js | 16 | React App Router |
| **Language** | TypeScript | 5 | Type-safe frontend |
| **Styling** | Tailwind CSS | v4 | Utility-first CSS |
| **State** | Zustand | 5 | Client state + persistence |
| **Server State** | TanStack Query | 5 | API caching + loading |
| **Charts** | Recharts | 3 | Data visualization |
| **Toasts** | Sonner | — | Notifications |
| **Database** | PostgreSQL | 14+ | Primary database |

---

## Project Structure

```
QueryPilot AI/
│
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   │   ├── auth.py           # Register, login, /me
│   │   │   ├── connections.py    # CRUD + schema fetch + test
│   │   │   ├── queries.py        # Generate + execute + history
│   │   │   ├── dashboard.py      # Analytics & usage stats
│   │   │   └── csv_upload.py     # CSV ingest + Cloudinary
│   │   ├── core/
│   │   │   ├── config.py         # Pydantic Settings from .env
│   │   │   ├── security.py       # JWT + bcrypt
│   │   │   └── logging.py        # Loguru structured logging
│   │   ├── db/base.py            # Async SQLAlchemy engine + session
│   │   ├── models/               # SQLAlchemy ORM models
│   │   ├── schemas/              # Pydantic v2 request/response models
│   │   ├── services/
│   │   │   ├── llm_service.py    # OpenAI / Gemini / OpenRouter
│   │   │   ├── db_service.py     # Schema fetch + query execution
│   │   │   ├── cache_service.py  # Optional Redis caching
│   │   │   └── csv_service.py    # Pandas + Cloudinary upload
│   │   └── utils/
│   │       ├── sql_safety.py     # Mutation keyword blocker
│   │       ├── chart_suggester.py
│   │       └── encryption.py
│   ├── alembic/                  # Migration scripts
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── app/
    │   ├── page.tsx              # Landing page
    │   ├── login/ & register/    # Auth pages
    │   ├── dashboard/            # Analytics overview
    │   ├── query/                # AI query interface
    │   ├── connections/          # DB connection manager
    │   ├── history/              # Query history browser
    │   └── csv/                  # CSV upload + file listing
    ├── components/
    │   ├── ui/                   # Button, Card, Input, Badge, Select...
    │   ├── layout/               # Sidebar, AppLayout
    │   └── query/                # ResultChart (Recharts)
    ├── lib/
    │   ├── api.ts                # Axios client with JWT interceptor
    │   ├── parseDbUrl.ts         # PostgreSQL URL parser utility
    │   └── utils.ts
    └── store/
        ├── auth.ts               # Zustand auth + hydration tracking
        └── query.ts              # Zustand query state
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A PostgreSQL database — [Render free tier](https://render.com/docs/databases) works great
- An LLM API key — [OpenAI](https://platform.openai.com/api-keys), [Gemini](https://aistudio.google.com/app/apikey), or [OpenRouter](https://openrouter.ai/keys)

### 1. Clone the repo

```bash
git clone https://github.com/your-username/querypilot-ai.git
cd querypilot-ai
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r requirements.txt

cp .env.example .env
# Edit .env — see the Configuration section below
```

### 3. Configure `backend/.env`

```env
# Your PostgreSQL database
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/querypilot
SYNC_DATABASE_URL=postgresql+psycopg2://user:password@host:5432/querypilot

# Generate: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-64-char-hex-secret

# LLM — choose one
LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
GEMINI_API_KEY=AIza...
# OPENAI_API_KEY=sk-...
# OPENROUTER_API_KEY=sk-or-...

# Cloudinary (optional — for CSV file storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

ALLOWED_ORIGINS=http://localhost:3000
```

### 4. Run migrations

```bash
python -m alembic upgrade head
```

### 5. Start backend

```bash
uvicorn app.main:app --reload --port 8000
# API docs → http://localhost:8000/docs
```

### 6. Frontend setup

```bash
cd ../frontend
npm install

# Create frontend/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

npm run dev
# App → http://localhost:3000
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/v1/auth/register` | | Create account |
| `POST` | `/api/v1/auth/login` | | Get JWT token |
| `GET` | `/api/v1/auth/me` | ✓ | Current user info |
| `GET` | `/api/v1/connections` | ✓ | List all connections |
| `POST` | `/api/v1/connections` | ✓ | Add & test connection |
| `DELETE` | `/api/v1/connections/{id}` | ✓ | Remove connection |
| `GET` | `/api/v1/connections/{id}/schema` | ✓ | Fetch DB schema |
| `POST` | `/api/v1/connections/{id}/test` | ✓ | Ping connection |
| `POST` | `/api/v1/queries/generate` | ✓ | Natural language → SQL |
| `POST` | `/api/v1/queries/execute` | ✓ | Execute SQL safely |
| `GET` | `/api/v1/queries/history` | ✓ | Query history |
| `DELETE` | `/api/v1/queries/history/{id}` | ✓ | Delete history item |
| `GET` | `/api/v1/dashboard/stats` | ✓ | Usage analytics |
| `POST` | `/api/v1/csv/upload` | ✓ | Upload CSV → table |
| `GET` | `/api/v1/csv/tables` | ✓ | List CSV tables |
| `DELETE` | `/api/v1/csv/tables/{id}` | ✓ | Delete table + file |

---

## Security Design

| Threat | Mitigation |
|--------|-----------|
| SQL injection | Parameterized queries via SQLAlchemy; user SQL never interpolated |
| Destructive queries | Keyword blocklist: `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE` + 6 more |
| Credential exposure | DB passwords XOR-encrypted with HMAC-derived key before storage |
| Unauthorized access | JWT bearer tokens required on every protected route |
| Comment-based bypass | SQL comments (`--`, `/*`) stripped from all submitted queries |
| Oversized queries | 10,000 character hard limit enforced server-side |

---

## Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `DATABASE_URL` | ✅ | Async PostgreSQL URL (`postgresql+asyncpg://...`) |
| `SYNC_DATABASE_URL` | ✅ | Sync URL for Alembic (`postgresql+psycopg2://...`) |
| `SECRET_KEY` | ✅ | 64-char hex string for JWT signing |
| `LLM_PROVIDER` | ✅ | `openai` / `gemini` / `openrouter` |
| `LLM_MODEL` | ✅ | e.g. `gemini-2.5-flash`, `gpt-4o-mini` |
| `OPENAI_API_KEY` | If using OpenAI | OpenAI platform key |
| `GEMINI_API_KEY` | If using Gemini | Google AI Studio key |
| `OPENROUTER_API_KEY` | If using OpenRouter | OpenRouter key |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Optional | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Optional | Cloudinary API secret |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins |
| `REDIS_URL` | Optional | Redis URL for query caching |
| `REDIS_ENABLED` | Optional | `true` to enable Redis cache |

---

## Resume Keywords

`Text-to-SQL` · `LLM Application Development` · `OpenAI API` · `Gemini API` · `Prompt Engineering` · `FastAPI` · `SQLAlchemy` · `Async Python` · `Alembic` · `PostgreSQL` · `Database Intelligence` · `Schema Introspection` · `Query Optimization` · `Next.js` · `TypeScript` · `React` · `Tailwind CSS` · `Zustand` · `TanStack Query` · `Recharts` · `REST API Design` · `JWT Authentication` · `Cloudinary` · `Full Stack Development` · `Production-Ready Code`

---

## License

MIT — free to use, modify, and distribute.

---

<div align="center">

Built as a portfolio project · Open to contributions and feedback

⭐ **Star this repo if you found it useful**

</div>