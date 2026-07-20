"""add circuits table

Revision ID: 4b0e8ab5e80f
Revises: 7632443b4d93
Create Date: 2026-07-19 12:41:45.001162

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b0e8ab5e80f'
down_revision: Union[str, Sequence[str], None] = '7632443b4d93'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        ALTER TABLE bronze.circuits
            ADD COLUMN IF NOT EXISTS track_length NUMERIC(5,3),
            ADD COLUMN IF NOT EXISTS turns INT,
            ADD COLUMN IF NOT EXISTS race_laps INT,
            ADD COLUMN IF NOT EXISTS lap_record INTERVAL,
            ADD COLUMN IF NOT EXISTS record_holder VARCHAR(100),
            ADD COLUMN IF NOT EXISTS track_type VARCHAR(30),
            ADD COLUMN IF NOT EXISTS drs_zones INT,
            ADD COLUMN IF NOT EXISTS elevation_gain INT;
    """)
    pass


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE bronze.circuits DROP COLUMN IF EXISTS track_length")
    op.execute("ALTER TABLE bronze.circuits DROP COLUMN IF EXISTS turns")
    op.execute("ALTER TABLE bronze.circuits DROP COLUMN IF EXISTS race_laps")
    op.execute("ALTER TABLE bronze.circuits DROP COLUMN IF EXISTS lap_record")
    op.execute("ALTER TABLE bronze.circuits DROP COLUMN IF EXISTS record_holder")
    op.execute("ALTER TABLE bronze.circuits DROP COLUMN IF EXISTS track_type")
    op.execute("ALTER TABLE bronze.circuits DROP COLUMN IF EXISTS drs_zones")
    op.execute("ALTER TABLE bronze.circuits DROP COLUMN IF EXISTS elevation_gain")
    pass
