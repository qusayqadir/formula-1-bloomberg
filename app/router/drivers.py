from typing import Optional

import psycopg
from fastapi import APIRouter, Depends, Query

from core.database import get_db
from app.router.schemas import Driver, Page, TeamDriver
from app.router.utils import Pagination, fetch_one_or_404, paginate

router = APIRouter(prefix="/drivers", tags=["drivers"])

DRIVER_COLS = """
    id, api_id, reference, forename, surname, abbreviation,
    permanent_car_number, date_of_birth, nationality, country_code, wikipedia
"""


@router.get("", response_model=Page[Driver])
def list_drivers(
    search: Optional[str] = Query(None, description="Match forename, surname or abbreviation"),
    nationality: Optional[str] = Query(None),
    year: Optional[int] = Query(None, description="Only drivers with a seat that season"),
    page: Pagination = Depends(),
    db: psycopg.Connection = Depends(get_db),
):
    where, params = [], {}
    if search:
        where.append("(forename ILIKE %(search)s OR surname ILIKE %(search)s OR abbreviation ILIKE %(search)s)")
        params["search"] = f"%{search}%"
    if nationality:
        where.append("nationality = %(nationality)s")
        params["nationality"] = nationality
    if year is not None:
        where.append("""id IN (
            SELECT td.driver_id FROM bronze.team_driver td
            JOIN bronze.season s ON s.id = td.season_id
            WHERE s.year = %(year)s
        )""")
        params["year"] = year
    return paginate(
        db,
        f"SELECT {DRIVER_COLS} FROM bronze.drivers",
        "SELECT count(*) FROM bronze.drivers",
        where, params, "surname, forename", page,
    )


@router.get("/{driver_id}", response_model=Driver)
def get_driver(driver_id: int, db: psycopg.Connection = Depends(get_db)):
    return fetch_one_or_404(
        db,
        f"SELECT {DRIVER_COLS} FROM bronze.drivers WHERE id = %(id)s",
        {"id": driver_id},
        "Driver",
    )


@router.get("/{driver_id}/seasons", response_model=list[TeamDriver])
def get_driver_seasons(driver_id: int, db: psycopg.Connection = Depends(get_db)):
    """Every seat the driver held, per season."""
    fetch_one_or_404(db, "SELECT id FROM bronze.drivers WHERE id = %(id)s", {"id": driver_id}, "Driver")
    with db.cursor() as cur:
        cur.execute("""
            SELECT td.id, td.api_id, td.season_id, s.year,
                   td.team_id, t.name AS team_name,
                   td.driver_id, d.forename AS driver_forename, d.surname AS driver_surname
            FROM bronze.team_driver td
            JOIN bronze.season s ON s.id = td.season_id
            JOIN bronze.team t ON t.id = td.team_id
            JOIN bronze.drivers d ON d.id = td.driver_id
            WHERE td.driver_id = %(id)s
            ORDER BY s.year
        """, {"id": driver_id})
        return cur.fetchall()
