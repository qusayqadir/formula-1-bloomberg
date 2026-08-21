from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.router import api_router

app = FastAPI(
    title="F1 Terminal API",
    description="Read-only API over the ingested historic F1 database (schema: bronze).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
