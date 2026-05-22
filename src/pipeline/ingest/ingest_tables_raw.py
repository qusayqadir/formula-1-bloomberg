from math import e
import os
import requests
from datetime import datetime

from pipeline.model.circuit_model import CircuitModel
from pipeline.model.driver_model import DriverModel
from pipeline.model.team_model import TeamModel 
from pipeline.model.team_championship_model import TeamChampionshipModel 
from pipeline.model.driver_championship_model import DriverChampionshipModel
from pipeline.model.season_model import SeasonModel
from pipeline.model.round_model import RoundModel 
from pipeline.model.session_model import SessionModel

BASE_URL = os.environ["BASE_URL"]
CIRCUITS_URL = f"{BASE_URL}/circuits.json"
DRIVERS_URL = f"{BASE_URL}/drivers.json"
SEASON_URL = f"{BASE_URL}/seasons/"
TEAM_URL = f"{BASE_URL}/constructors/"

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

def fetch_seasons() -> list[SeasonModel]: 
    
    seasons = []
    offset = 0
    limit = 100
    
    while True: 

        response = requests.get(SEASON_URL, params={"limit": limit, "offset":offset})
        response.raise_for_status() 
        data = response.json()["MRData"]
        batch = data["SeasonTable"]["Seasons"]
        seasons.extend([SeasonModel(**season) for season in batch])
        
        offset += limit 
        if offset >= int(data["total"]):
            break

    return seasons 

def fetch_constructors() -> list[TeamModel]: 

    constructors = []
    limit = 100 
    offset = 0 

    while True: 

        response = requests.get(TEAM_URL, params={"limit":limit, "offset":offset})
        response.raise_for_status() 
        data = response.json()["MRData"]
        batch = data["ConstructorTable"]["Constructors"]
        constructors.extend([TeamModel(**team) for team in batch])

        offset += limit 
        if offset >= int(data["total"]):
            break 
    
    return constructors 

def fetch_rounds():

    rounds = []
    start_year = 2011
    curr_year = datetime.now().year

    while start_year < curr_year:
        TEMP_ROUND_URL = f"{BASE_URL}/{str(start_year)}/races.json"
        
        response = requests.get(TEMP_ROUND_URL)
        response.raise_for_status()
        data = response.json()["MRData"]
        batch = data["RaceTable"]["Races"]
        rounds.extend([RoundModel(**r) for r in batch])

        start_year += 1
        
    return rounds


def insert_circuits(conn, circuits: list[CircuitModel]) -> None:
    for c in circuits:
        conn.execute(
            """
            INSERT INTO bronze.circuits
                (api_id, name, locality, country, latitude, longitude, wikipedia)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (api_id) DO NOTHING
            """,
            (
                c.circuitId,
                c.circuitName,
                c.Location.locality,
                c.Location.country,
                float(c.Location.lat) if c.Location.lat else None,
                float(c.Location.long) if c.Location.long else None,
                c.url,
            ),
        )
    conn.commit()


def insert_drivers(conn, drivers: list[DriverModel]) -> None:
    for d in drivers:
        conn.execute(
            """
            INSERT INTO bronze.drivers
                (api_id, permanent_car_number, abbreviation, forename, surname,
                 date_of_birth, nationality, wikipedia)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (api_id) DO NOTHING
            """,
            (
                d.driverId,
                int(d.permanentNumber) if d.permanentNumber else None,
                d.code,
                d.givenName,
                d.familyName,
                d.dateOfBirth,
                d.nationality,
                d.url,
            ),
        )
    conn.commit()

def insert_seasons(conn, seasons: list[SeasonModel]) -> None:
    for s in seasons:
        conn.execute(
            """
            INSERT INTO bronze.season (api_id, year, wikipedia)
            VALUES (%s, %s, %s)
            ON CONFLICT (api_id) DO NOTHING
            """,
            (
                s.season,
                int(s.season),
                s.url,
            ),
        )
    conn.commit()

def ingest_constructor(conn, constructors: list[TeamModel]) -> None: 

    for team in constructors:
        conn.execute("""
            INSERT INTO bronze.team(api_id, name, nationality, wikipedia)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (api_id) DO NOTHING
            """,
            (
                team.constructorId,
                team.name,
                team.nationality, 
                team.url
            )
        )
    
    conn.commit() 


def ingest_rounds(conn, rounds: list[RoundModel]) -> None:
      for r in rounds:
          conn.execute(
              """
              INSERT INTO bronze.round
                  (season_id, circuit_id, api_id, number, name, date, is_cancelled)
              VALUES (
                  (SELECT id FROM bronze.season WHERE api_id = %s),
                  (SELECT id FROM bronze.circuits WHERE api_id = %s),
                  %s, %s, %s, %s, %s
              )
              ON CONFLICT (api_id) DO NOTHING
              """,
              (
                  r.season,                      # → lookup bronze.season.id,
                  r.Circuit.circuitId,           # → lookup bronze.circuits.id,
                  f"{r.season}_{r.round}",       # api_id e.g. "2011/15"
                  int(r.round),                  # number
                  r.raceName,                    # name
                  r.date,                        # date
                  False,                         # is_cancelled
              ),
          )
      conn.commit()

