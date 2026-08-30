"""Pit-stop and lap-position analytics for a single round.

Ingest currently only covers the 2025 season and Race sessions (bronze.laps
/ bronze.pit_stops have no quali/practice rows) — see CLAUDE.md bronze gaps.
Endpoints don't hardcode the year so they pick up future seasons once
ingested, but callers should expect empty results outside 2025 today.

Datasets:
- /analytics/pitstops/stops → one row per individual stop (pit-lane
  duration, i.e. entry-to-exit time; which lap it happened on)
- /analytics/pitstops/laps  → one row per driver per lap (running position),
  the substrate for lap-by-lap position charts and stint-length derivation
"""
from typing import Optional

import psycopg
from fastapi import APIRouter, Depends, Query

from core.database import get_db
from app.router.analytics.schemas import LapPositionsResponse, PitStopStopsResponse

router = APIRouter(prefix="/pitstops", tags=["analytics"])

# Team resolved per round via LATERAL (not a plain driver+season join on
# team_driver): a driver can hold two seats in one season (e.g. a mid-season
# swap), so team_driver.driver_id+season_id isn't unique — joining on it
# directly would duplicate every row across both teams. Shared alias names
# (sess/r/s/d/t) let both join trees below use the same filter builder.
TEAM_JOIN = """
    LEFT JOIN LATERAL (
        SELECT td2.id AS team_driver_id
        FROM bronze.round_entry re
        JOIN bronze.team_driver td2 ON td2.id = re.team_driver_id
        WHERE re.round_id = r.id AND td2.driver_id = d.id
        LIMIT 1
    ) re ON true
    LEFT JOIN bronze.team_driver td ON td.id = re.team_driver_id
    LEFT JOIN bronze.team t ON t.id = td.team_id
"""

PIT_JOIN = f"""
    FROM bronze.pit_stops ps
    JOIN bronze.laps lp ON lp.id = ps.lap_id
    JOIN bronze.session sess ON sess.id = ps.session_id
    JOIN bronze.round r ON r.id = sess.round_id
    JOIN bronze.season s ON s.id = r.season_id
    JOIN bronze.drivers d ON d.api_id = ps.driver
    {TEAM_JOIN}
"""

LAPS_JOIN = f"""
    FROM bronze.laps lp
    JOIN bronze.session sess ON sess.id = lp.session_id
    JOIN bronze.round r ON r.id = sess.round_id
    JOIN bronze.season s ON s.id = r.season_id
    JOIN bronze.drivers d ON d.api_id = lp.driver
    {TEAM_JOIN}
"""


def pitstop_filters(
    year: Optional[int] = Query(None),
    round_number: Optional[int] = Query(None, ge=1),
    round_id: Optional[int] = Query(None),
    driver_id: Optional[int] = Query(None),
    team_id: Optional[int] = Query(None),
) -> tuple[list[str], dict]:
    """Shared WHERE-clause builder for the join trees above."""
    where, params = ["sess.type = 'Race'"], {}
    simple = {
        "year": ("s.year = %(year)s", year),
        "round_number": ("r.number = %(round_number)s", round_number),
        "round_id": ("r.id = %(round_id)s", round_id),
        "driver_id": ("d.id = %(driver_id)s", driver_id),
        "team_id": ("t.id = %(team_id)s", team_id),
    }
    for key, (clause, value) in simple.items():
        if value is not None:
            where.append(clause)
            params[key] = value
    return where, params


def _driver_ref(row):
    return {"id": row["driver_id"], "forename": row["forename"],
            "surname": row["surname"], "abbreviation": row["abbreviation"]}


def _team_ref(row):
    if row.get("team_id") is None:
        return None
    return {"id": row["team_id"], "name": row["team_name"],
            "primary_color": row["primary_color"]}


def _total_laps(db: psycopg.Connection, params: dict) -> Optional[int]:
    """Race length for the focused round, so stint charts know where the
    final stint ends. None when the filter set doesn't pin a single round.
    Race-level (not per-driver), so only the round/season clauses apply —
    driver_id/team_id filters are irrelevant here."""
    if "round_number" not in params and "round_id" not in params:
        return None
    where = ["sess.type = 'Race'"]
    round_params = {}
    if "year" in params:
        where.append("s.year = %(year)s")
        round_params["year"] = params["year"]
    if "round_number" in params:
        where.append("r.number = %(round_number)s")
        round_params["round_number"] = params["round_number"]
    if "round_id" in params:
        where.append("r.id = %(round_id)s")
        round_params["round_id"] = params["round_id"]
    sql = f"""
        SELECT max(lp.lap_number) AS total_laps
        FROM bronze.laps lp
        JOIN bronze.session sess ON sess.id = lp.session_id
        JOIN bronze.round r ON r.id = sess.round_id
        JOIN bronze.season s ON s.id = r.season_id
        WHERE {' AND '.join(where)}
    """
    with db.cursor() as cur:
        cur.execute(sql, round_params)
        row = cur.fetchone()
        return row["total_laps"] if row else None


@router.get("/stops", response_model=PitStopStopsResponse)
def pitstop_stops(
    filters: tuple = Depends(pitstop_filters),
    db: psycopg.Connection = Depends(get_db),
):
    """One row per individual stop — which lap it happened on, and the
    full pit-lane duration (entry to exit)."""
    where, params = filters
    where_sql = f"WHERE {' AND '.join(where)}"
    sql = f"""
        SELECT r.id AS round_id, s.year, r.number AS round_number, r.name AS round_name,
               d.id AS driver_id, d.forename, d.surname, d.abbreviation,
               t.id AS team_id, t.name AS team_name, t.primary_color,
               ps.pitstop_number, lp.lap_number, ps.duration_sec
        {PIT_JOIN}
        {where_sql}
        ORDER BY s.year, r.number, d.surname, ps.pitstop_number
    """
    with db.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return {
        "metadata": {"filters": params, "total_laps": _total_laps(db, params)},
        "rows": [
            {"round_id": r["round_id"], "year": r["year"], "round_number": r["round_number"],
             "round_name": r["round_name"], "driver": _driver_ref(r), "team": _team_ref(r),
             "pitstop_number": r["pitstop_number"], "lap_number": r["lap_number"],
             "duration_sec": r["duration_sec"]}
            for r in rows
        ],
    }


@router.get("/laps", response_model=LapPositionsResponse)
def lap_positions(
    filters: tuple = Depends(pitstop_filters),
    db: psycopg.Connection = Depends(get_db),
):
    """One row per driver per lap — running position, for lap-by-lap
    position charts and (combined with /stops) stint-length derivation."""
    where, params = filters
    where_sql = f"WHERE {' AND '.join(where)}"
    sql = f"""
        SELECT r.id AS round_id, s.year, r.number AS round_number, r.name AS round_name,
               d.id AS driver_id, d.forename, d.surname, d.abbreviation,
               t.id AS team_id, t.name AS team_name, t.primary_color,
               lp.lap_number, lp.driver_position AS position, lp.lap_time_sec
        {LAPS_JOIN}
        {where_sql}
        ORDER BY lp.lap_number, d.surname
    """
    with db.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return {
        "metadata": {"filters": params, "total_laps": _total_laps(db, params)},
        "rows": [
            {"round_id": r["round_id"], "year": r["year"], "round_number": r["round_number"],
             "round_name": r["round_name"], "driver": _driver_ref(r), "team": _team_ref(r),
             "lap_number": r["lap_number"], "position": r["position"],
             "lap_time_sec": r["lap_time_sec"]}
            for r in rows
        ],
    }
