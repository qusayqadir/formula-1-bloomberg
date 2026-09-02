"""add live sessoin tables'


Revision ID: 12abb55b11db
Revises: eeacc635c9fa
Create Date: 2026-09-01 22:02:49.636580

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '12abb55b11db'
down_revision: Union[str, Sequence[str], None] = 'eeacc635c9fa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.""" 

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.live_session (
            session_key  INTEGER PRIMARY KEY,
            meeting_key  INTEGER NOT NULL,
            ingested_at  TIMESTAMP DEFAULT NOW()
        )
    """)


    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.live_car_data (
            id             BIGSERIAL PRIMARY KEY,
            session_key    INTEGER NOT NULL REFERENCES bronze.live_session(session_key) ON DELETE CASCADE,
            meeting_key    INTEGER NOT NULL,
            driver_number  INTEGER NOT NULL,
            date           TIMESTAMPTZ NOT NULL,
            speed          INTEGER,
            rpm            INTEGER,
            n_gear         SMALLINT,
            throttle       SMALLINT,
            brake          SMALLINT,
            drs            SMALLINT,
            ingested_at    TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uq_live_car_data UNIQUE (session_key, driver_number, date)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_live_car_data_session_date
            ON bronze.live_car_data (session_key, date)
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.live_location (
            id             BIGSERIAL PRIMARY KEY,
            session_key    INTEGER NOT NULL REFERENCES bronze.live_session(session_key) ON DELETE CASCADE,
            meeting_key    INTEGER NOT NULL,
            driver_number  INTEGER NOT NULL,
            date           TIMESTAMPTZ NOT NULL,
            x              INTEGER,
            y              INTEGER,
            z              INTEGER,
            ingested_at    TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uq_live_location UNIQUE (session_key, driver_number, date)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_live_location_session_date
            ON bronze.live_location (session_key, date)
    """)


    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.live_interval (
            id             BIGSERIAL PRIMARY KEY,
            session_key    INTEGER NOT NULL REFERENCES bronze.live_session(session_key) ON DELETE CASCADE,
            meeting_key    INTEGER NOT NULL,
            driver_number  INTEGER NOT NULL,
            date           TIMESTAMPTZ NOT NULL,
            gap_to_leader  NUMERIC(9,3),
            "interval"     NUMERIC(9,3),
            ingested_at    TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uq_live_interval UNIQUE (session_key, driver_number, date)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_live_interval_session_date
            ON bronze.live_interval (session_key, date)
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.live_lap (
            id                 BIGSERIAL PRIMARY KEY,
            session_key        INTEGER NOT NULL REFERENCES bronze.live_session(session_key) ON DELETE CASCADE,
            meeting_key        INTEGER NOT NULL,
            driver_number      INTEGER NOT NULL,
            lap_number         SMALLINT NOT NULL,
            date_start         TIMESTAMPTZ,
            lap_duration       NUMERIC(9,3),
            duration_sector_1  NUMERIC(9,3),
            duration_sector_2  NUMERIC(9,3),
            duration_sector_3  NUMERIC(9,3),
            i1_speed           INTEGER,
            i2_speed           INTEGER,
            st_speed           INTEGER,
            is_pit_out_lap     BOOLEAN,
            segments_sector_1  INTEGER[],
            segments_sector_2  INTEGER[],
            segments_sector_3  INTEGER[],
            ingested_at        TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uq_live_lap UNIQUE (session_key, driver_number, lap_number)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.live_stint (
            id                  BIGSERIAL PRIMARY KEY,
            session_key         INTEGER NOT NULL REFERENCES bronze.live_session(session_key) ON DELETE CASCADE,
            meeting_key         INTEGER NOT NULL,
            driver_number       INTEGER NOT NULL,
            stint_number        SMALLINT NOT NULL,
            compound            TEXT,
            lap_start           SMALLINT,
            lap_end             SMALLINT,
            tyre_age_at_start   SMALLINT,
            ingested_at         TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uq_live_stint UNIQUE (session_key, driver_number, stint_number)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.live_pit (
            id             BIGSERIAL PRIMARY KEY,
            session_key    INTEGER NOT NULL REFERENCES bronze.live_session(session_key) ON DELETE CASCADE,
            meeting_key    INTEGER NOT NULL,
            driver_number  INTEGER NOT NULL,
            date           TIMESTAMPTZ NOT NULL,
            lap_number     SMALLINT NOT NULL,
            pit_duration   NUMERIC(9,3),
            lane_duration  NUMERIC(9,3),
            stop_duration  NUMERIC(9,3),
            ingested_at    TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uq_live_pit UNIQUE (session_key, driver_number, lap_number)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.live_position (
            id             BIGSERIAL PRIMARY KEY,
            session_key    INTEGER NOT NULL REFERENCES bronze.live_session(session_key) ON DELETE CASCADE,
            meeting_key    INTEGER NOT NULL,
            driver_number  INTEGER NOT NULL,
            date           TIMESTAMPTZ NOT NULL,
            position       SMALLINT NOT NULL,
            ingested_at    TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uq_live_position UNIQUE (session_key, driver_number, date)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_live_position_session_date
            ON bronze.live_position (session_key, date)
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.live_race_control (
            id                 BIGSERIAL PRIMARY KEY,
            session_key        INTEGER NOT NULL REFERENCES bronze.live_session(session_key) ON DELETE CASCADE,
            meeting_key        INTEGER NOT NULL,
            date               TIMESTAMPTZ NOT NULL,
            category           TEXT,
            flag               TEXT,
            scope              TEXT,
            message            TEXT NOT NULL,
            driver_number      INTEGER,
            lap_number         SMALLINT,
            sector             SMALLINT,
            qualifying_phase   SMALLINT,
            ingested_at        TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uq_live_race_control UNIQUE (session_key, date, message)
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_live_race_control_session_date
            ON bronze.live_race_control (session_key, date)
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.live_overtake (
            id                        BIGSERIAL PRIMARY KEY,
            session_key               INTEGER NOT NULL REFERENCES bronze.live_session(session_key) ON DELETE CASCADE,
            meeting_key               INTEGER NOT NULL,
            date                      TIMESTAMPTZ NOT NULL,
            overtaking_driver_number  INTEGER NOT NULL,
            overtaken_driver_number   INTEGER NOT NULL,
            position                  SMALLINT,
            ingested_at               TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uq_live_overtake
                UNIQUE (session_key, date, overtaking_driver_number, overtaken_driver_number)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.live_weather (
            id                 BIGSERIAL PRIMARY KEY,
            session_key        INTEGER NOT NULL REFERENCES bronze.live_session(session_key) ON DELETE CASCADE,
            meeting_key        INTEGER NOT NULL,
            date               TIMESTAMPTZ NOT NULL,
            air_temperature    NUMERIC(4,1),
            track_temperature  NUMERIC(4,1),
            humidity           SMALLINT,
            pressure           NUMERIC(6,1),
            rainfall           SMALLINT,
            wind_direction     SMALLINT,
            wind_speed         NUMERIC(4,1),
            ingested_at        TIMESTAMP DEFAULT NOW(),
            CONSTRAINT uq_live_weather UNIQUE (session_key, date)
        )
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.live_focus_selection (
            session_key     INTEGER PRIMARY KEY REFERENCES bronze.live_session(session_key) ON DELETE CASCADE,
            driver_numbers  INTEGER[] NOT NULL DEFAULT '{}',
            updated_at      TIMESTAMP DEFAULT NOW()
        )
    """)


def downgrade() -> None:
    """Downgrade schema."""
    for table in (
        "live_focus_selection",
        "live_weather",
        "live_overtake",
        "live_race_control",
        "live_position",
        "live_pit",
        "live_stint",
        "live_lap",
        "live_interval",
        "live_location",
        "live_car_data",
        "live_session",
    ):
        op.execute(f"DROP TABLE IF EXISTS bronze.{table} CASCADE")
