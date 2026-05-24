from copyreg import constructor
from math import e
import os
from sqlite3 import Time
import time
from tkinter import INSERT
import requests
from datetime import datetime

from models import (
    CircuitModel,
    DriverModel,
    SessionEntryModel,
    TeamModel,
    TeamDriverModel,
    TeamChampionshipModel,
    DriverChampionshipModel,
    SeasonModel,
    RoundModel,
    RoundEntryModel,
    SessionModel,
)

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

def fetch_rounds() -> list[RoundModel]:

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

def _get_with_retry(url: str, params: dict = None, retries: int = 3, backoff: float = 5.0):
    """GET with exponential backoff on 429. Sleeps 0.5s between every request."""
    time.sleep(0.5)
    for attempt in range(retries):
        response = requests.get(url, params=params)
        if response.status_code == 429:
            wait = backoff * (2 ** attempt)
            print(f"Rate limited. Waiting {wait}s before retry {attempt + 1}/{retries}...")
            time.sleep(wait)
            continue
        response.raise_for_status()
        return response
    response.raise_for_status()  # raise after all retries exhausted
    return response


def fetch_race_results() -> tuple[list[TeamDriverModel], list[RoundEntryModel], list[SessionEntryModel]]:
    seen_drivers = set()
    team_drivers = []
    round_entries = []
    session_entries = []

    for year in range(2011, datetime.now().year):
        offset=0
        limit=100
        while True:
            response = _get_with_retry(f"{BASE_URL}/{year}/results.json", params={"limit": limit, "offset": offset})
            response.raise_for_status()
            data=response.json()["MRData"]

            for race in data["RaceTable"]["Races"]:
                season = race["season"]
                round_number = race["round"]
                round_api_id = f"{season}_{round_number}"

                for race_result in race["Results"]:
                    driver_id = race_result["Driver"]["driverId"]
                    constructor_id = race_result["Constructor"]["constructorId"]
                   
                    raw_number = race_result.get("number")
                    car_number = int(raw_number) if raw_number else None

                    raw_pos = race_result.get("position")
                    position_number = int(raw_pos) if raw_pos else None 

                    pos_text = race_result.get("positionText")
                    
                    raw_points = race_result.get("points")
                    points = float(raw_points) if raw_points else None  # float: 0.5 bonus possible

                    raw_grid = race_result.get("grid")
                    grid_pos = int(raw_grid) if raw_grid else None

                    raw_laps = race_result.get("laps")
                    laps = int(raw_laps) if raw_laps else None

                    status = race_result.get("status")

                    # "Time" key absent for DNFs, or present with "" — both become None
                    race_time = race_result.get("Time", {}).get("time") or None

                    # "FastestLap" absent for some drivers/years — safe .get() chain
                    fastest_lap_data = race_result.get("FastestLap", {})
                    fastest_lap_time = fastest_lap_data.get("Time", {}).get("time") or None
                    raw_fastest_lap_rank = fastest_lap_data.get("rank")
                    fastest_lap_rank = int(raw_fastest_lap_rank) if raw_fastest_lap_rank else None

                    round_entry_api_id = f"{season}_{round_number}_{driver_id}_{constructor_id}"
                    session_api_id = f"{season}_{round_number}_Race"

                    round_entries.append(
                        RoundEntryModel(
                            round_api_id=round_api_id,
                            season=season,
                            driver_id=driver_id,
                            constructor_id=constructor_id,
                            car_number=car_number,
                        )
                    )

                    session_entries.append(
                        SessionEntryModel(
                            round_entry_api_id=round_entry_api_id,
                            session_api_id=session_api_id,
                            position=position_number,
                            positionText=pos_text,
                            points=points,
                            grid=grid_pos,
                            laps_completed=laps,
                            status=status,
                            race_time=race_time,
                            fastest_lap_time=fastest_lap_time,
                            fastest_lap_rank=fastest_lap_rank,
                        )
                    )

                    key = (season, driver_id, constructor_id)

                    # dont want to duplicate drivers that have raced for the same team in every race or season 
                    # but need to go through every race because drivers can be replaced sometimes for injury, contract termination, junior promoted 
                    if key not in seen_drivers: 
                        seen_drivers.add(key)
                        team_drivers.append(TeamDriverModel(driverId=driver_id, constructorId=constructor_id, season=season))

            offset += limit 
            if offset >= int(data["total"]):
                break 
    
    return team_drivers, round_entries, session_entries

def fetch_constructor_standings() -> list[TeamChampionshipModel]: 
    constructor_standings=[]
    limit = 100 
    offset = 0 
    while True: 
        for year in range(2011, datetime.now().year): 
            
            response=requests.get(f"{BASE_URL}/{year}/constructorstandings.json", params={"limit":limit, "offset":offset})
            response.raise_for_status() 
            batch = response.json()["MRData"] 




            constructor_standings.extend(
                TeamChampionshipModel(
                    round_api_id=,
                    year="",
                    round_number=,
                    session_number="",
                    position="",
                    points=,
                    win_count=, 
                    highest_finish=,
                    adjustment_type=
                )
            )


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
                  f"{r.season}_{r.round}",       # api_id e.g. "2011_15"
                  int(r.round),                  # number
                  r.raceName,                    # name
                  r.date,                        # date
                  False,                         # is_cancelled
              ),
          )
      conn.commit()

def insert_team_drivers(conn, team_drivers: list[TeamDriverModel]) -> None: 
    
    for driver in team_drivers: 
        conn.execute("""
            INSERT INTO bronze.team_driver
            (team_id, driver_id, season_id, api_id, role)
            VALUES (
                (SELECT id FROM bronze.team WHERE api_id = %s),
                (SELECT id FROM bronze.drivers WHERE api_id = %s),
                (SELECT id FROM bronze.season WHERE api_id = %s),
                %s, %s
            )
            ON CONFLICT (api_id) DO NOTHING
            """,
            (
                driver.constructorId,
                driver.driverId,
                driver.season,
                driver.api_id,
                driver.role,
            )
        )
    conn.commit()


def insert_round_entries(conn, round_entries: list[RoundEntryModel]) -> None:
    for entry in round_entries:
        conn.execute(
            """
            INSERT INTO bronze.round_entry (round_id, team_driver_id, api_id, car_number)
            VALUES (
                (SELECT id FROM bronze.round       WHERE api_id = %s),
                (SELECT id FROM bronze.team_driver WHERE api_id = %s),
                %s, %s
            )
            ON CONFLICT (api_id) DO NOTHING
            """,
            (
                entry.round_api_id,
                entry.team_driver_api_id,
                entry.api_id,
                entry.car_number,
            ),
        )
    conn.commit()

def insert_session_entries(conn, session_entries: list[SessionEntryModel]) -> None:
    for se in session_entries:
        conn.execute(
            """
            INSERT INTO bronze.session_entry
                (session_id, round_entry_id, api_id, position, status, points,
                 grid, time, fastest_lap_rank, laps_completed)
            VALUES (
                (SELECT id FROM bronze.session     WHERE api_id = %s),
                (SELECT id FROM bronze.round_entry WHERE api_id = %s),
                %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (api_id) DO NOTHING
            """,
            (
                se.session_api_id,
                se.round_entry_api_id,
                se.api_id,
                se.position,
                se.status,
                se.points,
                se.grid,
                se.race_time,
                se.fastest_lap_rank,
                se.laps_completed,
            ),
        )
    conn.commit()