"""Filter metadata so the dashboard can build its dropdowns from real data."""
import psycopg
from fastapi import APIRouter, Depends

from core.database import get_db
from app.router.schemas import FilterOptions, SessionType

router = APIRouter(prefix="/meta", tags=["meta"])


@router.get("/filters", response_model=FilterOptions)
def filter_options(db: psycopg.Connection = Depends(get_db)):
    with db.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT s.year FROM bronze.season s
            JOIN bronze.round r ON r.season_id = s.id
            ORDER BY s.year
        """)
        years = [r["year"] for r in cur.fetchall()]
        cur.execute("SELECT DISTINCT nationality FROM bronze.drivers WHERE nationality IS NOT NULL ORDER BY 1")
        driver_nats = [r["nationality"] for r in cur.fetchall()]
        cur.execute("SELECT DISTINCT nationality FROM bronze.team WHERE nationality IS NOT NULL ORDER BY 1")
        team_nats = [r["nationality"] for r in cur.fetchall()]
        cur.execute("SELECT DISTINCT country FROM bronze.circuits WHERE country IS NOT NULL ORDER BY 1")
        countries = [r["country"] for r in cur.fetchall()]
    return FilterOptions(
        years=years,
        session_types=[t.value for t in SessionType],
        driver_nationalities=driver_nats,
        team_nationalities=team_nats,
        circuit_countries=countries,
    )
