"""add additional data tables: team, season, round, session, team_driver, round_entry,
session_entry, driver_championship, team_championship; upgrade drivers and circuits schema

Revision ID: bb0c6996cb1d
Revises: 2076e9afa11f
Create Date: 2026-05-20 23:46:27.778583

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'bb0c6996cb1d'
down_revision: Union[str, Sequence[str], None] = '2076e9afa11f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # ── Upgrade bronze.drivers to match reference schema ──────────────────
    op.execute("ALTER TABLE bronze.drivers RENAME COLUMN driver_id TO api_id")
    op.execute("ALTER TABLE bronze.drivers RENAME COLUMN permanent_number TO permanent_car_number")
    op.execute("""
        ALTER TABLE bronze.drivers
        ALTER COLUMN permanent_car_number TYPE SMALLINT
        USING NULLIF(permanent_car_number, '')::SMALLINT
    """)
    op.execute("ALTER TABLE bronze.drivers RENAME COLUMN code TO abbreviation")
    op.execute("ALTER TABLE bronze.drivers RENAME COLUMN given_name TO forename")
    op.execute("ALTER TABLE bronze.drivers RENAME COLUMN family_name TO surname")
    op.execute("ALTER TABLE bronze.drivers RENAME COLUMN url TO wikipedia")
    op.execute("ALTER TABLE bronze.drivers ADD COLUMN reference TEXT UNIQUE")
    op.execute("ALTER TABLE bronze.drivers ADD COLUMN country_code TEXT")

    # ── Upgrade bronze.circuits to match reference schema ─────────────────
    op.execute("ALTER TABLE bronze.circuits RENAME COLUMN circuit_id TO api_id")
    op.execute("ALTER TABLE bronze.circuits RENAME COLUMN circuit_name TO name")
    op.execute("ALTER TABLE bronze.circuits RENAME COLUMN lat TO latitude")
    op.execute("ALTER TABLE bronze.circuits RENAME COLUMN lng TO longitude")
    op.execute("ALTER TABLE bronze.circuits RENAME COLUMN url TO wikipedia")
    op.execute("ALTER TABLE bronze.circuits ADD COLUMN reference TEXT UNIQUE")
    op.execute("ALTER TABLE bronze.circuits ADD COLUMN country_code TEXT")
    op.execute("ALTER TABLE bronze.circuits ADD COLUMN altitude FLOAT")

    # ── New tables (order respects FK dependencies) ───────────────────────

    op.execute("""
        CREATE TABLE bronze.team (
            id            SERIAL PRIMARY KEY,
            base_team_id  INT,
            api_id        TEXT NOT NULL UNIQUE,
            reference     TEXT UNIQUE,
            name          VARCHAR NOT NULL,
            nationality   VARCHAR,
            country_code  VARCHAR,
            wikipedia     TEXT,
            primary_color TEXT,
            ingested_at   TIMESTAMP DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE bronze.season (
            id                     SERIAL PRIMARY KEY,
            championship_system_id INT,
            api_id                 TEXT NOT NULL UNIQUE,
            year                   SMALLINT NOT NULL UNIQUE,
            wikipedia              TEXT,
            ingested_at            TIMESTAMP DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE bronze.round (
            id           SERIAL PRIMARY KEY,
            season_id    INT NOT NULL REFERENCES bronze.season(id),
            circuit_id   INT NOT NULL REFERENCES bronze.circuits(id),
            api_id       TEXT NOT NULL UNIQUE,
            number       SMALLINT,
            name         TEXT,
            date         DATE,
            race_number  SMALLINT,
            is_cancelled BOOLEAN DEFAULT FALSE,
            ingested_at  TIMESTAMP DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE bronze.session (
            id              SERIAL PRIMARY KEY,
            round_id        INT NOT NULL REFERENCES bronze.round(id),
            point_system_id INT,
            api_id          TEXT NOT NULL UNIQUE,
            type            TEXT,
            scheduled_at    TIMESTAMPTZ,
            has_time_data   BOOLEAN DEFAULT FALSE,
            timezone        TEXT,
            scheduled_laps  SMALLINT,
            is_cancelled    BOOLEAN DEFAULT FALSE,
            ingested_at     TIMESTAMP DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE bronze.team_driver (
            id          SERIAL PRIMARY KEY,
            team_id     INT NOT NULL REFERENCES bronze.team(id),
            driver_id   INT NOT NULL REFERENCES bronze.drivers(id),
            season_id   INT NOT NULL REFERENCES bronze.season(id),
            api_id      TEXT NOT NULL UNIQUE,
            role        SMALLINT,
            ingested_at TIMESTAMP DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE bronze.round_entry (
            id             SERIAL PRIMARY KEY,
            round_id       INT NOT NULL REFERENCES bronze.round(id),
            team_driver_id INT NOT NULL REFERENCES bronze.team_driver(id),
            api_id         TEXT NOT NULL UNIQUE,
            car_number     SMALLINT,
            ingested_at    TIMESTAMP DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE bronze.session_entry (
            id                     SERIAL PRIMARY KEY,
            session_id             INT NOT NULL REFERENCES bronze.session(id),
            round_entry_id         INT NOT NULL REFERENCES bronze.round_entry(id),
            api_id                 TEXT NOT NULL UNIQUE,
            position               SMALLINT,
            is_classified          BOOLEAN,
            status                 TEXT,
            detail                 TEXT,
            points                 FLOAT,
            is_eligible_for_points BOOLEAN DEFAULT TRUE,
            grid                   SMALLINT,
            time                   INTERVAL,
            fastest_lap_rank       SMALLINT,
            laps_completed         SMALLINT,
            ingested_at            TIMESTAMP DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE bronze.driver_championship (
            id              SERIAL PRIMARY KEY,
            session_id      INT NOT NULL REFERENCES bronze.session(id),
            driver_id       INT NOT NULL REFERENCES bronze.drivers(id),
            season_id       INT REFERENCES bronze.season(id),
            round_id        INT REFERENCES bronze.round(id),
            year            SMALLINT NOT NULL,
            round_number    SMALLINT NOT NULL,
            session_number  SMALLINT NOT NULL,
            position        SMALLINT,
            points          FLOAT NOT NULL,
            win_count       SMALLINT NOT NULL,
            highest_finish  SMALLINT,
            is_eligible     BOOLEAN DEFAULT FALSE,
            adjustment_type SMALLINT DEFAULT 0,
            ingested_at     TIMESTAMP DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE bronze.team_championship (
            id              SERIAL PRIMARY KEY,
            session_id      INT NOT NULL REFERENCES bronze.session(id),
            team_id         INT NOT NULL REFERENCES bronze.team(id),
            season_id       INT REFERENCES bronze.season(id),
            round_id        INT REFERENCES bronze.round(id),
            year            SMALLINT NOT NULL,
            round_number    SMALLINT NOT NULL,
            session_number  SMALLINT NOT NULL,
            position        SMALLINT,
            points          FLOAT NOT NULL,
            win_count       SMALLINT NOT NULL,
            highest_finish  SMALLINT,
            is_eligible     BOOLEAN DEFAULT FALSE,
            adjustment_type SMALLINT DEFAULT 0,
            ingested_at     TIMESTAMP DEFAULT NOW()
        )
    """)


def downgrade() -> None:
    # Drop in reverse dependency order
    op.execute("DROP TABLE IF EXISTS bronze.team_championship")
    op.execute("DROP TABLE IF EXISTS bronze.driver_championship")
    op.execute("DROP TABLE IF EXISTS bronze.session_entry")
    op.execute("DROP TABLE IF EXISTS bronze.round_entry")
    op.execute("DROP TABLE IF EXISTS bronze.team_driver")
    op.execute("DROP TABLE IF EXISTS bronze.session")
    op.execute("DROP TABLE IF EXISTS bronze.round")
    op.execute("DROP TABLE IF EXISTS bronze.season")
    op.execute("DROP TABLE IF EXISTS bronze.team")

    # Revert bronze.circuits
    op.execute("ALTER TABLE bronze.circuits DROP COLUMN IF EXISTS altitude")
    op.execute("ALTER TABLE bronze.circuits DROP COLUMN IF EXISTS country_code")
    op.execute("ALTER TABLE bronze.circuits DROP COLUMN IF EXISTS reference")
    op.execute("ALTER TABLE bronze.circuits RENAME COLUMN wikipedia TO url")
    op.execute("ALTER TABLE bronze.circuits RENAME COLUMN longitude TO lng")
    op.execute("ALTER TABLE bronze.circuits RENAME COLUMN latitude TO lat")
    op.execute("ALTER TABLE bronze.circuits RENAME COLUMN name TO circuit_name")
    op.execute("ALTER TABLE bronze.circuits RENAME COLUMN api_id TO circuit_id")

    # Revert bronze.drivers
    op.execute("ALTER TABLE bronze.drivers DROP COLUMN IF EXISTS country_code")
    op.execute("ALTER TABLE bronze.drivers DROP COLUMN IF EXISTS reference")
    op.execute("ALTER TABLE bronze.drivers RENAME COLUMN wikipedia TO url")
    op.execute("ALTER TABLE bronze.drivers RENAME COLUMN surname TO family_name")
    op.execute("ALTER TABLE bronze.drivers RENAME COLUMN forename TO given_name")
    op.execute("ALTER TABLE bronze.drivers RENAME COLUMN abbreviation TO code")
    op.execute("""
        ALTER TABLE bronze.drivers
        ALTER COLUMN permanent_car_number TYPE VARCHAR
        USING permanent_car_number::VARCHAR
    """)
    op.execute("ALTER TABLE bronze.drivers RENAME COLUMN permanent_car_number TO permanent_number")
    op.execute("ALTER TABLE bronze.drivers RENAME COLUMN api_id TO driver_id")
