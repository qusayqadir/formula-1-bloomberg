"""lap time precision

Revision ID: fff2135d9cb4
Revises: 534d2893254a
Create Date: 2026-08-30 17:47:54.814746

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fff2135d9cb4'
down_revision: Union[str, Sequence[str], None] = '534d2893254a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TABLE bronze.laps ALTER COLUMN lap_time_sec TYPE REAL")
    op.execute("""
        UPDATE bronze.laps
        SET lap_time_sec = split_part(lap_time, ':', 1)::real * 60
                          + split_part(lap_time, ':', 2)::real
        WHERE lap_time ~ '^[0-9]+:[0-9]+\\.[0-9]+$'
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE bronze.laps ALTER COLUMN lap_time_sec TYPE SMALLINT USING round(lap_time_sec)::smallint")
