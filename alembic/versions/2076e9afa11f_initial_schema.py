"""initial_schema

Revision ID: 2076e9afa11f
Revises: 
Create Date: 2026-04-27 07:27:45.121439

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2076e9afa11f'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:                                                  
    op.execute("""                                                      
        CREATE TABLE drivers (                                          
            id SERIAL PRIMARY KEY,
            name VARCHAR NOT NULL,
            nationality VARCHAR,
            created_at TIMESTAMP DEFAULT NOW()                          
        )
    """)                                                                
                  

def downgrade() -> None:
    op.execute("DROP TABLE drivers")
