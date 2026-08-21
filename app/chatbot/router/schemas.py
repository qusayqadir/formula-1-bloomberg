#what shape the LLM needs to response and adhere too
from pydantic import BaseModel
from app.chatbot.state import RouteName



class RouteDecision(BaseModel): 
    route: RouteName 
    confidence: float
    route_reason: str