"""Championship progression datasets (drivers + constructors).

One request returns per-round snapshots for a whole season as series, with
derived points_gained and gap_to_leader. Powers: points progression line
chart, position bump chart, position/points heatmaps, wins progression,
gap-to-leader chart, standings tables.
"""
from typing import Optional

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query

from core.database import get_db
from app.router.analytics.schemas import (
    DriverChampionshipProgression,
    TeamChampionshipProgression,
)

router = APIRouter(prefix="/championships", tags=["analytics"])

# points_gained and gap_to_leader are computed over the FULL season snapshot
# set (inner CTE) so filtering to a few drivers/rounds does not distort them.
PROGRESSION_SQL = """
    WITH snap AS (
        SELECT ch.{entity_id} AS entity_id, ch.round_id, ch.round_number,
               ch.position, ch.points, ch.win_count, ch.highest_finish, ch.is_eligible,
               ch.points - coalesce(
                   lag(ch.points) OVER (PARTITION BY ch.{entity_id} ORDER BY ch.round_number), 0
               ) AS points_gained,
               max(ch.points) OVER (PARTITION BY ch.round_number) - ch.points AS gap_to_leader
        FROM bronze.{table} ch
        WHERE ch.year = %(year)s
          AND (%(eligible_only)s = false OR ch.is_eligible IS NOT false)
    )
    SELECT snap.*, r.name AS round_name, {entity_cols}
    FROM snap
    JOIN {entity_table} e ON e.id = snap.entity_id
    LEFT JOIN bronze.round r ON r.id = snap.round_id
    WHERE (%(entity_ids)s::int[] IS NULL OR snap.entity_id = ANY(%(entity_ids)s))
      AND (%(round_from)s::int IS NULL OR snap.round_number >= %(round_from)s)
      AND (%(round_to)s::int IS NULL OR snap.round_number <= %(round_to)s)
    ORDER BY snap.entity_id, snap.round_number
"""

POINT_KEYS = (
    "round_id", "round_number", "round_name", "position", "points",
    "win_count", "highest_finish", "is_eligible", "points_gained", "gap_to_leader",
)


def _progression(db, table, entity_id, entity_table, entity_cols, entity_keys, params):
    sql = PROGRESSION_SQL.format(
        table=table, entity_id=entity_id, entity_table=entity_table, entity_cols=entity_cols
    )
    with db.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    if not rows and params["entity_ids"] is None and params["round_from"] is None:
        raise HTTPException(404, f"No championship data for year {params['year']}")
    series, by_entity = [], {}
    for row in rows:
        s = by_entity.get(row["entity_id"])
        if s is None:
            s = {"entity": {("id" if k == "entity_id" else k): row[k] for k in entity_keys},
                 "values": []}
            by_entity[row["entity_id"]] = s
            series.append(s)
        s["values"].append({k: row[k] for k in POINT_KEYS})
    return series


@router.get("/drivers/progression", response_model=DriverChampionshipProgression)
def driver_championship_progression(
    year: int = Query(..., description="Season year"),
    round_from: Optional[int] = Query(None, ge=1),
    round_to: Optional[int] = Query(None, ge=1),
    driver_ids: Optional[list[int]] = Query(None),
    eligible_only: bool = Query(False),
    db: psycopg.Connection = Depends(get_db),
):
    params = {
        "year": year, "round_from": round_from, "round_to": round_to,
        "entity_ids": driver_ids, "eligible_only": eligible_only,
    }
    series = _progression(
        db, "driver_championship", "driver_id", "bronze.drivers",
        "e.forename, e.surname, e.abbreviation",
        ("entity_id", "forename", "surname", "abbreviation"), params,
    )
    return {
        "metadata": {"year": year, "round_from": round_from, "round_to": round_to,
                     "driver_ids": driver_ids, "eligible_only": eligible_only},
        "series": series,
    }


@router.get("/teams/progression", response_model=TeamChampionshipProgression)
def team_championship_progression(
    year: int = Query(..., description="Season year"),
    round_from: Optional[int] = Query(None, ge=1),
    round_to: Optional[int] = Query(None, ge=1),
    team_ids: Optional[list[int]] = Query(None),
    eligible_only: bool = Query(False),
    db: psycopg.Connection = Depends(get_db),
):
    params = {
        "year": year, "round_from": round_from, "round_to": round_to,
        "entity_ids": team_ids, "eligible_only": eligible_only,
    }
    series = _progression(
        db, "team_championship", "team_id", "bronze.team",
        "e.name, e.primary_color",
        ("entity_id", "name", "primary_color"), params,
    )
    return {
        "metadata": {"year": year, "round_from": round_from, "round_to": round_to,
                     "team_ids": team_ids, "eligible_only": eligible_only},
        "series": series,
    }
