"""add additional data tables team model, team champion, driver champion, team driver, season model, round, sessoin, session entry, round entry'


Revision ID: bb0c6996cb1d
Revises: 2076e9afa11f
Create Date: 2026-05-20 23:46:27.778583

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bb0c6996cb1d'
down_revision: Union[str, Sequence[str], None] = '2076e9afa11f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE bronze.
    """)
    pass


def downgrade() -> None:
    "Downgrade Schema"
    pass 
