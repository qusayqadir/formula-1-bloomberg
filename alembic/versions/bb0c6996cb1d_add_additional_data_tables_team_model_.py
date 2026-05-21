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
        CREATE TABLE bronze.team (
            id INT SERIAL PRIMARY KEY,
            base_team_id 
            api_id CHAR NOT NULL UNIQUE, 
            reference CHAR, 
            name CHAR NOT NULL, 
            nationality CHAR, 
            country_code CHAR, 
            wikipedia STRING, 
            primary_color CHAR, 
        )
    """)
    
    op.execute("""
        CREATE TABLE bronze.team_championship (
            id INT SERIAL PRIMARY KEY, 
            session_id INT NOT NULL,
            team_id INT NOT NULL,
            year SMALLINT NOT NULL, 
            round_number INT NOT NULL,
            session_number INT NOT NULL, 
            position INT NOT NULL,
            points FLOAT NOT NULL,
            win_count SMALLINT NOT NULL, 
            highest_finish SMALLINT,
            is_eligible BOOL NOT NULL, 
            adjustment_type INT NOT NULL,
            season_id INT,
            round_id INT,

            FOREIGN KEY (session_id) REFERENCES bronze.session(id),
            FOREIGN KEY (team_id) REFERENCES bronze.team(id),
            FOREIGN KEY (season_id) REFERENCES bronze.season(id),
            FOREIGN KEY (round) REFERENCES bronze.round(id),
        )
    """)

    op.execute("""

        CREATE TABLE bronze.driver_championship(
            id INT PRIMARY KEY,
            session_id INT NOT NULL, 
            driver_id INT NOT NULL,
            year SMALLINT NOT NULL,
            round_number INT NOT NULL,
            session_number INT NOT NULL,
            position SMALLINT,
            points FLOAT NOT NULL,
            win_count SMALLINT NOT NULL,
            highest_finish SMALLINT, 
            is_elibile BOOL NOT NULL,
            adjustment SMALLINT NOT NULL,
            season_id INT,
            round_id INT,

            FOREIGN KEY (session_id) REFERENCES bronze.session(id),
            FOREIGN KEY (driver_id) REFERENCES bronze.drivers(id),
            FOREIGN KEY (season_id) REFERENCES bronze.season(id),
            FOREIGN KEY (round) REFERENCES bronze.round(id),
        )

    """)

    op.execute("""

        CREATE TABLE bronze.team_driver(
        )

    """)

    op.execute("""

        CREATE TABLE bronze.season(
        )

    """)

    op.execute("""

        CREATE TABLE bronze.round(
        )

    """)

    op.execute("""

        CREATE TABLE bronze.session(
        )

    """)

    op.execute("""

        CREATE TABLE bronze.session_entry(
        )

    """)

    op.execute("""

        CREATE TABLE bronze.round_entry(
        )

    """)

def downgrade() -> None:

    op.execute("DROP TABLE IF EXISTS bronze.team")
    op.execute("DROP TABLE IF EXISTS bronze.team_championship")
    op.execute("DROP TABLE IF EXISTS bronze.driver_championship")
    op.execute("DROP TABLE IF EXISTS bronze.team_driver")
    op.execute("DROP TABLE IF EXISTS bronze.season")
    op.execute("DROP TABLE IF EXISTS bronze.round")
    op.execute("DROP TABLE IF EXISTS bronze.session")
    op.execute("DROP TABLE IF EXISTS bronze.session_entry")
    op.execute("DROP TABLE IF EXISTS bronze.round_entry")

