import os
import psycopg
from dotenv import load_dotenv
load_dotenv()

from requests import Session

from pipeline.ingest.ingestTables import fetch_drivers, insert_drivers
from pipeline.ingest.ingestTables import fetch_circuits, insert_circuits


if __name__ == "__main__":
    db_url = os.environ["DATABASE_URL"].replace("postgresql+psycopg://", "postgresql://")

    with psycopg.connect(db_url) as conn:
        drivers = fetch_drivers()
        insert_drivers(conn, drivers)
        print(f"Inserted {len(drivers)} drivers")

        circuits = fetch_circuits()
        insert_circuits(conn, circuits)
        print(f"Inserted {len(circuits)} circuits")