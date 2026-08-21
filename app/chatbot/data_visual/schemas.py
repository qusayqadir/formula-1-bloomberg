from pydantic import BaseModel

class GenerateResponse(BaseModel): 
    answer: str 
    confidence: float
    
class ValidationResponse(BaseModel):
    is_valid: bool
    confidence: float
    reason: str


class ReWriteQuery(BaseModel):
    new_query: str


