from pydantic import BaseModel
from datetime import date
from typing import Optional

class Location(BaseModel):
    lat: str
    long: str
    locality: str
    country: str


class CircuitModel(BaseModel):
    circuitId: str
    circuitName: str
    Location: Location
    url: Optional[str] = None