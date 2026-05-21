from pydantic import BaseModel
from typing import Optional

from pipeline.model.team_model import TeamModel


class TeamChampionshipModel(BaseModel):

    position: Optional[str] = None      
    positionText: Optional[str] = None
    points: str                        
    wins: str                          
    Constructor: TeamModel              
