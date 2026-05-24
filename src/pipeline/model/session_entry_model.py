from pydantic import BaseModel, computed_field
from typing import Optional


class SessionEntryModel(BaseModel):
    """
    One row per driver per session (Race, Qualifying, FP1, …).
    Time values are raw strings from the API (e.g. "1:37:45.503").
    Nullable columns are expected — DNFs have no race_time, most drivers
    have no fastest_lap_time, etc.

    status values: "Finished", "+1 Lap", "Engine", "Accident", "Disqualified", etc.
    positionText: "1"–"20", "R" (retired), "D" (DSQ), "W" (withdrew), "N" (not classified)
    """
    round_entry_api_id: str         # FK lookup → bronze.round_entry.api_id
    session_api_id: str             # FK lookup → bronze.session.api_id

    position: Optional[int] = None
    positionText: Optional[str] = None
    points: Optional[float] = None  # float: fastest-lap bonus is 0.5 in some seasons
    grid: Optional[int] = None
    laps_completed: Optional[int] = None
    status: Optional[str] = None
    race_time: Optional[str] = None         # finish time, e.g. "1:37:45.503"
    fastest_lap_time: Optional[str] = None  # e.g. "1:21.441"
    fastest_lap_rank: Optional[int] = None

    @computed_field
    def api_id(self) -> str:
        # session_api_id is e.g. "2011_1_Race" — extract the type from the end
        session_type = self.session_api_id.rsplit("_", 1)[-1]
        return f"{self.round_entry_api_id}_{session_type}"