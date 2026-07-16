"""Session results — the main reusable analytical dataset for the dashboard.

One row per session entry, enriched with round/circuit/driver/team context
plus derived columns (positions_gained, fastest_lap_gap). Powers the
classification table, finish/grid charts, positions gained/lost, result
heatmaps, points-by-round and reliability views.
"""
from typing import Optional

import psycopg
from fastapi import APIRouter, Depends, Query

from core.database import get_db
from app.router.schemas import Page, SessionResult, SessionType
from app.router.utils import Pagination, paginate

router = APIRouter(prefix="/results", tags=["results"])

RESULT_SELECT = """
    SELECT se.id, se.api_id, se.session_id, sess.type AS session_type,
           r.id AS round_id, r.name AS round_name, s.year, r.number AS round_number,
           c.id AS circuit_id, c.name AS circuit_name,
           d.id AS driver_id, d.forename AS driver_forename, d.surname AS driver_surname,
           d.abbreviation AS driver_abbreviation,
           t.id AS team_id, t.name AS team_name,
           re.car_number,
           se.position, se.position_text, se.is_classified, se.status, se.detail,
           se.points, se.is_eligible_for_points, se.grid,
           se.fastest_lap_time, se.fastest_lap_rank, se.laps_completed,
           CASE WHEN se.grid > 0 THEN se.grid - se.position END AS positions_gained,
           se.fastest_lap_time - (
               SELECT min(se2.fastest_lap_time)
               FROM bronze.session_entry se2
               WHERE se2.session_id = se.session_id
           ) AS fastest_lap_gap
    FROM bronze.session_entry se
    JOIN bronze.session sess ON sess.id = se.session_id
    JOIN bronze.round r ON r.id = sess.round_id
    JOIN bronze.season s ON s.id = r.season_id
    JOIN bronze.circuits c ON c.id = r.circuit_id
    JOIN bronze.round_entry re ON re.id = se.round_entry_id
    JOIN bronze.team_driver td ON td.id = re.team_driver_id
    JOIN bronze.drivers d ON d.id = td.driver_id
    JOIN bronze.team t ON t.id = td.team_id
"""
RESULT_COUNT = """
    SELECT count(*)
    FROM bronze.session_entry se
    JOIN bronze.session sess ON sess.id = se.session_id
    JOIN bronze.round r ON r.id = sess.round_id
    JOIN bronze.season s ON s.id = r.season_id
    JOIN bronze.circuits c ON c.id = r.circuit_id
    JOIN bronze.round_entry re ON re.id = se.round_entry_id
    JOIN bronze.team_driver td ON td.id = re.team_driver_id
    JOIN bronze.drivers d ON d.id = td.driver_id
    JOIN bronze.team t ON t.id = td.team_id
"""


def result_filters(
    year: Optional[int] = Query(None),
    year_from: Optional[int] = Query(None),
    year_to: Optional[int] = Query(None),
    round_number: Optional[int] = Query(None, ge=1),
    round_from: Optional[int] = Query(None, ge=1, description="Round number range start"),
    round_to: Optional[int] = Query(None, ge=1, description="Round number range end"),
    round_id: Optional[int] = Query(None),
    circuit_id: Optional[int] = Query(None),
    session_id: Optional[int] = Query(None),
    session_type: Optional[SessionType] = Query(None),
    driver_id: Optional[int] = Query(None),
    driver_ids: Optional[list[int]] = Query(None),
    team_id: Optional[int] = Query(None),
    team_ids: Optional[list[int]] = Query(None),
    position: Optional[int] = Query(None, ge=1, description="Exact finishing position"),
    is_classified: Optional[bool] = Query(None),
    status: Optional[str] = Query(None, description="Exact status, e.g. Finished, Retired"),
) -> tuple[list[str], dict]:
    """Shared WHERE-clause builder for every query over the result join."""
    where, params = [], {}
    simple = {
        "year": ("s.year = %(year)s", year),
        "year_from": ("s.year >= %(year_from)s", year_from),
        "year_to": ("s.year <= %(year_to)s", year_to),
        "round_number": ("r.number = %(round_number)s", round_number),
        "round_from": ("r.number >= %(round_from)s", round_from),
        "round_to": ("r.number <= %(round_to)s", round_to),
        "round_id": ("r.id = %(round_id)s", round_id),
        "circuit_id": ("c.id = %(circuit_id)s", circuit_id),
        "session_id": ("sess.id = %(session_id)s", session_id),
        "driver_id": ("d.id = %(driver_id)s", driver_id),
        "team_id": ("t.id = %(team_id)s", team_id),
        "position": ("se.position = %(position)s", position),
        "is_classified": ("se.is_classified = %(is_classified)s", is_classified),
        "status": ("se.status = %(status)s", status),
    }
    for key, (clause, value) in simple.items():
        if value is not None:
            where.append(clause)
            params[key] = value
    if session_type is not None:
        where.append("sess.type = %(session_type)s")
        params["session_type"] = session_type.value
    if driver_ids:
        where.append("d.id = ANY(%(driver_ids)s)")
        params["driver_ids"] = driver_ids
    if team_ids:
        where.append("t.id = ANY(%(team_ids)s)")
        params["team_ids"] = team_ids
    return where, params


@router.get("", response_model=Page[SessionResult])
def list_results(
    filters: tuple = Depends(result_filters),
    page: Pagination = Depends(),
    db: psycopg.Connection = Depends(get_db),
):
    where, params = filters
    return paginate(
        db, RESULT_SELECT, RESULT_COUNT, where, params,
        "s.year, r.number, sess.id, se.position NULLS LAST", page,
    )
