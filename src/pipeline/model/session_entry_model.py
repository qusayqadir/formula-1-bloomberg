from pydantic import BaseModel
from typing import Optional

from pipeline.model.driver_model import DriverModel
from pipeline.model.team_model import TeamModel


class ResultTime(BaseModel):
    millis: Optional[str] = None
    time: Optional[str] = None  # e.g. "1:37:45.503" → stored as INTERVAL in DB


class FastestLapTime(BaseModel):
    time: Optional[str] = None


class FastestLap(BaseModel):
    rank: Optional[str] = None
    lap: Optional[str] = None
    Time: Optional[FastestLapTime] = None


class SessionEntryModel(BaseModel):
    """
    status values: "Finished", "+1 Lap", "Engine", "Accident", etc.
    """
    number: Optional[str] = None           
    position: Optional[str] = None         
    positionText: Optional[str] = None     # "R" (retired), "D" (DSQ), "W" (withdrew)
    points: Optional[str] = None           
    Driver: DriverModel                    # → FK resolved to bronze.drivers at insert
    Constructor: TeamModel                 # → FK resolved to bronze.team at insert
    grid: Optional[str] = None             
    laps: Optional[str] = None             
    status: Optional[str] = None          
    Time: Optional[ResultTime] = None      
    FastestLap: Optional[FastestLap] = None  
