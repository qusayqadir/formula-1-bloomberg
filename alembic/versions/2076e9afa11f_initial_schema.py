"""bronze layer - drivers and circuits

Revision ID: 2076e9afa11f
Revises:
Create Date: 2026-04-27 07:27:45.121439

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '2076e9afa11f'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SCHEMA IF NOT EXISTS bronze")

    op.execute("""
        CREATE TABLE bronze.drivers (
            id               SERIAL PRIMARY KEY,
            driver_id        VARCHAR NOT NULL UNIQUE,
            permanent_number VARCHAR,
            code             VARCHAR(3),
            given_name       VARCHAR NOT NULL,
            family_name      VARCHAR NOT NULL,
            date_of_birth    DATE,
            nationality      VARCHAR,
            url              VARCHAR,
            ingested_at      TIMESTAMP DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE TABLE bronze.circuits (
            id           SERIAL PRIMARY KEY,
            circuit_id   VARCHAR NOT NULL UNIQUE,
            circuit_name VARCHAR NOT NULL,
            locality     VARCHAR,
            country      VARCHAR,
            lat          NUMERIC(9,6),
            lng          NUMERIC(9,6),
            url          VARCHAR,
            ingested_at  TIMESTAMP DEFAULT NOW()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS bronze.circuits")
    op.execute("DROP TABLE IF EXISTS bronze.drivers")
    op.execute("DROP SCHEMA IF EXISTS bronze")
