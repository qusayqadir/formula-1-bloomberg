from typing import Optional

import psycopg
from fastapi import APIRouter, Depends, Query

from core.database import get_db
from app.router.schemas import Page, Round, RoundEntry, Session
from app.router.utils import Pagination, fetch_one_or_404, paginate

router = APIRouter(prefix="/rounds", tags=["rounds"])

ROUND_SELECT = """
    SELECT r.id, r.api_id, r.season_id, s.year, r.circuit_id,
           c.name AS circuit_name, r.number, r.name, r.date, r.is_cancelled
    FROM bronze.round r
    JOIN bronze.season s ON s.id = r.season_id
    JOIN bronze.circuits c ON c.id = r.circuit_id
"""
ROUND_COUNT = """
    SELECT count(*) FROM bronze.round r
    JOIN bronze.season s ON s.id = r.season_id
    JOIN bronze.circuits c ON c.id = r.circuit_id
"""


@router.get("", response_model=Page[Round])
def list_rounds(
    year: Optional[int] = Query(None),
    circuit_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, description="Match round (grand prix) name"),
    page: Pagination = Depends(),
    db: psycopg.Connection = Depends(get_db),
):
    where, params = [], {}
    if year is not None:
        where.append("s.year = %(year)s")
        params["year"] = year
    if circuit_id is not None:
        where.append("r.circuit_id = %(circuit_id)s")
        params["circuit_id"] = circuit_id
    if search:
        where.append("r.name ILIKE %(search)s")
        params["search"] = f"%{search}%"
    return paginate(db, ROUND_SELECT, ROUND_COUNT, where, params, "s.year, r.number", page)


@router.get("/{round_id}", response_model=Round)
def get_round(round_id: int, db: psycopg.Connection = Depends(get_db)):
    return fetch_one_or_404(
        db, f"{ROUND_SELECT} WHERE r.id = %(id)s", {"id": round_id}, "Round"
    )


@router.get("/{round_id}/sessions", response_model=list[Session])
def get_round_sessions(round_id: int, db: psycopg.Connection = Depends(get_db)):
    fetch_one_or_404(db, "SELECT id FROM bronze.round WHERE id = %(id)s", {"id": round_id}, "Round")
    with db.cursor() as cur:
        cur.execute("""
            SELECT id, api_id, round_id, type, scheduled_at, is_cancelled
            FROM bronze.session
            WHERE round_id = %(id)s
            ORDER BY scheduled_at NULLS LAST, id
        """, {"id": round_id})
        return cur.fetchall()


@router.get("/{round_id}/entries", response_model=list[RoundEntry])
def get_round_entries(round_id: int, db: psycopg.Connection = Depends(get_db)):
    """The grid: every car/driver/team entered in this round."""
    fetch_one_or_404(db, "SELECT id FROM bronze.round WHERE id = %(id)s", {"id": round_id}, "Round")
    with db.cursor() as cur:
        cur.execute("""
            SELECT re.id, re.api_id, re.round_id, re.car_number,
                   d.id AS driver_id, d.forename AS driver_forename, d.surname AS driver_surname,
                   t.id AS team_id, t.name AS team_name
            FROM bronze.round_entry re
            JOIN bronze.team_driver td ON td.id = re.team_driver_id
            JOIN bronze.drivers d ON d.id = td.driver_id
            JOIN bronze.team t ON t.id = td.team_id
            WHERE re.round_id = %(id)s
            ORDER BY re.car_number NULLS LAST
        """, {"id": round_id})
        return cur.fetchall()
