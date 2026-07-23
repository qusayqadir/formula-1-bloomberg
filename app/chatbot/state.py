from typing import Literal, TypedDict


RouteName = Literal[
    "REGULATION",
    "VISUALIZATION",
    "OUT_OF_SCOPE",
]

ReglationTypes = Literal[
    "TECHNICAL",
    "FINANCIAL_TEAM",
    "FINANCIAL_PU_MANUFACTURERS",
    "OPERATIONAL",
    "SPORTING"
]
#total is false, when route begins you may only have {query: "(user quert)} the route later adds route, confidence, reason, and the final branch 
# adds response 
class RouterState(TypedDict, total=False):
    """
    Shared state passed between every node in the graph.

    total=False means fields may be added gradually as the graph runs.
    """

    route: RouteName
    confidence: float
    reason: str
    response: str

class RetrievedDocument(TypedDict):
    
    filename: str 
    season: str
    regulation_type: str 
    section_type: str | None 
    section_number: str | None


# state is internal workflow memory 
class AgentState(TypedDict, total=False):

    user_query: str


    # Router Output
    route: RouteName
    route_confidence: float
    route_reason: str

    # Regulation Output
    doc_metadata: RetrievedDocument
    retrieved_docs: list[dict]
    reranked_docs: list[dict]
    regulation_response: str
    regulation_response_confidence: float

    #DataVis Output 

    #Output
    final_answer: str


     
