from ast import Index
from typing import Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel, computed_field


# ── Core Entities ──────────────────────────────────────────────────────────────

class SeasonModel(BaseModel):
    season: str
    url: Optional[str] = None


class Location(BaseModel):
    lat: str
    long: str
    locality: Optional[str] = None
    country: Optional[str] = None


class CircuitModel(BaseModel):
    circuitId: str          
    circuitName: str      
    Location: Location    
    url: Optional[str] = None  


class TeamModel(BaseModel):
    constructorId: str
    name: str
    nationality: Optional[str] = None
    url: Optional[str] = None


class DriverModel(BaseModel):
    driverId: str
    permanentNumber: Optional[str] = None
    code: Optional[str] = None
    givenName: str
    familyName: str
    dateOfBirth: Optional[date] = None
    nationality: Optional[str] = None
    url: Optional[str] = None


# ── Race Structure ─────────────────────────────────────────────────────────────

class SessionSchedule(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None


class RoundModel(BaseModel):

    season: str
    round: str
    raceName: str
    Circuit: CircuitModel
    date: Optional[str] = None
    url: Optional[str] = None
    time: Optional[str] = None                       # race start time (UTC)
    # Embedded session schedules → each becomes a row in bronze.session
    FirstPractice: Optional[SessionSchedule] = None
    SecondPractice: Optional[SessionSchedule] = None
    ThirdPractice: Optional[SessionSchedule] = None
    Qualifying: Optional[SessionSchedule] = None
    Sprint: Optional[SessionSchedule] = None
    SprintQualifying: Optional[SessionSchedule] = None


class RoundEntryModel(BaseModel):
    round_api_id: str    
    season: str         
    driver_id: str       
    constructor_id: str  #
    car_number: Optional[int] = None

    @computed_field
    def team_driver_api_id(self) -> str:
      
        return f"{self.season}_{self.driver_id}_{self.constructor_id}"

    @computed_field
    def api_id(self) -> str:
        return f"{self.round_api_id}_{self.driver_id}_{self.constructor_id}"


class SessionModel(BaseModel):

    round_api_id: str                        
    type: str                                # "Race" | "Qualifying" | "FP1" | "FP2" | "FP3" | "Sprint" | "SprintQualifying"
    scheduled_at: Optional[datetime] = None
    is_cancelled: bool = False


class SessionEntryModel(BaseModel):

    round_entry_api_id: str         
    session_api_id: str            

    position: Optional[int] = None
    positionText: Optional[str] = None
    points: Optional[float] = None   
    grid: Optional[int] = None
    laps_completed: Optional[int] = None
    status: Optional[str] = None
    race_time: Optional[str] = None          
    fastest_lap_time: Optional[str] = None  
    fastest_lap_rank: Optional[int] = None

    @computed_field
    def api_id(self) -> str:
        # session_api_id is e.g. "2011_1_Race" — extract the type from the end
        session_type = self.session_api_id.rsplit("_", 1)[-1]
        return f"{self.round_entry_api_id}_{session_type}"


class LapModel(BaseModel): 

    session_api_id: str
    lap_number: int
    driver: str
    driver_pos: Optional[int] = None
    lap_time: Optional[str] = None

    @computed_field
    def lap_time_seconds(self) -> Optional[float]:
        if not self.lap_time:
            return None
        try:
            min_str, sec_str = self.lap_time.split(":")
            minutes = int(min_str)
            seconds = float(sec_str)
            return (minutes * 60 )  + seconds
        except (ValueError, IndexError):
            return None

    @computed_field 
    def api_id(self) ->str: 
        return f"{self.session_api_id}_{self.driver}_{self.lap_number}"



class PitStopModel(BaseModel):

    session_api_id: str

    lap_api_id: str

    driver: str
    pitstop_number: Optional[int] = None
    duration: Optional[str] = None

    @computed_field
    def duration_seconds(self) -> Optional[float]:
        if not self.duration:
            return None
        try:
            return float(self.duration)
        except ValueError:
            return None


    @computed_field
    def api_id(self) -> str:
        return f"{self.session_api_id}_{self.driver}_{self.pitstop_number}"





# ── Championship ───────────────────────────────────────────────────────────────

class TeamDriverModel(BaseModel):
    """
    role: 0 = Permanent, 1 = Reserve, 2 = Junior
    """
    driverId: str       # FK to bronze.drivers.api_id
    constructorId: str  # FK to bronze.team.api_id
    season: str         # FK to bronze.season.year
    role: Optional[int] = 0

    @computed_field
    def api_id(self) -> str:
        return f"{self.season}_{self.driverId}_{self.constructorId}"


class TeamChampionshipModel(BaseModel):
    team_api_id: str
    season_api_id: str
    round_api_id: str
    year: int
    round_number: int
    position: Optional[int] = None
    points: float        # float: handles 0.5 bonus points
    win_count: int

    @computed_field
    def api_id(self) -> str:
        # e.g. "2023_5_red_bull"
        return f"{self.round_api_id}_{self.team_api_id}"


class DriverChampionshipModel(BaseModel):
    driver_api_id: str
    season_api_id: str
    round_api_id: str
    year: int
    round_number: int
    position: Optional[int] = None
    points: float        # float: handles 0.5 bonus points
    wins: int

    @computed_field
    def api_id(self) -> str:
        # e.g. "2023_5_max_verstappen"
        return f"{self.round_api_id}_{self.driver_api_id}"

