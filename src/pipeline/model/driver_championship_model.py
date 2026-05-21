from pydantic import BaseModel
from typing import Optional

from pipeline.model.driver_model import DriverModel
from pipeline.model.team_model import TeamModel


class DriverChampionshipModel(BaseModel):
    position: Optional[str] = None      
    positionText: Optional[str] = None
    points: str                         
    wins: str                           
    Driver: DriverModel                 
    Constructors: list[TeamModel]       
