from pydantic import BaseModel
from typing import Optional


class TeamModel(BaseModel):
    constructorId: str              
    name: str                       
    nationality: Optional[str] = None  
    url: Optional[str] = None      
