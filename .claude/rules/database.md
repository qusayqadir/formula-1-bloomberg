# Database Rules

## Medallion Architecture
Layers are separated by PostgreSQL schemas:
- `bronze` — raw ingested data, as close to the API response as possible
- `silver` — cleaned, typed, deduped, nulls handled (future)

## Bronze Layer Contract
- Store data as-ingested with minimal transformation (flatten nested JSON, that's it)
- Always include an `ingested_at TIMESTAMP DEFAULT NOW()` column
- No data quality fixes, no business logic — that belongs in silver

## Silver Layer Contract (future)
- Source exclusively from bronze tables
- Handle nulls, invalid values, inconsistent formats, deduplication
- Column names should be snake_case and match the domain model

## Migrations
- All migrations use raw SQL via `op.execute()` — no SQLAlchemy column definitions
- One logical change per migration file
- Use descriptive `-m` messages: `alembic revision -m "add bronze races table"`
- Always implement `downgrade()` to reverse the upgrade

## Inserts
- All inserts use `ON CONFLICT (unique_col) DO NOTHING` to be idempotent
- Ingest scripts can be re-run safely at any time
