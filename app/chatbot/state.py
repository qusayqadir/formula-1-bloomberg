from typing import Literal, TypedDict


RouteName = Literal[
    "REGULATION",
    "VISUALIZATION",
    "OUT_OF_SCOPE",
]

#total is false, when route begins you may only have {query: "(user quert)} the route later adds route, confidence, reason, and the final branch 
# adds response 
class RouterState(TypedDict, total=False):
    """
    Shared state passed between every node in the graph.

    total=False means fields may be added gradually as the graph runs.
    """

    query: str
    route: RouteName
    confidence: float
    reason: str
    response: str