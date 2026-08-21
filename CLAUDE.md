# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Formula 1 Bloomberg Terminal — a data platform that ingests historic F1 race data into a PostgreSQL database and surfaces it through a Bloomberg-style analytics interface. A LangGraph-based internal chat routes questions to a regulation RAG subgraph (docs chunked/embedded into MongoDB with Voyage embeddings) or a data-visualization subgraph (text-to-SQL over Postgres). No live telemetry — historical data only.

## Environment Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Requires a `.env` file at the root:
```
DATABASE_URL=postgresql+psycopg://USER@HOST:PORT/DBNAME
ANTHROPIC_API_KEY=...        # chatbot LLM (langchain-anthropic default env var)
VOYAGE_API_KEY=...           # regulation-doc embeddings (voyageai.Client default env var)
MONGODB_URI=...              # regulation-doc chunk/embedding store (+ GridFS)
MONGODB_DATABASE_NAME=...    # MongoDB database name for regulation retrieval
```

## Common Commands

```bash
# Run the API (docs at http://localhost:8000/docs)
uvicorn app.main:app --reload --port 8000

# Run the frontend (http://localhost:3000, proxies /api → :8000)
cd frontend && npm install && npm run dev

# Frontend checks
cd frontend && npm run typecheck && npm run build

# Apply migrations
.venv/bin/alembic upgrade head

# Create a new migration (blank)
.venv/bin/alembic revision -m "description"

# Rollback one step
.venv/bin/alembic downgrade -1
```

## Architecture

```
app/
  main.py        # FastAPI app (title: F1 Terminal API), mounts router at /api/v1
  router/        # One file per resource: seasons, rounds, sessions, results, drivers,
                 # teams, circuits, championships, meta, chatbot (+ schemas.py, utils.py)
    analytics/   # Analytical dataset endpoints under /api/v1/analytics:
                 # championship progression, driver/team/circuit summaries,
                 # status distribution, driver head-to-head (+ schemas.py)
  pipeline/
    ingest/      # Historic data ingest (Pydantic models in models.py, entry point main.py)
  chatbot/       # LangGraph chat. graph.py compiles `terminal_chat`: router → one of
                 # {regulation_subgraph, data_visual_subgraph, out_of_scope}. Exposed
                 # via POST /api/v1/chatbot/chat (router/chatbot.py). state.py holds the
                 # shared AgentState TypedDict; core/models.py builds the ChatAnthropic LLM.
    router/      # Route classifier subgraph (REGULATION | VISUALIZATION | OUT_OF_SCOPE)
    regulation/  # Regulation RAG subgraph: query rewrite → Voyage embed → MongoDB vector
                 # search over chunked FIA docs → answer synthesis
    data_visual/ # Text-to-SQL subgraph over Postgres → chart/data answer
    evals/       # Route-classifier eval datasets + harness
frontend/        # Vite + React + TS dashboard (Tailwind v4, TanStack Query, ECharts)
  src/
    lib/         # api client, DTO types, query hooks, formatting, data colors
    state/       # URL-synced dashboard filter state + theme (dark/light) provider
    components/  # shell (sidebar), ui (AnalyticsCard, controls), charts (EChart wrapper)
    features/dashboard/  # Historical Dashboard page, entities, selectors, widgets/
    pages/       # ComingSoon stubs, DocsApis, DocsArchitecture, Creator

### Theming (dark + light)

- CSS tokens live on `:root[data-theme=…]` in `styles/index.css`; Tailwind reads
  them via `@theme inline`, so `bg-surface`/`text-ink` etc. follow the toggle.
- Charts can't read CSS vars (canvas): widgets call `useChartTheme()` from
  `components/charts/theme.ts` and build ECharts options from the returned
  bundle (`t` tokens + axis/tooltip/legend helpers), including it in their
  useMemo deps. Both palettes are validated per surface (see lib/colors.ts).
- Team identity colors are the SAME hex in both modes (brand-anchored);
  overlay washes must use `ink`-based utilities (`bg-ink/[0.05]`), never
  `bg-white/...`, so they work in both modes.
- Fonts: Wix Madefor Text (UI), Wix Madefor Display, Lora (serif accents),
  JetBrains Mono (data). Imported in main.tsx via @fontsource-variable.
core/
  database.py    # psycopg connection helper (get_connection, DATABASE_URL) +
                 # MongoDB URI accessor (MONGODB_URI) for the regulation store
  alembic/
    versions/    # Migration files
    env.py       # Reads DATABASE_URL from .env via python-dotenv
```

Run the ingest as a module from the repo root: `python -m app.pipeline.ingest.main`

### Known bronze data gaps (frontend works around these; fix belongs in ingest/silver)

- `session_entry.is_classified` is NULL on every row → any aggregate filtered on it
  (avg_finish, median_finish, classification_rate…) returns NULL/0.
- `session_entry.fastest_lap_time` sometimes stores the race TOTAL time (winner rows,
  >1h) or a gap (<30s). The frontend treats values outside 40s–900s as missing and
  recomputes fastest-lap gaps/ranks client-side.
- `team.primary_color` is NULL for all teams → frontend uses a curated name-based
  color map (frontend/src/lib/colors.ts); DB color takes precedence once populated.
- Only Race sessions have `session_entry` rows (no quali/practice classifications yet).
- `session_entry.status` loses DNF cause detail from 2023 onward: 2011–2022 carry
  specific causes (Engine, Collision…), 2023–2025 are almost all generic "Retired".
  The reliability widget's cause buckets are only meaningful pre-2023.

### Key Conventions

- **Migrations use raw SQL** via `op.execute()`, not SQLAlchemy column definitions.
- **Pydantic models** (`src/historic_pipeline/model/`) validate data coming into the pipeline — they are not ORM models.
- `alembic/env.py` uses `os.environ["DATABASE_URL"]` (hard fail if missing), not `os.getenv()`.
- SQLAlchemy is used only as the Alembic engine driver, not as an ORM.
