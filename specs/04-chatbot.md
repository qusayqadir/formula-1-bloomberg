# 04 — Chatbot: NL Queries → Data + Visuals, FIA Regulations Q&A

## Goal
Chat panel where users ask natural-language questions. An agent loop
(Anthropic API, ANTHROPIC_API_KEY) inspects the backend DB, runs READ-ONLY
SQL, and returns answers with optional chart specs the frontend renders.
Also answers FIA sporting/technical regulation questions from an ingested
regs corpus. Refuses off-topic queries.

## Architecture (src/api/routers/chat.py + src/api/chat/)
- Tool-use loop with three tools:
  1. `query_database(sql)` — guarded executor: SELECT-only (sqlglot parse,
     reject anything else), auto-LIMIT 200, statement_timeout 5s, runs as a
     read-only DB role. Schema description (from models.py, incl. the
     2011–2025 + no-sprint-tables facts) is in the system prompt.
  2. `render_chart(spec)` — returns a typed chart spec (line|bar|table,
     series[], axis labels) the frontend renders with the standard chart kit.
  3. `search_regulations(query)` — hybrid retrieval over the FIA regs corpus
     in MongoDB Atlas (see below). Citations include document + article numbers.

## FIA Regulations RAG store (MongoDB Atlas)
- Ingestion: `scripts/ingest_regulations.py` parses the FIA sporting +
  technical + financial regulation PDFs into article-aware chunks
  (split on article/sub-article boundaries, ~500 token target, store
  metadata: doc, year, article, title, page).
- Storage: Mongo collection `regulations_chunks` with fields
  { text, embedding, doc, year, article, title, page }.
  Embeddings: Voyage AI (`voyage-3` family, VOYAGE_API_KEY) — fall back to a
  local sentence-transformers model if no key, flagged in logs.
- Indexes: one Atlas **Vector Search** index on `embedding` (cosine) and one
  Atlas **Search** (BM25/lucene) index on `text` + `title`.
- Hybrid retrieval, in this exact pipeline:
  1. Run semantic top-k=25 ($vectorSearch) and keyword top-k=25 ($search) in
     parallel.
  2. Fuse with Reciprocal Rank Fusion (RRF, k=60) into one candidate list.
  3. Re-rank the fused top-20 with a cross-encoder re-ranker: Voyage
     `rerank-2` if VOYAGE_API_KEY set, else local
     `cross-encoder/ms-marco-MiniLM-L-6-v2`.
  4. Return top-5 chunks with scores + metadata to the model.
- If Atlas Search is unavailable (e.g., self-hosted Mongo in dev), keyword leg
  falls back to a `$text` index — interface stays identical.
- Chat transcripts/history also persist in Mongo (`chat_sessions` collection),
  keyed by a client session id.

## Streaming
- `POST /api/chat/stream` returns Server-Sent Events: token deltas, tool-call
  status events ("RUNNING SQL…", "SEARCHING REGULATIONS…"), chart-spec events,
  and a final done event with citations. Frontend renders tokens as they
  arrive (mono, block-cursor while streaming) and tool status as inline
  microlabel rows in the transcript.
- Scope guard: system prompt restricts to F1 data + FIA regs; off-topic →
  polite refusal.

## UI (route: /chat — also a slide-over available from the command bar)
- Terminal-style transcript: user lines prefixed `>`, mono. Assistant tables/
  charts render as in-chat panels using the standard theme chart components.
- "Show SQL" disclosure under any data answer (transparency).
- Suggested prompts strip (e.g. "podiums by driver 2021", "explain parc fermé rules").

## Acceptance criteria
1. No ANTHROPIC_API_KEY: chat panel renders FEATURE OFFLINE; endpoint returns
   503 JSON. No MONGODB_URI: regs tool reports unavailable, data Q&A still works.
2. Guarded executor: evaluator sends INSERT/UPDATE/DROP/`;`-chained strings to
   the tool path — all rejected; SELECTs without LIMIT get auto-limited.
3. "Who won the most races in 2021?" produces a correct answer (evaluator
   verifies against SQL) and a renderable chart spec.
4. A sprint-related question is answered honestly (data not available) — the
   model does not hallucinate sprint tables.
5. Hybrid retrieval verifiably hybrid: evaluator runs the retrieval function
   directly on (a) an exact-article-term query (e.g. an article number) where
   the keyword leg must surface the right chunk, and (b) a paraphrased
   conceptual query where the semantic leg must — both return the correct
   article in the top-5 after re-ranking. RRF fusion and re-rank steps are
   unit-tested with fixture chunks.
6. Regs answer (e.g. safety car restart rules) cites doc + article number from
   retrieved chunks only.
7. Off-topic question ("best pizza in Toronto") is declined in-theme.
8. SSE streaming works end-to-end: evaluator curls /api/chat/stream and sees
   incremental token events and tool-status events; UI renders mid-stream.
9. Chat history persists in Mongo and reloads for the same session id.
10. ingest_regulations.py is idempotent (re-run produces no duplicate chunks).
