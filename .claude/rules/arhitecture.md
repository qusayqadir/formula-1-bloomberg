  # Architecture Rules

  ## Source of Truth for Data Flow
  Bronze → Silver → (future: Gold/API). Never skip layers.
  Silver reads exclusively from bronze tables, never from the API directly.

  ## No ORM
  SQLAlchemy is the Alembic engine driver only. Never use it to define models,
  query data, or manage schema. All schema changes go through migration files.                 
                                                                                               
  ## Pydantic Models Are Validators, Not DB Models                                             
  `src/historic_pipeline/model/` validates incoming API responses before insert.               
  They do not map to DB tables. Do not add ORM relationships or DB column metadata.            
                                                                                               
  ## Environment Variables                                                                     
  `os.environ["DATABASE_URL"]` — hard fail if missing. Never use `os.getenv()`                 
  with a default. If the env is misconfigured, we want a loud error, not silent fallback.      
                                                                                               
  ## Pipeline Entry Points                                                                     
  Ingest scripts live in `src/historic_pipeline/`. Each script is a standalone                 
  runner — no shared state between runs. All inserts must be idempotent (ON CONFLICT DO        
  NOTHING).   