from pydantic import BaseModel
from typing import Optional


class TeamDriverModel(BaseModel):
    """
    role: 0 = Permanent, 1 = Reserve, 2 = Junior
    """
    driverId: str       #  FK to bronze.drivers.api_id
    constructorId: str  #  FK to bronze.team.api_id
    season: str         #  FK to bronze.season.year
    role: Optional[int] = 0  
