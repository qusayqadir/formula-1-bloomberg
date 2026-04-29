import os
import requests
from dotenv import load_dotenv

from historic_pipeline.model.bronze_driver_model import DriverModel

load_dotenv()

BASE_URL=os.environ["BASE_URL"]
DRIVERS_URL = f"{BASE_URL}/drivers.json"


def fetch_drivers() -> list[DriverModel]:
    drivers = []
    offset = 0
    limit = 100

    while True:
        response = requests.get(DRIVERS_URL, params={"limit": limit, "offset": offset})
        response.raise_for_status()
        data = response.json()["MRData"]
        batch = data["DriverTable"]["Drivers"]
        drivers.extend([DriverModel(**d) for d in batch])

        total = int(data["total"])
        offset += limit
        if offset >= total:
            break

    return drivers


def insert_drivers(conn, drivers: list[DriverModel]) -> None:
    with conn.cursor() as cur:
        for d in drivers:
            cur.execute(
                """
                INSERT INTO bronze.drivers
                    (driver_id, permanent_number, code, given_name, family_name,
                     date_of_birth, nationality, url)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (driver_id) DO NOTHING
                """,
                (
                    d.driverId,
                    d.permanentNumber,
                    d.code,
                    d.givenName,
                    d.familyName,
                    d.dateOfBirth,
                    d.nationality,
                    d.url,
                ),
            )
    conn.commit()


