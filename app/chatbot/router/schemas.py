#what shape the LLM needs to response and adhere too
from typing import Literal
from pydantic import BaseModel, Field
from app.chatbot.state import RouteName



class RouteDecision(BaseModel): 
    route: RouteName 
    confidence: float
    route_reason: str