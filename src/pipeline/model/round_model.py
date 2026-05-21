from pydantic import BaseModel
from typing import Optional

from pipeline.model.circuit_model import CircuitModel


class SessionSchedule(BaseModel):
    """Date/time of a session embedded inside a Race object."""
    date: Optional[str] = None
    time: Optional[str] = None


class RoundModel(BaseModel):
    """
    (FP1, Quali, Race, etc.) populate bronze.session.
    """
    season: str                                     
    round: str                                      
    raceName: str                                   
    Circuit: CircuitModel                          
    date: Optional[str] = None                      
    url: Optional[str] = None
    time: Optional[str] = None                      # race start time (UTC)
    # Embedded session schedules → each becomes a row in bronze.session
    FirstPractice: Optional[SessionSchedule] = None
    SecondPractice: Optional[SessionSchedule] = None
    ThirdPractice: Optional[SessionSchedule] = None
    Qualifying: Optional[SessionSchedule] = None
    Sprint: Optional[SessionSchedule] = None
    SprintQualifying: Optional[SessionSchedule] = None
