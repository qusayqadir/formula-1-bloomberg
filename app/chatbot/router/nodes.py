from app.chatbot.router.prompts import ROUTER_SYSTEM_PROMPT
from langchain_core.messages import HumanMessage, SystemMessage

from app.chatbot.router.schemas import RouteDecision
from app.chatbot.core.models import analysis_model
from app.chatbot.state import AgentState

def classify_domain(state: AgentState) -> AgentState: 
    
    structured_model = analysis_model.with_structured_output(RouteDecision)

    decision = structured_model.invoke(
        [
            SystemMessage(
                content=ROUTER_SYSTEM_PROMPT
            ),
            HumanMessage(
                content=state["user_query"]
            )
        ]
    )

    return {
        "route": decision.route,
        "route_confidence": decision.confidence,
        "route_reason": decision.route_reason
    }

def chosen_route(state: AgentState) -> str: 

    route = state.get("route")
    if not route:
        raise ValueError(
            "No route was set by classify_domain"
        )
    
    return route 