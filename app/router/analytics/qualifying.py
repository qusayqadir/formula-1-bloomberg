"""Qualifying segment times (Q1/Q2/Q3) for a single round.

Q1/Q2/Q3 are stored as three separate synthetic sessions
(bronze.session.type = 'Quali_Q1'/'Quali_Q2'/'Quali_Q3'), each carrying the
same overall qualifying position but a different segment's lap time in
fastest_lap_time — there is no per-segment position. This endpoint pivots
those three session rows back into one row per driver.
"""
import psycopg
from fastapi import APIRouter, Depends, Query

from core.database import get_db
from app.router.analytics.schemas import QualifyingSegmentsResponse
from app.router.schemas import SessionType

router = APIRouter(prefix="/qualifying", tags=["analytics"])

QUALI_TYPES = [SessionType.QUALI_Q1.value, SessionType.QUALI_Q2.value, SessionType.QUALI_Q3.value]

SEGMENTS_SQL = """
    SELECT d.id AS driver_id, d.forename, d.surname, d.abbreviation,
           t.id AS team_id, t.name AS team_name, t.primary_color,
           max(se.position) AS final_position,
           max(se.fastest_lap_time) FILTER (WHERE sess.type = 'Quali_Q1') AS q1_time,
           max(se.fastest_lap_time) FILTER (WHERE sess.type = 'Quali_Q2') AS q2_time,
           max(se.fastest_lap_time) FILTER (WHERE sess.type = 'Quali_Q3') AS q3_time
    FROM bronze.session_entry se
    JOIN bronze.session sess ON sess.id = se.session_id
    JOIN bronze.round r ON r.id = sess.round_id
    JOIN bronze.season s ON s.id = r.season_id
    JOIN bronze.round_entry re ON re.id = se.round_entry_id
    JOIN bronze.team_driver td ON td.id = re.team_driver_id
    JOIN bronze.drivers d ON d.id = td.driver_id
    JOIN bronze.team t ON t.id = td.team_id
    WHERE sess.type = ANY(%(quali_types)s) AND s.year = %(year)s AND r.number = %(round_number)s
    GROUP BY d.id, d.forename, d.surname, d.abbreviation, t.id, t.name, t.primary_color
    ORDER BY final_position NULLS LAST
"""


@router.get("/segments", response_model=QualifyingSegmentsResponse)
def qualifying_segments(
    year: int = Query(...),
    round_number: int = Query(..., ge=1),
    db: psycopg.Connection = Depends(get_db),
):
    with db.cursor() as cur:
        cur.execute(SEGMENTS_SQL, {
            "quali_types": QUALI_TYPES, "year": year, "round_number": round_number,
        })
        rows = cur.fetchall()
    return {
        "metadata": {"year": year, "round_number": round_number},
        "rows": [
            {
                "driver": {"id": r["driver_id"], "forename": r["forename"],
                           "surname": r["surname"], "abbreviation": r["abbreviation"]},
                "team": {"id": r["team_id"], "name": r["team_name"],
                         "primary_color": r["primary_color"]},
                "final_position": r["final_position"],
                "q1_time": r["q1_time"], "q2_time": r["q2_time"], "q3_time": r["q3_time"],
            }
            for r in rows
        ],
    }
