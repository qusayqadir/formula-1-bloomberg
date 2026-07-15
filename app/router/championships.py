"""Driver and constructor championship standings.

Standings are stored per (year, round_number); by default the latest
available round of the requested year is returned.
"""
from typing import Optional

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query

from core.database import get_db
from app.router.schemas import ConstructorStanding, DriverStanding

router = APIRouter(prefix="/championships", tags=["championships"])


def _resolve_round(db: psycopg.Connection, table: str, year: int, round_number: Optional[int]) -> int:
    with db.cursor() as cur:
        if round_number is None:
            cur.execute(
                f"SELECT max(round_number) AS rn FROM bronze.{table} WHERE year = %(year)s",
                {"year": year},
            )
            row = cur.fetchone()
            if row["rn"] is None:
                raise HTTPException(404, f"No standings for year {year}")
            return row["rn"]
        cur.execute(
            f"SELECT 1 FROM bronze.{table} WHERE year = %(year)s AND round_number = %(rn)s LIMIT 1",
            {"year": year, "rn": round_number},
        )
        if cur.fetchone() is None:
            raise HTTPException(404, f"No standings for year {year} round {round_number}")
        return round_number


@router.get("/drivers", response_model=list[DriverStanding])
def driver_standings(
    year: int = Query(..., description="Season year"),
    round_number: Optional[int] = Query(None, ge=1, description="Defaults to latest round with standings"),
    db: psycopg.Connection = Depends(get_db),
):
    rn = _resolve_round(db, "driver_championship", year, round_number)
    with db.cursor() as cur:
        cur.execute("""
            SELECT dc.id, dc.api_id, dc.year, dc.round_number,
                   dc.driver_id, d.forename AS driver_forename, d.surname AS driver_surname,
                   dc.position, dc.points, dc.win_count, dc.highest_finish,
                   dc.is_eligible, dc.adjustment_type
            FROM bronze.driver_championship dc
            JOIN bronze.drivers d ON d.id = dc.driver_id
            WHERE dc.year = %(year)s AND dc.round_number = %(rn)s
            ORDER BY dc.position NULLS LAST
        """, {"year": year, "rn": rn})
        return cur.fetchall()


@router.get("/constructors", response_model=list[ConstructorStanding])
def constructor_standings(
    year: int = Query(..., description="Season year"),
    round_number: Optional[int] = Query(None, ge=1, description="Defaults to latest round with standings"),
    db: psycopg.Connection = Depends(get_db),
):
    rn = _resolve_round(db, "team_championship", year, round_number)
    with db.cursor() as cur:
        cur.execute("""
            SELECT tc.id, tc.api_id, tc.year, tc.round_number,
                   tc.team_id, t.name AS team_name,
                   tc.position, tc.points, tc.win_count, tc.highest_finish,
                   tc.is_eligible, tc.adjustment_type
            FROM bronze.team_championship tc
            JOIN bronze.team t ON t.id = tc.team_id
            WHERE tc.year = %(year)s AND tc.round_number = %(rn)s
            ORDER BY tc.position NULLS LAST
        """, {"year": year, "rn": rn})
        return cur.fetchall()


@router.get("/drivers/{driver_id}/history", response_model=list[DriverStanding])
def driver_championship_history(driver_id: int, db: psycopg.Connection = Depends(get_db)):
    """Final standing of one driver in every season (last round of each year)."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT dc.id, dc.api_id, dc.year, dc.round_number,
                   dc.driver_id, d.forename AS driver_forename, d.surname AS driver_surname,
                   dc.position, dc.points, dc.win_count, dc.highest_finish,
                   dc.is_eligible, dc.adjustment_type
            FROM bronze.driver_championship dc
            JOIN bronze.drivers d ON d.id = dc.driver_id
            WHERE dc.driver_id = %(id)s
              AND dc.round_number = (
                  SELECT max(round_number) FROM bronze.driver_championship
                  WHERE year = dc.year
              )
            ORDER BY dc.year
        """, {"id": driver_id})
        return cur.fetchall()


@router.get("/constructors/{team_id}/history", response_model=list[ConstructorStanding])
def constructor_championship_history(team_id: int, db: psycopg.Connection = Depends(get_db)):
    """Final standing of one team in every season (last round of each year)."""
    with db.cursor() as cur:
        cur.execute("""
            SELECT tc.id, tc.api_id, tc.year, tc.round_number,
                   tc.team_id, t.name AS team_name,
                   tc.position, tc.points, tc.win_count, tc.highest_finish,
                   tc.is_eligible, tc.adjustment_type
            FROM bronze.team_championship tc
            JOIN bronze.team t ON t.id = tc.team_id
            WHERE tc.team_id = %(id)s
              AND tc.round_number = (
                  SELECT max(round_number) FROM bronze.team_championship
                  WHERE year = tc.year
              )
            ORDER BY tc.year
        """, {"id": team_id})
        return cur.fetchall()
