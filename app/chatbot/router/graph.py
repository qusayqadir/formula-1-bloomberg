from langgraph.graph import (
    START,
    END,
    StateGraph
)

from app.chatbot.state import AgentState


def build_regulation_graph(): 
    
    builder = StateGraph(AgentState) 

    return builder.compile()


regulation_graph = build_regulation_graph()