"""add join path and championship lookup indexes

Revision ID: 7632443b4d93
Revises: 8e7684feb182
Create Date: 2026-07-13 18:18:49.504149

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7632443b4d93'
down_revision: Union[str, Sequence[str], None] = '8e7684feb182'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Every index supports a join path or filter used by the /results and
# /analytics endpoints. Only PK/api_id unique indexes existed before this;
# none of the FK columns walked by the result join tree were indexed.
INDEXES = {
    # result join tree: session_entry → session → round → season/circuits
    "ix_session_entry_session_id": "bronze.session_entry (session_id)",
    "ix_session_entry_round_entry_id": "bronze.session_entry (round_entry_id)",
    "ix_session_round_id": "bronze.session (round_id)",
    "ix_round_season_id": "bronze.round (season_id)",
    "ix_round_circuit_id": "bronze.round (circuit_id)",
    # entry → seat → driver/team resolution
    "ix_round_entry_round_id": "bronze.round_entry (round_id)",
    "ix_round_entry_team_driver_id": "bronze.round_entry (team_driver_id)",
    "ix_team_driver_driver_id": "bronze.team_driver (driver_id)",
    "ix_team_driver_team_id": "bronze.team_driver (team_id)",
    "ix_team_driver_season_id": "bronze.team_driver (season_id)",
    # championship snapshot lookups: standings by (year, round) and
    # per-entity progression/history scans
    "ix_driver_championship_year_round": "bronze.driver_championship (year, round_number)",
    "ix_driver_championship_driver_year": "bronze.driver_championship (driver_id, year)",
    "ix_team_championship_year_round": "bronze.team_championship (year, round_number)",
    "ix_team_championship_team_year": "bronze.team_championship (team_id, year)",
}


def upgrade() -> None:
    for name, target in INDEXES.items():
        op.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {target}")


def downgrade() -> None:
    for name in INDEXES:
        op.execute(f"DROP INDEX IF EXISTS bronze.{name}")
