from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SessionModel(BaseModel):
    """
    Represents a single resolved session row for bronze.session.
    Derived from a RoundModel — one Round produces N SessionModels
    (Race, Qualifying, FP1, FP2, FP3, Sprint, SprintQualifying).
    Not a direct API response — constructed in the ingest layer by
    expand_sessions(round: RoundModel) -> list[SessionModel].
    """
    round_api_id: str                   # → FK lookup against bronze.round.api_id
    type: str                           # "Race" | "Qualifying" | "FP1" | "FP2" | "FP3" | "Sprint" | "SprintQualifying"
    scheduled_at: Optional[datetime] = None  
    is_cancelled: bool = False

    