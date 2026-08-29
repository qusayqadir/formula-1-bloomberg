"""add lap + pitstop schema

Revision ID: 534d2893254a
Revises: 4b0e8ab5e80f
Create Date: 2026-08-27 23:18:12.758840

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '534d2893254a'
down_revision: Union[str, Sequence[str], None] = '4b0e8ab5e80f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.laps (
            id SERIAL PRIMARY KEY,
            api_id TEXT NOT NULL UNIQUE,
            session_id INT NOT NULL REFERENCES bronze.session(id),
            lap_number SMALLINT NOT NULL,
            driver TEXT NOT NULL REFERENCES bronze.drivers(api_id),
            driver_position SMALLINT,
            lap_time TEXT,
            lap_time_sec SMALLINT,
            ingested_at TIMESTAMP DEFAULT NOW()
        )

    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS bronze.pit_stops(
            id SERIAL PRIMARY KEY,
            api_id TEXT NOT NULL UNIQUE,
            session_id INT NOT NULL REFERENCES bronze.session(id),
            lap_id INT NOT NULL REFERENCES bronze.laps(id),
            driver TEXT NOT NULL REFERENCES bronze.drivers(api_id),
            pitstop_number SMALLINT,
            duration TEXT,
            duration_sec REAL,
            ingested_at TIMESTAMP DEFAULT NOW()
        )
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""DROP TABLE IF EXISTS bronze.laps""")
    op.execute("""DROP TABLE IF EXISTS bronze.pit_stops""") 
