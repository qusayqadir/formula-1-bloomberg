import os
import psycopg
from dotenv import load_dotenv
load_dotenv()

from requests import Session

from ingest_tables_raw import fetch_drivers, fetch_seasons, insert_drivers, insert_session_entries
from ingest_tables_raw import fetch_circuits, insert_circuits
from ingest_tables_raw import fetch_seasons, insert_seasons
from ingest_tables_raw import fetch_constructors, ingest_constructor
from ingest_tables_raw import fetch_rounds, ingest_rounds
from ingest_tables_raw import fetch_race_results, insert_team_drivers, insert_round_entries

from derive_tables import expand_sessions, ingest_sessions

def fetch_and_fill_schema():
    db_url = os.environ["DATABASE_URL"].replace("postgresql+psycopg://", "postgresql://")

    with psycopg.connect(db_url) as conn:
        # drivers = fetch_drivers()
        # insert_drivers(conn, drivers)
        # print(f"Inserted {len(drivers)} Drivers")

        # circuits = fetch_circuits()
        # insert_circuits(conn, circuits)
        # print(f"Inserted {len(circuits)} Circuits")

        # seasons = fetch_seasons()
        # insert_seasons(conn, seasons)
        # print(f"Inserted {len(seasons)} Seasons")

        # constructors = fetch_constructors()
        # ingest_constructor(conn, constructors)
        # print(f"Ingested {len(constructors)} constructors/teams")

        # rounds = fetch_rounds()
        # ingest_rounds(conn, rounds)
        # print(f"Ingestd {len(rounds)} Rounds")

        # sessions = expand_sessions(rounds)   # no API call
        # ingest_sessions(conn, sessions)
        # print(f"Ingest {len(sessions)} Session")

        team_drivers, round_entries, session_entries = fetch_race_results()
        insert_team_drivers(conn, team_drivers)
        print(f"Inserted {len(team_drivers)} Team Drivers")
        insert_round_entries(conn, round_entries)
        print(f"Inserted {len(round_entries)} Round Entries")
        insert_session_entries(conn, session_entries)
        print(f"Inserted {len(session_entries)} Session Entries")


fetch_and_fill_schema()
