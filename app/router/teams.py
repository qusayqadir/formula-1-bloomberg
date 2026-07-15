from typing import Optional

import psycopg
from fastapi import APIRouter, Depends, Query

from core.database import get_db
from app.router.schemas import Page, Team, TeamDriver
from app.router.utils import Pagination, fetch_one_or_404, paginate

router = APIRouter(prefix="/teams", tags=["teams"])

TEAM_COLS = "id, api_id, name, nationality, country_code, primary_color, wikipedia"


@router.get("", response_model=Page[Team])
def list_teams(
    search: Optional[str] = Query(None, description="Match team name"),
    nationality: Optional[str] = Query(None),
    year: Optional[int] = Query(None, description="Only teams that entered that season"),
    page: Pagination = Depends(),
    db: psycopg.Connection = Depends(get_db),
):
    where, params = [], {}
    if search:
        where.append("name ILIKE %(search)s")
        params["search"] = f"%{search}%"
    if nationality:
        where.append("nationality = %(nationality)s")
        params["nationality"] = nationality
    if year is not None:
        where.append("""id IN (
            SELECT td.team_id FROM bronze.team_driver td
            JOIN bronze.season s ON s.id = td.season_id
            WHERE s.year = %(year)s
        )""")
        params["year"] = year
    return paginate(
        db,
        f"SELECT {TEAM_COLS} FROM bronze.team",
        "SELECT count(*) FROM bronze.team",
        where, params, "name", page,
    )


@router.get("/{team_id}", response_model=Team)
def get_team(team_id: int, db: psycopg.Connection = Depends(get_db)):
    return fetch_one_or_404(
        db,
        f"SELECT {TEAM_COLS} FROM bronze.team WHERE id = %(id)s",
        {"id": team_id},
        "Team",
    )


@router.get("/{team_id}/drivers", response_model=list[TeamDriver])
def get_team_drivers(
    team_id: int,
    year: Optional[int] = Query(None),
    db: psycopg.Connection = Depends(get_db),
):
    """Driver line-ups for this team, optionally filtered by season."""
    fetch_one_or_404(db, "SELECT id FROM bronze.team WHERE id = %(id)s", {"id": team_id}, "Team")
    params = {"id": team_id, "year": year}
    with db.cursor() as cur:
        cur.execute("""
            SELECT td.id, td.api_id, td.season_id, s.year,
                   td.team_id, t.name AS team_name,
                   td.driver_id, d.forename AS driver_forename, d.surname AS driver_surname
            FROM bronze.team_driver td
            JOIN bronze.season s ON s.id = td.season_id
            JOIN bronze.team t ON t.id = td.team_id
            JOIN bronze.drivers d ON d.id = td.driver_id
            WHERE td.team_id = %(id)s
              AND (%(year)s::int IS NULL OR s.year = %(year)s)
            ORDER BY s.year, d.surname
        """, params)
        return cur.fetchall()
