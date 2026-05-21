from pydantic import BaseModel
from typing import Optional


class Location(BaseModel):
    lat: str
    long: str
    locality: Optional[str] = None
    country: Optional[str] = None


class CircuitModel(BaseModel):
    """Validates a single Circuit object from the Ergast /circuits.json endpoint."""
    circuitId: str          # → bronze.circuits.api_id
    circuitName: str        # → bronze.circuits.name
    Location: Location      # → latitude, longitude, locality, country
    url: Optional[str] = None  # → bronze.circuits.wikipedia
