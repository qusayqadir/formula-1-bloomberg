import os
import requests

from pipeline.model.circuit_model import CircuitModel
from pipeline.model.driver_model import DriverModel
from pipeline.model.team_model import TeamModel 
from pipeline.model.team_championship import TeamChampionshipModel 
from pipeline.model.driver_championship import DriverChampionshipModel
from pipeline.model.team_driver import TeamDriverModel 
from pipeline.model.season import SeasonModel
from pipeline.model.round import RoundModel 
from pipeline.model.session import SessionModel
from pipeline.model.session_entry import SessionEntryModel
from pipeline.model.round_entry import RoundEntryModel 



BASE_URL = os.environ["BASE_URL"]
CIRCUITS_URL = f"{BASE_URL}/circuits.json"
DRIVERS_URL = f"{BASE_URL}/drivers.json"
TEAM_URL = f"{BASE_URL}/"


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


def insert_circuits(conn, circuits: list[CircuitModel]) -> None:
    for c in circuits:
        conn.execute(
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


def insert_drivers(conn, drivers: list[DriverModel]) -> None:
    for d in drivers:
        conn.execute(
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



