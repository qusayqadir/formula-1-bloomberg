"""Driver head-to-head over shared sessions only.

A session counts only when BOTH drivers have a session_entry in it, and a
metric tally only counts sessions where both have a value for that metric.
Powers: head-to-head cards, qualifying/race duel charts, teammate
comparisons, per-session comparison tables.
"""
from typing import Optional

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query

from core.database import get_db
from app.router.schemas import SessionType
from app.router.analytics.schemas import DriverHeadToHead, TeamHeadToHead

router = APIRouter(prefix="/comparisons", tags=["analytics"])

# One row per shared session; each side resolves its own entry via the
# round_entry → team_driver chain for that driver.
H2H_SQL = """
    SELECT sess.id AS session_id, sess.type AS session_type,
           s.year, r.number AS round_number, r.name AS round_name,
           c.name AS circuit_name,
           a.position AS a_position, b.position AS b_position,
           a.grid AS a_grid, b.grid AS b_grid,
           a.points AS a_points, b.points AS b_points,
           a.fastest_lap_rank AS a_fastest_lap_rank, b.fastest_lap_rank AS b_fastest_lap_rank,
           a.fastest_lap_time AS a_fastest_lap_time, b.fastest_lap_time AS b_fastest_lap_time,
           a.is_classified AS a_is_classified, b.is_classified AS b_is_classified
    FROM bronze.session sess
    JOIN bronze.round r ON r.id = sess.round_id
    JOIN bronze.season s ON s.id = r.season_id
    JOIN bronze.circuits c ON c.id = r.circuit_id
    JOIN LATERAL (
        SELECT se.* FROM bronze.session_entry se
        JOIN bronze.round_entry re ON re.id = se.round_entry_id
        JOIN bronze.team_driver td ON td.id = re.team_driver_id
        WHERE se.session_id = sess.id AND td.driver_id = %(driver_a)s
        LIMIT 1
    ) a ON true
    JOIN LATERAL (
        SELECT se.* FROM bronze.session_entry se
        JOIN bronze.round_entry re ON re.id = se.round_entry_id
        JOIN bronze.team_driver td ON td.id = re.team_driver_id
        WHERE se.session_id = sess.id AND td.driver_id = %(driver_b)s
        LIMIT 1
    ) b ON true
    WHERE (%(year)s::int IS NULL OR s.year = %(year)s)
      AND (%(year_from)s::int IS NULL OR s.year >= %(year_from)s)
      AND (%(year_to)s::int IS NULL OR s.year <= %(year_to)s)
      AND (%(circuit_id)s::int IS NULL OR c.id = %(circuit_id)s)
      AND (%(session_type)s::text IS NULL OR sess.type = %(session_type)s)
      AND (NOT %(teammates_only)s OR EXISTS (
          SELECT 1
          FROM bronze.team_driver tda
          JOIN bronze.team_driver tdb
            ON tdb.team_id = tda.team_id AND tdb.season_id = tda.season_id
          WHERE tda.season_id = s.id
            AND tda.driver_id = %(driver_a)s AND tdb.driver_id = %(driver_b)s
      ))
    ORDER BY s.year, r.number, sess.scheduled_at NULLS LAST
"""


def _tally(rows, key):
    a = sum(1 for r in rows
            if r[f"a_{key}"] is not None and r[f"b_{key}"] is not None
            and r[f"a_{key}"] < r[f"b_{key}"])
    b = sum(1 for r in rows
            if r[f"a_{key}"] is not None and r[f"b_{key}"] is not None
            and r[f"b_{key}"] < r[f"a_{key}"])
    return {"a": a, "b": b}


def _avg(values):
    values = [v for v in values if v is not None]
    return sum(values) / len(values) if values else None


@router.get("/drivers", response_model=DriverHeadToHead)
def driver_head_to_head(
    driver_a: int = Query(..., description="First driver id"),
    driver_b: int = Query(..., description="Second driver id"),
    year: Optional[int] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
    circuit_id: Optional[int] = Query(None),
    session_type: SessionType = Query(SessionType.RACE),
    teammates_only: bool = Query(False, description="Only seasons where both drove for the same team"),
    db: psycopg.Connection = Depends(get_db),
):
    if driver_a == driver_b:
        raise HTTPException(422, "driver_a and driver_b must differ")
    drivers = {}
    with db.cursor() as cur:
        cur.execute(
            "SELECT id, forename, surname, abbreviation FROM bronze.drivers WHERE id = ANY(%(ids)s)",
            {"ids": [driver_a, driver_b]},
        )
        drivers = {r["id"]: r for r in cur.fetchall()}
        for did in (driver_a, driver_b):
            if did not in drivers:
                raise HTTPException(404, f"Driver {did} not found")
        cur.execute(H2H_SQL, {
            "driver_a": driver_a, "driver_b": driver_b,
            "year": year, "year_from": year_from, "year_to": year_to,
            "circuit_id": circuit_id, "session_type": session_type.value,
            "teammates_only": teammates_only,
        })
        rows = cur.fetchall()
    summary = {
        "shared_sessions": len(rows),
        "position": _tally(rows, "position"),
        "grid": _tally(rows, "grid"),
        "fastest_lap_rank": _tally(rows, "fastest_lap_rank"),
        "a_total_points": sum(r["a_points"] or 0 for r in rows),
        "b_total_points": sum(r["b_points"] or 0 for r in rows),
        "a_wins": sum(1 for r in rows if r["a_position"] == 1),
        "b_wins": sum(1 for r in rows if r["b_position"] == 1),
        "a_avg_finish": _avg([r["a_position"] for r in rows if r["a_is_classified"]]),
        "b_avg_finish": _avg([r["b_position"] for r in rows if r["b_is_classified"]]),
        "a_avg_grid": _avg([r["a_grid"] for r in rows if r["a_grid"] and r["a_grid"] > 0]),
        "b_avg_grid": _avg([r["b_grid"] for r in rows if r["b_grid"] and r["b_grid"] > 0]),
    }
    return {
        "metadata": {"year": year, "year_from": year_from, "year_to": year_to,
                     "circuit_id": circuit_id, "session_type": session_type.value,
                     "teammates_only": teammates_only},
        "driver_a": drivers[driver_a],
        "driver_b": drivers[driver_b],
        "summary": summary,
        "rows": rows,
    }


# One row per shared round; each side is the team's BETTER-placed car that
# round (both cars' points are summed — that's how the constructors'
# championship itself works). No "teammates_only" concept here, since two
# constructors never share a driver.
TEAM_H2H_SQL = """
    WITH per_round AS (
        SELECT sess.id AS session_id, sess.type AS session_type,
               s.year, r.number AS round_number, r.name AS round_name,
               c.name AS circuit_name, t.id AS team_id,
               sum(se.points) AS team_points,
               min(se.position) FILTER (WHERE se.position IS NOT NULL) AS best_position,
               min(se.grid) FILTER (WHERE se.grid > 0) AS best_grid
        FROM bronze.session_entry se
        JOIN bronze.round_entry re ON re.id = se.round_entry_id
        JOIN bronze.team_driver td ON td.id = re.team_driver_id
        JOIN bronze.team t ON t.id = td.team_id
        JOIN bronze.session sess ON sess.id = se.session_id
        JOIN bronze.round r ON r.id = sess.round_id
        JOIN bronze.season s ON s.id = r.season_id
        JOIN bronze.circuits c ON c.id = r.circuit_id
        WHERE t.id IN (%(team_a)s, %(team_b)s)
          AND (%(year)s::int IS NULL OR s.year = %(year)s)
          AND (%(year_from)s::int IS NULL OR s.year >= %(year_from)s)
          AND (%(year_to)s::int IS NULL OR s.year <= %(year_to)s)
          AND (%(circuit_id)s::int IS NULL OR c.id = %(circuit_id)s)
          AND (%(session_type)s::text IS NULL OR sess.type = %(session_type)s)
        GROUP BY sess.id, sess.type, s.year, r.number, r.name, c.name, t.id
    )
    SELECT a.session_id, a.session_type, a.year, a.round_number, a.round_name, a.circuit_name,
           a.team_points AS a_points, b.team_points AS b_points,
           a.best_position AS a_position, b.best_position AS b_position,
           a.best_grid AS a_grid, b.best_grid AS b_grid
    FROM per_round a
    JOIN per_round b ON b.session_id = a.session_id AND b.team_id = %(team_b)s
    WHERE a.team_id = %(team_a)s
    ORDER BY a.year, a.round_number
"""


@router.get("/teams", response_model=TeamHeadToHead)
def team_head_to_head(
    team_a: int = Query(..., description="First team id"),
    team_b: int = Query(..., description="Second team id"),
    year: Optional[int] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
    circuit_id: Optional[int] = Query(None),
    session_type: SessionType = Query(SessionType.RACE),
    db: psycopg.Connection = Depends(get_db),
):
    if team_a == team_b:
        raise HTTPException(422, "team_a and team_b must differ")
    with db.cursor() as cur:
        cur.execute(
            "SELECT id, name, primary_color FROM bronze.team WHERE id = ANY(%(ids)s)",
            {"ids": [team_a, team_b]},
        )
        teams = {r["id"]: r for r in cur.fetchall()}
        for tid in (team_a, team_b):
            if tid not in teams:
                raise HTTPException(404, f"Team {tid} not found")
        cur.execute(TEAM_H2H_SQL, {
            "team_a": team_a, "team_b": team_b,
            "year": year, "year_from": year_from, "year_to": year_to,
            "circuit_id": circuit_id, "session_type": session_type.value,
        })
        rows = cur.fetchall()
    summary = {
        "shared_sessions": len(rows),
        "position": _tally(rows, "position"),
        "grid": _tally(rows, "grid"),
        "a_total_points": sum(r["a_points"] or 0 for r in rows),
        "b_total_points": sum(r["b_points"] or 0 for r in rows),
        "a_wins": sum(1 for r in rows if r["a_position"] == 1),
        "b_wins": sum(1 for r in rows if r["b_position"] == 1),
        "a_avg_finish": _avg([r["a_position"] for r in rows]),
        "b_avg_finish": _avg([r["b_position"] for r in rows]),
        "a_avg_grid": _avg([r["a_grid"] for r in rows]),
        "b_avg_grid": _avg([r["b_grid"] for r in rows]),
    }
    return {
        "metadata": {"year": year, "year_from": year_from, "year_to": year_to,
                     "circuit_id": circuit_id, "session_type": session_type.value},
        "team_a": teams[team_a],
        "team_b": teams[team_b],
        "summary": summary,
        "rows": rows,
    }
