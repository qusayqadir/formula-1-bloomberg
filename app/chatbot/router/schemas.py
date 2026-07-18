#what shape the LLM needs to response and adhere too
from typing import Literal
from pydantic import BaseModel, Field



ReglationTypes = Literal[
    "TECHNICAL",
    "FINANCIAL_TEAM",
    "FINANCIAL_PU_MANUFACTURERS",
    "OPERATIONAL",
    "SPORTING"
]

class RegulationQueryAnalysis(BaseModel): 

    