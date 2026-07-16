"""alert table cols

Revision ID: 38fee72b66e3
Revises: bb0c6996cb1d
Create Date: 2026-05-21 20:22:48.068865

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '38fee72b66e3'
down_revision: Union[str, Sequence[str], None] = 'bb0c6996cb1d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    

    op.execute("ALTER TABLE bronze.team DROP COLUMN IF EXISTS base_team_id")
    op.execute("ALTER TABLE bronze.team DROP COLUMN IF EXISTS reference")
    op.execute("ALTER TABLE bronze.round DROP COLUMN race_number;")
    op.execute("ALTER TABLE bronze.session DROP COLUMN point_system_id")
    op.execute("ALTER TABLE bronze.session DROP COLUMN  has_time_data")
    op.execute("ALTER TABLE bronze.session DROP COLUMN timezone")
    op.execute("ALTER TABLE bronze.session DROP COLUMN scheduled_laps")


def downgrade() -> None:
    
    op.execute("ALTER TABLE bronze.team ADD COLUMN IF NOT EXISTS base_team_id")
    op.execute("ALTER TABLE bronze.team ADD COLUMN IF NOT EXISTS reference")
    op.execute("ALTER TABLE bronze.round ADD COLUMN race_number SMALLINT")
    op.execute("ALTER TABLE bronze.session ADD COLUMN point_system_id INT")
    op.execute("ALTER TABLE bronze.session ADD COLUMN has_time_data BOOLEAN DEFAULT FALSE")
    op.execute("ALTER TABLE bronze.session ADD COLUMN timezone TEXT")
    op.execute("ALTER TABLE bronze.session ADD COLUMN scheduled_laps SMALLINT")