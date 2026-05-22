import os
import psycopg
from dotenv import load_dotenv
load_dotenv()

from requests import Session

from ingest_tables_raw import fetch_drivers, fetch_seasons, insert_drivers
from ingest_tables_raw import fetch_circuits, insert_circuits
from ingest_tables_raw import fetch_seasons, insert_seasons
from ingest_tables_raw import fetch_constructors, ingest_constructor
from ingest_tables_raw import ingest_rounds, fetch_rounds
from derive_tables import expand_sessions, ingest_sessions

def fetch_and_fill_schema(): 
    db_url = os.environ["DATABASE_URL"].replace("postgresql+psycopg://", "postgresql://")

    with psycopg.connect(db_url) as conn:
        drivers = fetch_drivers()
        insert_drivers(conn, drivers)
        print(f"Inserted {len(drivers)} Drivers")

        circuits = fetch_circuits()
        insert_circuits(conn, circuits)
        print(f"Inserted {len(circuits)} Circuits")

        seasons = fetch_seasons()
        insert_seasons(conn, seasons)
        print(f"Inserted {len(seasons)} Seasons")

        constructors = fetch_constructors() 
        ingest_constructor(conn, constructors) 
        print(f"Ingested {len(constructors)} constructors/teams")

        rounds = fetch_rounds()
        ingest_rounds(conn, rounds) 
        print(f"Ingestd {len(rounds)} Rounds")

        sessions = expand_sessions(rounds)   # no API call
        ingest_sessions(conn, sessions)
        print(f"Ingest {len(sessions)} Session")

        # insert_team_driver(conn, drivers) 
        # print(f"Ingested {len(drivers)} Team Drivers")


fetch_and_fill_schema()
