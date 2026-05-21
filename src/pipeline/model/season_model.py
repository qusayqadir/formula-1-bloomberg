from pydantic import BaseModel
from typing import Optional


class SeasonModel(BaseModel):
    season: str                    
    url: Optional[str] = None       
