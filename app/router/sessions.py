from typing import Optional

import psycopg
from fastapi import APIRouter, Depends, Query

from core.database import get_db
from app.router.schemas import Page, Session, SessionResult, SessionType
from app.router.utils import Pagination, fetch_one_or_404, paginate
from app.router.results import RESULT_SELECT

router = APIRouter(prefix="/sessions", tags=["sessions"])

SESSION_SELECT = """
    SELECT sess.id, sess.api_id, sess.round_id, sess.type, sess.scheduled_at, sess.is_cancelled
    FROM bronze.session sess
    JOIN bronze.round r ON r.id = sess.round_id
    JOIN bronze.season s ON s.id = r.season_id
"""
SESSION_COUNT = """
    SELECT count(*) FROM bronze.session sess
    JOIN bronze.round r ON r.id = sess.round_id
    JOIN bronze.season s ON s.id = r.season_id
"""


@router.get("", response_model=Page[Session])
def list_sessions(
    year: Optional[int] = Query(None),
    round_id: Optional[int] = Query(None),
    type: Optional[SessionType] = Query(None),
    page: Pagination = Depends(),
    db: psycopg.Connection = Depends(get_db),
):
    where, params = [], {}
    if year is not None:
        where.append("s.year = %(year)s")
        params["year"] = year
    if round_id is not None:
        where.append("sess.round_id = %(round_id)s")
        params["round_id"] = round_id
    if type is not None:
        where.append("sess.type = %(type)s")
        params["type"] = type.value
    return paginate(
        db, SESSION_SELECT, SESSION_COUNT, where, params,
        "sess.scheduled_at NULLS LAST, sess.id", page,
    )


@router.get("/{session_id}", response_model=Session)
def get_session(session_id: int, db: psycopg.Connection = Depends(get_db)):
    return fetch_one_or_404(
        db,
        "SELECT id, api_id, round_id, type, scheduled_at, is_cancelled FROM bronze.session WHERE id = %(id)s",
        {"id": session_id},
        "Session",
    )


@router.get("/{session_id}/results", response_model=list[SessionResult])
def get_session_results(session_id: int, db: psycopg.Connection = Depends(get_db)):
    """Full classification for one session."""
    fetch_one_or_404(db, "SELECT id FROM bronze.session WHERE id = %(id)s", {"id": session_id}, "Session")
    with db.cursor() as cur:
        cur.execute(
            f"{RESULT_SELECT} WHERE sess.id = %(id)s ORDER BY se.position NULLS LAST",
            {"id": session_id},
        )
        return cur.fetchall()
