from fastapi import APIRouter

from app.router import (
    analytics,
    championships,
    circuits,
    drivers,
    meta,
    results,
    rounds,
    seasons,
    sessions,
    teams,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(seasons.router)
api_router.include_router(rounds.router)
api_router.include_router(sessions.router)
api_router.include_router(results.router)
api_router.include_router(drivers.router)
api_router.include_router(teams.router)
api_router.include_router(circuits.router)
api_router.include_router(championships.router)
api_router.include_router(meta.router)
api_router.include_router(analytics.router)
