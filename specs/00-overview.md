# F1 Terminal — Build Overview

Bloomberg-terminal-inspired, data-dense F1 web application.
Stack: FastAPI (extends existing Python repo) + Next.js App Router + TypeScript
+ Tailwind + react-three-fiber (3D) + lightweight-charts/visx (charts)
+ TanStack Query/Table. Live data via WebSocket from FastAPI.

## Build order (one spec per session, fresh context each time)
0. `00` Scaffolding: src/api skeleton, frontend skeleton, theme tokens, command bar shell
1. `01` Historical results dashboard  ← only depends on existing DB
2. `06` Team profiles                 ← new app tables + DB
3. `03` Homepage globe + calendar + track panels (track walk NOT included)
4. `02` Sentiment & odds              ← keyed APIs
5. `04` Chatbot (MongoDB hybrid RAG + SSE streaming)
6. `07` Track walk SPIKE — explore options, throwaway prototypes, then decide
-- `05` Live telemetry: DEFERRED. Do not implement unless the human re-activates it.

## Session protocol (how to run each spec)
1. Start fresh session. Prompt: "Implement specs/NN-<name>.md. Use plan mode
   first; use db-explorer for data questions; verify with evaluator and
   design-reviewer before declaring done."
2. Optionally set the spec's acceptance criteria as a /goal.
3. Evidence required at the end: evaluator PASS verdict + design-reviewer PASS.

## Global decisions (locked)
- Seasons 2011–2025. No sprint quali/result tables. Ingest DB is read-only.
- Odds/sentiment are DISPLAY ONLY. No wagering, no money flows, no bet placement,
  in any form.
- Live telemetry (spec 05) is DEFERRED — no /live route, no WebSocket layer yet.
- Two datastores: Postgres (F1 data + app tables) and MongoDB Atlas (FIA regs
  vector store + chat transcripts). Mongo is used ONLY by the chatbot feature.
- Missing API key ⇒ panel renders "FEATURE OFFLINE — SET <VAR>" state. Never crash.
- App data (chat sessions, team personnel) lives outside the ingest schema:
  Postgres app tables under alembic branch label `app`.
- Theme: .claude/skills/terminal-theme/SKILL.md is law.
