"""add fk indexes for laps and pit stops

Revision ID: eeacc635c9fa
Revises: fff2135d9cb4
Create Date: 2026-08-30 21:59:08.430691

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'eeacc635c9fa'
down_revision: Union[str, Sequence[str], None] = 'fff2135d9cb4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.execute("CREATE INDEX IF NOT EXISTS ix_laps_session_id ON bronze.laps (session_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_laps_driver ON bronze.laps (driver)")

    op.execute("CREATE INDEX IF NOT EXISTS ix_pit_stops_session_id ON bronze.pit_stops (session_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_pit_stops_driver ON bronze.pit_stops (driver)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_pit_stops_lap_id ON bronze.pit_stops (lap_id)")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS bronze.ix_pit_stops_lap_id")
    op.execute("DROP INDEX IF EXISTS bronze.ix_pit_stops_driver")
    op.execute("DROP INDEX IF EXISTS bronze.ix_pit_stops_session_id")

    op.execute("DROP INDEX IF EXISTS bronze.ix_laps_driver")
    op.execute("DROP INDEX IF EXISTS bronze.ix_laps_session_id")
