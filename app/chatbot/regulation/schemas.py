from pydantic import BaseModel 



class RetrievedDocumentMetadata(BaseModel): 
    document_id: str
    title: str
    articles: str
    text: str
    score: float

