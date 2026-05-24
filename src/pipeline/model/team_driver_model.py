from pydantic import BaseModel, computed_field
from typing import Optional


class TeamDriverModel(BaseModel):
    """
    role: 0 = Permanent, 1 = Reserve, 2 = Junior
    """
    driverId: str       #  FK to bronze.drivers.api_id
    constructorId: str  #  FK to bronze.team.api_id
    season: str         #  FK to bronze.season.year
    role: Optional[int] = 0  

    @computed_field
    def api_id(self) -> str:
        return f"{self.season}_{self.driverId}_{self.constructorId}"
