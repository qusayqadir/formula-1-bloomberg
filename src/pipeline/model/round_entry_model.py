from pydantic import BaseModel
from typing import Optional


class RoundEntryModel(BaseModel):
    season: str
    round: str          # → FK to bronze.round.number + season
    driverId: str       # → FK to bronze.team_driver via driver + constructor + season
    constructorId: str
    carNumber: Optional[str] = None  
