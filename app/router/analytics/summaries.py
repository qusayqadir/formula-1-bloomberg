"""Aggregated analytical datasets over session results.

All endpoints share one SQL aggregate fragment and the same filter set as
/results (year/round ranges, circuit, session type, drivers, teams), and
differ only in GROUP BY dimension. Aggregation happens in the database.

Datasets:
- /analytics/drivers/summary   → driver aggregates (career, per season, per circuit)
- /analytics/teams/summary     → team aggregates (+ per-driver contribution)
- /analytics/circuits/performance → circuit aggregates incl. geo/altitude fields
- /analytics/results/status-distribution → status/reliability counts
- /analytics/drivers/age-curve → performance aggregated by age-at-race (career-wide)
- /analytics/track-type/index → driver/team points-per-start at each track_type
  vs their own overall average (over/under-index)

Unless a session_type or session_id filter is given, aggregates default to
Race sessions so averages are not polluted by practice/qualifying rows.
"""
from typing import Optional

import psycopg
from fastapi import APIRouter, Depends, Query

from core.database import get_db
from app.router.results import RESULT_COUNT, result_filters
from app.router.analytics.schemas import (
    CircuitGroupBy,
    CircuitRacecraftResponse,
    CircuitSummaryResponse,
    DriverAgeCurveResponse,
    DriverGroupBy,
    GridFinishDensityResponse,
    StatusDistributionResponse,
    StatusGroupBy,
    SummaryResponse,
    TeamGroupBy,
    TeamSummaryResponse,
    TrackTypeGroupBy,
    TrackTypeIndexResponse,
)

router = APIRouter(tags=["analytics"])

# Same join tree as /results (RESULT_COUNT minus the count(*) select).
RESULT_JOIN = RESULT_COUNT.replace("SELECT count(*)", "", 1)

AGGREGATES = """
    count(*) AS starts,
    sum(se.points) AS total_points,
    avg(se.points) AS avg_points,
    count(*) FILTER (WHERE se.position = 1) AS wins,
    count(*) FILTER (WHERE se.position <= 3) AS podiums,
    avg(se.position) FILTER (WHERE se.is_classified) AS avg_finish,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY se.position)
        FILTER (WHERE se.is_classified AND se.position IS NOT NULL) AS median_finish,
    min(se.position) FILTER (WHERE se.is_classified) AS best_finish,
    max(se.position) FILTER (WHERE se.is_classified) AS worst_finish,
    stddev_samp(se.position) FILTER (WHERE se.is_classified) AS finish_stddev,
    avg(se.grid) FILTER (WHERE se.grid > 0) AS avg_grid,
    min(se.grid) FILTER (WHERE se.grid > 0) AS best_grid,
    avg(se.grid - se.position)
        FILTER (WHERE se.grid > 0 AND se.position IS NOT NULL) AS avg_positions_gained,
    avg(se.fastest_lap_rank) AS avg_fastest_lap_rank,
    sum(se.laps_completed) AS total_laps_completed,
    avg(se.laps_completed) AS avg_laps_completed,
    avg(CASE WHEN se.is_classified THEN 1.0 ELSE 0.0 END) AS classification_rate
"""

AGG_KEYS = (
    "starts", "total_points", "avg_points", "wins", "podiums", "avg_finish",
    "median_finish", "best_finish", "worst_finish", "finish_stddev", "avg_grid",
    "best_grid", "avg_positions_gained", "avg_fastest_lap_rank",
    "total_laps_completed", "avg_laps_completed", "classification_rate",
)

DRIVER_COLS = "d.id AS driver_id, d.forename, d.surname, d.abbreviation"
TEAM_COLS = "t.id AS team_id, t.name AS team_name, t.primary_color"
CIRCUIT_COLS = "c.id AS circuit_id, c.name AS circuit_name"
CIRCUIT_GEO_COLS = (
    "c.id AS circuit_id, c.name AS circuit_name, c.country, c.country_code,"
    " c.locality, c.latitude, c.longitude, c.altitude"
)


def _default_race(where: list[str], params: dict) -> str:
    """Aggregate over Race sessions unless a session filter was given."""
    if "session_type" not in params and "session_id" not in params:
        where.append("sess.type = 'Race'")
        return "Race"
    return params.get("session_type", "*")


def _run(db, select_cols, group_cols, where, params, order_by):
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    sql = (
        f"SELECT {select_cols}, {AGGREGATES} {RESULT_JOIN} {where_sql} "
        f"GROUP BY {group_cols} ORDER BY {order_by}"
    )
    with db.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def _driver_ref(row):
    return {"id": row["driver_id"], "forename": row["forename"],
            "surname": row["surname"], "abbreviation": row["abbreviation"]}


def _team_ref(row):
    return {"id": row["team_id"], "name": row["team_name"],
            "primary_color": row["primary_color"]}


def _aggs(row):
    return {k: row[k] for k in AGG_KEYS}


@router.get("/drivers/summary", response_model=SummaryResponse)
def driver_summary(
    group_by: DriverGroupBy = Query(DriverGroupBy.DRIVER),
    filters: tuple = Depends(result_filters),
    db: psycopg.Connection = Depends(get_db),
):
    where, params = filters
    session_type = _default_race(where, params)
    select_cols, group_cols = DRIVER_COLS, "d.id, d.forename, d.surname, d.abbreviation"
    if group_by is DriverGroupBy.DRIVER_SEASON:
        select_cols += ", s.year"
        group_cols += ", s.year"
    elif group_by is DriverGroupBy.DRIVER_CIRCUIT:
        select_cols += f", {CIRCUIT_COLS}"
        group_cols += ", c.id, c.name"
    rows = _run(db, select_cols, group_cols, where, params,
                "total_points DESC NULLS LAST, starts DESC")
    return {
        "metadata": {"group_by": group_by.value, "session_type": session_type,
                     "filters": {k: v for k, v in params.items() if k != "session_type"}},
        "rows": [
            {"driver": _driver_ref(r), "year": r.get("year"),
             "circuit_id": r.get("circuit_id"), "circuit_name": r.get("circuit_name"),
             **_aggs(r)}
            for r in rows
        ],
    }


@router.get("/teams/summary", response_model=TeamSummaryResponse)
def team_summary(
    group_by: TeamGroupBy = Query(TeamGroupBy.TEAM),
    filters: tuple = Depends(result_filters),
    db: psycopg.Connection = Depends(get_db),
):
    where, params = filters
    session_type = _default_race(where, params)
    select_cols, group_cols = TEAM_COLS, "t.id, t.name, t.primary_color"
    if group_by is TeamGroupBy.TEAM_SEASON:
        select_cols += ", s.year"
        group_cols += ", s.year"
    elif group_by is TeamGroupBy.TEAM_CIRCUIT:
        select_cols += f", {CIRCUIT_COLS}"
        group_cols += ", c.id, c.name"
    elif group_by is TeamGroupBy.TEAM_DRIVER:
        # per-season driver contribution to the team's points
        select_cols += (
            f", {DRIVER_COLS}, s.year, "
            "sum(se.points) / nullif(sum(sum(se.points)) "
            "OVER (PARTITION BY t.id, s.year), 0) AS share_of_team_points"
        )
        group_cols += ", d.id, d.forename, d.surname, d.abbreviation, s.year"
    rows = _run(db, select_cols, group_cols, where, params,
                "total_points DESC NULLS LAST, starts DESC")
    return {
        "metadata": {"group_by": group_by.value, "session_type": session_type,
                     "filters": {k: v for k, v in params.items() if k != "session_type"}},
        "rows": [
            {"team": _team_ref(r), "year": r.get("year"),
             "circuit_id": r.get("circuit_id"), "circuit_name": r.get("circuit_name"),
             "driver": _driver_ref(r) if "driver_id" in r else None,
             "share_of_team_points": r.get("share_of_team_points"),
             **_aggs(r)}
            for r in rows
        ],
    }


@router.get("/circuits/performance", response_model=CircuitSummaryResponse)
def circuit_performance(
    group_by: CircuitGroupBy = Query(CircuitGroupBy.CIRCUIT),
    filters: tuple = Depends(result_filters),
    db: psycopg.Connection = Depends(get_db),
):
    where, params = filters
    session_type = _default_race(where, params)
    select_cols = f"{CIRCUIT_GEO_COLS}, count(DISTINCT r.id) AS events"
    group_cols = ("c.id, c.name, c.country, c.country_code, c.locality,"
                  " c.latitude, c.longitude, c.altitude")
    if group_by is CircuitGroupBy.CIRCUIT_DRIVER:
        select_cols += f", {DRIVER_COLS}"
        group_cols += ", d.id, d.forename, d.surname, d.abbreviation"
    elif group_by is CircuitGroupBy.CIRCUIT_TEAM:
        select_cols += f", {TEAM_COLS}"
        group_cols += ", t.id, t.name, t.primary_color"
    rows = _run(db, select_cols, group_cols, where, params,
                "circuit_name, total_points DESC NULLS LAST")
    return {
        "metadata": {"group_by": group_by.value, "session_type": session_type,
                     "filters": {k: v for k, v in params.items() if k != "session_type"}},
        "rows": [
            {**{k: r[k] for k in ("circuit_id", "circuit_name", "country", "country_code",
                                  "locality", "latitude", "longitude", "altitude", "events")},
             "driver": _driver_ref(r) if "driver_id" in r else None,
             "team": _team_ref(r) if "team_id" in r else None,
             **_aggs(r)}
            for r in rows
        ],
    }


# Classified-finish predicate from the status vocabulary: bronze
# is_classified is NULL on every row, so status text is the only signal.
FINISH_STATUS = ("(se.status IN ('Finished', 'Lapped') "
                 "OR se.status ~ '^\\+\\d+ Laps?$')")

RACECRAFT_COLS = f"""
    c.id AS circuit_id, c.name AS circuit_name, c.country_code,
    count(DISTINCT sess.id) AS races,
    count(*) FILTER (WHERE se.grid = 1) AS pole_starts,
    count(*) FILTER (WHERE se.grid = 1 AND se.position = 1) AS pole_wins,
    count(*) FILTER (WHERE se.grid BETWEEN 1 AND 2 AND se.position = 1) AS front_row_wins,
    avg(se.grid) FILTER (WHERE se.position = 1 AND se.grid > 0) AS winner_avg_grid,
    avg(abs(se.position - se.grid)) FILTER (
        WHERE se.grid > 0 AND se.position IS NOT NULL AND {FINISH_STATUS}
    ) AS avg_abs_position_change
"""


@router.get("/circuits/racecraft", response_model=CircuitRacecraftResponse)
def circuit_racecraft(
    filters: tuple = Depends(result_filters),
    db: psycopg.Connection = Depends(get_db),
):
    """Pole conversion + processionality per circuit: how often pole converts
    to the win, where winners start, and how much the order shuffles between
    grid and flag (position change measured over classified finishers)."""
    where, params = filters
    session_type = _default_race(where, params)
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    sql = (
        f"SELECT {RACECRAFT_COLS} {RESULT_JOIN} {where_sql} "
        "GROUP BY c.id, c.name, c.country_code "
        "ORDER BY races DESC, circuit_name"
    )
    with db.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return {
        "metadata": {"session_type": session_type,
                     "filters": {k: v for k, v in params.items() if k != "session_type"}},
        "rows": [
            {**r,
             "pole_win_rate": r["pole_wins"] / r["pole_starts"] if r["pole_starts"] else None,
             "front_row_win_rate": r["front_row_wins"] / r["races"] if r["races"] else None}
            for r in rows
        ],
    }


@router.get("/results/grid-finish-density", response_model=GridFinishDensityResponse)
def grid_finish_density(
    filters: tuple = Depends(result_filters),
    db: psycopg.Connection = Depends(get_db),
):
    """Start→finish field density: entry counts per (grid, position) cell over
    classified finishers, pre-aggregated for the hex-binned frontend view."""
    where, params = filters
    session_type = _default_race(where, params)
    where.append("se.grid > 0")
    where.append("se.position IS NOT NULL")
    where.append(FINISH_STATUS)
    sql = (
        f"SELECT se.grid, se.position, count(*) AS count {RESULT_JOIN} "
        f"WHERE {' AND '.join(where)} "
        "GROUP BY se.grid, se.position ORDER BY se.grid, se.position"
    )
    with db.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return {
        "metadata": {"session_type": session_type,
                     "filters": {k: v for k, v in params.items() if k != "session_type"}},
        "rows": rows,
    }


@router.get("/results/status-distribution", response_model=StatusDistributionResponse)
def status_distribution(
    group_by: StatusGroupBy = Query(StatusGroupBy.NONE),
    filters: tuple = Depends(result_filters),
    db: psycopg.Connection = Depends(get_db),
):
    """Reliability view: counts of result status values."""
    where, params = filters
    session_type = _default_race(where, params)
    select_cols = "se.status, se.is_classified, count(*) AS count"
    group_cols = "se.status, se.is_classified"
    if group_by is StatusGroupBy.DRIVER:
        select_cols += f", {DRIVER_COLS}"
        group_cols += ", d.id, d.forename, d.surname, d.abbreviation"
    elif group_by is StatusGroupBy.TEAM:
        select_cols += f", {TEAM_COLS}"
        group_cols += ", t.id, t.name, t.primary_color"
    elif group_by is StatusGroupBy.SEASON:
        select_cols += ", s.year"
        group_cols += ", s.year"
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    sql = (
        f"SELECT {select_cols} {RESULT_JOIN} {where_sql} "
        f"GROUP BY {group_cols} ORDER BY count DESC"
    )
    with db.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return {
        "metadata": {"group_by": group_by.value, "session_type": session_type,
                     "filters": {k: v for k, v in params.items() if k != "session_type"}},
        "rows": [
            {"status": r["status"], "is_classified": r["is_classified"], "count": r["count"],
             "driver": _driver_ref(r) if "driver_id" in r else None,
             "team": _team_ref(r) if "team_id" in r else None,
             "year": r.get("year")}
            for r in rows
        ],
    }


# ── driver age/experience curve ─────────────────────────────────────────────

@router.get("/drivers/age-curve", response_model=DriverAgeCurveResponse)
def driver_age_curve(
    driver_id: Optional[int] = Query(None),
    driver_ids: Optional[list[int]] = Query(None),
    db: psycopg.Connection = Depends(get_db),
):
    """Career-wide performance by age-at-race — how a driver's points/finish
    trend as they age. Independent of the season filter (spans 2011–2025)."""
    where = ["sess.type = 'Race'", "d.date_of_birth IS NOT NULL", "r.date IS NOT NULL"]
    params: dict = {}
    if driver_id is not None:
        where.append("d.id = %(driver_id)s")
        params["driver_id"] = driver_id
    if driver_ids:
        where.append("d.id = ANY(%(driver_ids)s)")
        params["driver_ids"] = driver_ids
    sql = f"""
        SELECT {DRIVER_COLS},
               floor(extract(year from age(r.date, d.date_of_birth)))::int AS age,
               count(*) AS starts,
               avg(se.points) AS avg_points,
               sum(se.points) AS total_points,
               avg(se.position) FILTER (WHERE se.position IS NOT NULL) AS avg_finish
        {RESULT_JOIN}
        WHERE {' AND '.join(where)}
        GROUP BY d.id, d.forename, d.surname, d.abbreviation, age
        ORDER BY d.id, age
    """
    with db.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    return {
        "metadata": {"driver_id": driver_id, "driver_ids": driver_ids},
        "rows": [
            {"driver": _driver_ref(r), "age": r["age"], "starts": r["starts"],
             "avg_points": r["avg_points"], "avg_finish": r["avg_finish"],
             "total_points": r["total_points"] or 0}
            for r in rows
        ],
    }


# ── track-type performance index (driver/team over/under-index) ───────────

TRACK_TYPE_ENTITY = {
    TrackTypeGroupBy.DRIVER: {
        "cols": DRIVER_COLS,
        "group": "d.id, d.forename, d.surname, d.abbreviation",
        "names": ["driver_id", "forename", "surname", "abbreviation"],
    },
    TrackTypeGroupBy.TEAM: {
        "cols": TEAM_COLS,
        "group": "t.id, t.name, t.primary_color",
        "names": ["team_id", "team_name", "primary_color"],
    },
}


@router.get("/track-type/index", response_model=TrackTypeIndexResponse)
def track_type_index(
    group_by: TrackTypeGroupBy = Query(TrackTypeGroupBy.DRIVER),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
    min_starts: int = Query(3, ge=1, description="Minimum starts at a track_type to include the cell"),
    db: psycopg.Connection = Depends(get_db),
):
    """Points-per-start at each track_type vs the entity's own overall
    average — positive index = over-indexes on that archetype."""
    entity = TRACK_TYPE_ENTITY[group_by]
    names_csv = ", ".join(entity["names"])
    id_col = entity["names"][0]
    where = [
        "sess.type = 'Race'",
        "c.track_type IS NOT NULL",
    ]
    params: dict = {}
    if year_from is not None:
        where.append("s.year >= %(year_from)s")
        params["year_from"] = year_from
    if year_to is not None:
        where.append("s.year <= %(year_to)s")
        params["year_to"] = year_to
    sql = f"""
        WITH per_type AS (
            SELECT {entity["cols"]}, c.track_type,
                   count(*) AS starts, avg(se.points) AS avg_points
            {RESULT_JOIN}
            WHERE {' AND '.join(where)}
            GROUP BY {entity["group"]}, c.track_type
        ),
        overall AS (
            SELECT {id_col},
                   sum(avg_points * starts) / nullif(sum(starts), 0) AS avg_points_overall,
                   sum(starts) AS total_starts
            FROM per_type
            GROUP BY {id_col}
        )
        SELECT pt.*, o.avg_points_overall, o.total_starts
        FROM per_type pt
        JOIN overall o USING ({id_col})
        WHERE pt.starts >= %(min_starts)s
        ORDER BY {id_col}, pt.track_type
    """
    params["min_starts"] = min_starts
    with db.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    ref = _driver_ref if group_by is TrackTypeGroupBy.DRIVER else _team_ref
    key = "driver" if group_by is TrackTypeGroupBy.DRIVER else "team"
    return {
        "metadata": {"group_by": group_by.value, "year_from": year_from, "year_to": year_to,
                     "min_starts": min_starts},
        "rows": [
            {key: ref(r), "track_type": r["track_type"], "starts": r["starts"],
             "avg_points": r["avg_points"], "avg_points_overall": r["avg_points_overall"],
             "index": r["avg_points"] - r["avg_points_overall"]}
            for r in rows
        ],
    }

