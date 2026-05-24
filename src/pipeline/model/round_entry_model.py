from pydantic import BaseModel, computed_field
from typing import Optional


class RoundEntryModel(BaseModel):
    round_api_id: str   # e.g. "2011_15"  → FK lookup on bronze.round.api_id
    season: str         # e.g. "2011"     → part of team_driver api_id
    driver_id: str      # e.g. "hamilton" → part of team_driver api_id
    constructor_id: str # e.g. "mercedes" → part of team_driver api_id
    car_number: Optional[int] = None

    @computed_field
    def team_driver_api_id(self) -> str:
        """Matches the api_id built by TeamDriverModel."""
        return f"{self.season}_{self.driver_id}_{self.constructor_id}"

    @computed_field
    def api_id(self) -> str:
        return f"{self.round_api_id}_{self.driver_id}_{self.constructor_id}"
