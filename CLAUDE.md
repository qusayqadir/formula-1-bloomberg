# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Formula 1 Bloomberg Terminal — a data platform that ingests historic F1 race data into a PostgreSQL database and surfaces it through a Bloomberg-style analytics interface. A RAG-based internal chat is planned (custom chunking, embeddings, re-ranking). No live telemetry — historical data only.

## Environment Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Requires a `.env` file at the root:
```
DATABASE_URL=postgresql+psycopg://USER@HOST:PORT/DBNAME
```

## Common Commands

```bash
# Apply migrations
.venv/bin/alembic upgrade head

# Create a new migration (blank)
.venv/bin/alembic revision -m "description"

# Rollback one step
.venv/bin/alembic downgrade -1
```

## Architecture

```
src/
  historic_pipeline/
    model/       # Pydantic models for validating ingested data
alembic/
  versions/      # Migration files
  env.py         # Reads DATABASE_URL from .env via python-dotenv
```

### Key Conventions

- **Migrations use raw SQL** via `op.execute()`, not SQLAlchemy column definitions.
- **Pydantic models** (`src/historic_pipeline/model/`) validate data coming into the pipeline — they are not ORM models.
- `alembic/env.py` uses `os.environ["DATABASE_URL"]` (hard fail if missing), not `os.getenv()`.
- SQLAlchemy is used only as the Alembic engine driver, not as an ORM.
