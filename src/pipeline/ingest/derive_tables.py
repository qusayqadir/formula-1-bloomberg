import os
from datetime import datetime

from pipeline.model.driver_model import DriverModel
from pipeline.model.round_model import RoundModel
from pipeline.model.session_model import SessionModel
from pipeline.model.team_driver_model import TeamDriverModel
from pipeline.model.session_entry_model import SessionEntryModel

BASE_URL = os.environ["BASE_URL"]


def expand_sessions(rounds: list[RoundModel]) -> list[SessionModel]:
    sessions = []

    session_map = [
        ("FP1",              lambda r: r.FirstPractice),
        ("FP2",              lambda r: r.SecondPractice),
        ("FP3",              lambda r: r.ThirdPractice),
        ("Qualifying",       lambda r: r.Qualifying),
        ("Sprint",           lambda r: r.Sprint),
        ("SprintQualifying", lambda r: r.SprintQualifying),
    ]

    for r in rounds:
        round_api_id = f"{r.season}_{r.round}"

        # Race date/time lives directly on the round, not in a nested object
        race_dt = None
        if r.date:
            dt_str = f"{r.date} {r.time}" if r.time else r.date
            race_dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))

        sessions.append(SessionModel(
            round_api_id=round_api_id,
            type="Race",
            scheduled_at=race_dt,   
        ))

        # All other session types are nested SessionSchedule objects
        for session_type, getter in session_map:
            schedule = getter(r)
            if schedule is None:
                continue

            dt = None
            if schedule.date:
                dt_str = f"{schedule.date} {schedule.time}" if schedule.time else schedule.date
                dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))

            sessions.append(SessionModel(
                round_api_id=round_api_id,
                type=session_type,
                scheduled_at=dt,
            ))

    return sessions


def ingest_sessions(conn, sessions: list[SessionModel]) -> None:
    for s in sessions:
        conn.execute(
            """
            INSERT INTO bronze.session (round_id, api_id, type, scheduled_at, is_cancelled)
            VALUES (
                (SELECT id FROM bronze.round WHERE api_id = %s),
                %s, %s, %s, %s
            )
            ON CONFLICT (api_id) DO NOTHING
            """,
            (
                s.round_api_id,
                f"{s.round_api_id}_{s.type}",   # e.g. "2011_15_Race"
                s.type,
                s.scheduled_at,
                s.is_cancelled,
            ),
        )
    conn.commit()

