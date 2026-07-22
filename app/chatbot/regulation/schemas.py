from pydantic import BaseModel 
from app.chatbot.state import RetrievedDocument


class RetrievedDocumentMetadata(BaseModel): 
    filename: str
    season: str
    regulation_type: str 
    section_type: str | None = None 
    section_number : str | None = None 

    
