from pydantic import BaseModel
from datetime import date
from typing import Optional

class DriverModel(BaseModel):
    driverId: str
    permanentNumber: Optional[str] = None
    code: Optional[str] = None
    givenName: str
    familyName: str
    dateOfBirth: Optional[date] = None
    nationality: Optional[str] = None
    url: Optional[str] = None
