"""alterations in teamdriver, roundentry, session entry, driverchampionship, and constructorchampionship

Revision ID: 8e7684feb182
Revises: 38fee72b66e3
Create Date: 2026-05-23 20:39:07.316063

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e7684feb182'
down_revision: Union[str, Sequence[str], None] = '38fee72b66e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    op.execute("ALTER TABLE bronze.team_driver DROP COLUMN IF EXISTS role")
    op.execute("ALTER TABLE bronze.session_entry INSERT COLUMN IF NOT EXISTS position_text")
    op.execute("ALTER TABLE bronze.session_entry RENAME COLUMN time to fastest_lap_time")
    op.execute("ALTER TABLE bronze.team_championship DROP COLIMNS session_id IF EXISTS")
    op.execute("ALTER TABLE bronze.team_championship DROP COLIMNS session_number IF EXISTS")


def downgrade() -> None:

    op.execute("ALTER TABLE bronze.team_driver INSERT COLUMN IF NOT EXISTS role")
    op.execute("ALTER TABLE bronze.session_entry DROP COLUMN IF EXISTS position_text")
    op.execute("ALTER TABLE bronze.session_entry RENAME COLUMN fastest_lap_time to time")
    op.execute("ALTER TABLE bronze.team_championship INSERT COLIMNS session_id IF NOT EXISTS")
    op.execute("ALTER TABLE bronze.team_championship INSERT COLIMNS session_number IF NOT EXISTS")