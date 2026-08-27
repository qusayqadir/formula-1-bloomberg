from fastapi import APIRouter

from app.router.analytics import championships, comparisons, qualifying, summaries

router = APIRouter(prefix="/analytics")
router.include_router(championships.router)
router.include_router(summaries.router)
router.include_router(comparisons.router)
router.include_router(qualifying.router)
