"""alterations in teamdriver, roundentry, session entry, driverchampionship, and constructorchampionship

Revision ID: 8e7684feb182
Revises: 38fee72b66e3
Create Date: 2026-05-23 20:39:07.316063

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '8e7684feb182'
down_revision: Union[str, Sequence[str], None] = '38fee72b66e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    op.execute("ALTER TABLE bronze.team_driver DROP COLUMN IF EXISTS role")
    op.execute("ALTER TABLE bronze.session_entry ADD COLUMN IF NOT EXISTS position_text TEXT")
    op.execute('ALTER TABLE bronze.session_entry RENAME COLUMN "time" TO fastest_lap_time')

    op.execute("ALTER TABLE bronze.team_championship DROP COLUMN IF EXISTS session_id")
    op.execute("ALTER TABLE bronze.team_championship DROP COLUMN IF EXISTS session_number")
    op.execute("ALTER TABLE bronze.driver_championship DROP COLUMN IF EXISTS session_id")
    op.execute("ALTER TABLE bronze.driver_championship DROP COLUMN IF EXISTS session_number")

    op.execute("ALTER TABLE bronze.team_championship ADD COLUMN IF NOT EXISTS api_id TEXT")
    op.execute("ALTER TABLE bronze.team_championship ADD CONSTRAINT team_championship_api_id_key UNIQUE (api_id)")

    op.execute("ALTER TABLE bronze.driver_championship ADD COLUMN IF NOT EXISTS api_id TEXT")
    op.execute("ALTER TABLE bronze.driver_championship ADD CONSTRAINT driver_championship_api_id_key UNIQUE (api_id)")


def downgrade() -> None:

    op.execute("ALTER TABLE bronze.team_driver ADD COLUMN IF NOT EXISTS role INT")
    op.execute("ALTER TABLE bronze.session_entry DROP COLUMN IF EXISTS position_text")
    op.execute('ALTER TABLE bronze.session_entry RENAME COLUMN fastest_lap_time TO "time"')

    op.execute("ALTER TABLE bronze.team_championship ADD COLUMN IF NOT EXISTS session_id INT")
    op.execute("ALTER TABLE bronze.team_championship ADD COLUMN IF NOT EXISTS session_number INT")
    op.execute("ALTER TABLE bronze.driver_championship ADD COLUMN IF NOT EXISTS session_id INT")
    op.execute("ALTER TABLE bronze.driver_championship ADD COLUMN IF NOT EXISTS session_number INT")

    op.execute("ALTER TABLE bronze.team_championship DROP CONSTRAINT IF EXISTS team_championship_api_id_key")
    op.execute("ALTER TABLE bronze.team_championship DROP COLUMN IF EXISTS api_id")
    op.execute("ALTER TABLE bronze.driver_championship DROP CONSTRAINT IF EXISTS driver_championship_api_id_key")
    op.execute("ALTER TABLE bronze.driver_championship DROP COLUMN IF EXISTS api_id")