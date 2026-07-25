from typing import Literal
from pydantic import BaseModel


# Exact regulation_type vocabulary stored at ingest time
# (app/pipeline/ingest/upload_regulation_docs_mongodb.py::SECTION_TYPES).
RegulationType = Literal[
    "general_provisioning",
    "sporting",
    "technical",
    "financial_f1_teams",
    "financial_pu_manufacturers",
    "operational",
]


class RetrievedDocumentMetadata(BaseModel):
    filename: str | None = None
    season: str | None = None
    regulation_type: list[RegulationType] = []
    section_type: Literal["ARTICLE", "APPENDIX"] | None = None
    
    
    # Section identifier following the type, e.g. "C3" (pattern [A-F]\d+).
    section_number: str | None = None


class RegulationAnswer(BaseModel):
    answer: str
    confidence: float


class ValidationResponse(BaseModel):
    is_valid: bool
    confidence: float
    reason: str


class ReWriteQuery(BaseModel):
    new_query: str
