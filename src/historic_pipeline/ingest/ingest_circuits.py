import os
import requests
from dotenv import load_dotenv

from historic_pipeline.model.bronze_circuit_model import CircuitModel

load_dotenv()

BASE_URL = os.environ["BASE_URL"]
CIRCUITS_URL = f"{BASE_URL}/circuits.json"


def fetch_circuits() -> list[CircuitModel]:
    circuits = []
    offset = 0
    limit = 100

    while True:
        response = requests.get(CIRCUITS_URL, params={"limit": limit, "offset": offset})
        response.raise_for_status()
        data = response.json()["MRData"]
        batch = data["CircuitTable"]["Circuits"]
        circuits.extend([CircuitModel(**c) for c in batch])

        total = int(data["total"])
        offset += limit
        if offset >= total:
            break

    return circuits


def insert_circuits(conn, circuits: list[CircuitModel]) -> None:
    with conn.cursor() as cur:
        for c in circuits:
            cur.execute(
                """
                INSERT INTO bronze.circuits
                    (circuit_id, circuit_name, locality, country, lat, lng, url)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (circuit_id) DO NOTHING
                """,
                (
                    c.circuitId,
                    c.circuitName,
                    c.Location.locality,
                    c.Location.country,
                    float(c.Location.lat),
                    float(c.Location.long),
                    c.url,
                ),
            )
    conn.commit()


