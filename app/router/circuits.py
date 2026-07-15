from typing import Optional

import psycopg
from fastapi import APIRouter, Depends, Query

from core.database import get_db
from app.router.schemas import Circuit, Page, Round
from app.router.utils import Pagination, fetch_one_or_404, paginate

router = APIRouter(prefix="/circuits", tags=["circuits"])

CIRCUIT_COLS = """
    id, api_id, reference, name, locality, country, country_code,
    latitude, longitude, altitude, wikipedia
"""


@router.get("", response_model=Page[Circuit])
def list_circuits(
    search: Optional[str] = Query(None, description="Match circuit name or locality"),
    country: Optional[str] = Query(None),
    page: Pagination = Depends(),
    db: psycopg.Connection = Depends(get_db),
):
    where, params = [], {}
    if search:
        where.append("(name ILIKE %(search)s OR locality ILIKE %(search)s)")
        params["search"] = f"%{search}%"
    if country:
        where.append("country = %(country)s")
        params["country"] = country
    return paginate(
        db,
        f"SELECT {CIRCUIT_COLS} FROM bronze.circuits",
        "SELECT count(*) FROM bronze.circuits",
        where, params, "name", page,
    )


@router.get("/{circuit_id}", response_model=Circuit)
def get_circuit(circuit_id: int, db: psycopg.Connection = Depends(get_db)):
    return fetch_one_or_404(
        db,
        f"SELECT {CIRCUIT_COLS} FROM bronze.circuits WHERE id = %(id)s",
        {"id": circuit_id},
        "Circuit",
    )


@router.get("/{circuit_id}/rounds", response_model=list[Round])
def get_circuit_rounds(circuit_id: int, db: psycopg.Connection = Depends(get_db)):
    """Every round ever held at this circuit."""
    fetch_one_or_404(db, "SELECT id FROM bronze.circuits WHERE id = %(id)s", {"id": circuit_id}, "Circuit")
    with db.cursor() as cur:
        cur.execute("""
            SELECT r.id, r.api_id, r.season_id, s.year, r.circuit_id,
                   c.name AS circuit_name, r.number, r.name, r.date, r.is_cancelled
            FROM bronze.round r
            JOIN bronze.season s ON s.id = r.season_id
            JOIN bronze.circuits c ON c.id = r.circuit_id
            WHERE r.circuit_id = %(id)s
            ORDER BY s.year, r.number
        """, {"id": circuit_id})
        return cur.fetchall()
