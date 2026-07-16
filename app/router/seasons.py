import psycopg
from fastapi import APIRouter, Depends, Query

from core.database import get_db
from app.router.schemas import Round, Season
from app.router.utils import fetch_one_or_404

router = APIRouter(prefix="/seasons", tags=["seasons"])

SEASON_SQL = """
    SELECT s.id, s.api_id, s.year, s.wikipedia,
           count(r.id) AS round_count
    FROM bronze.season s
    LEFT JOIN bronze.round r ON r.season_id = s.id
"""


@router.get("", response_model=list[Season])
def list_seasons(
    with_data_only: bool = Query(False, description="Only seasons that have ingested rounds"),
    db: psycopg.Connection = Depends(get_db),
):
    having = "HAVING count(r.id) > 0" if with_data_only else ""
    with db.cursor() as cur:
        cur.execute(f"{SEASON_SQL} GROUP BY s.id {having} ORDER BY s.year")
        return cur.fetchall()


@router.get("/{year}", response_model=Season)
def get_season(year: int, db: psycopg.Connection = Depends(get_db)):
    return fetch_one_or_404(
        db,
        f"{SEASON_SQL} WHERE s.year = %(year)s GROUP BY s.id",
        {"year": year},
        "Season",
    )


@router.get("/{year}/rounds", response_model=list[Round])
def get_season_rounds(year: int, db: psycopg.Connection = Depends(get_db)):
    fetch_one_or_404(db, "SELECT id FROM bronze.season WHERE year = %(year)s", {"year": year}, "Season")
    with db.cursor() as cur:
        cur.execute("""
            SELECT r.id, r.api_id, r.season_id, s.year, r.circuit_id,
                   c.name AS circuit_name, r.number, r.name, r.date, r.is_cancelled
            FROM bronze.round r
            JOIN bronze.season s ON s.id = r.season_id
            JOIN bronze.circuits c ON c.id = r.circuit_id
            WHERE s.year = %(year)s
            ORDER BY r.number
        """, {"year": year})
        return cur.fetchall()
