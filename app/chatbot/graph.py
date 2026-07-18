from langgraph.graph import (
    START, 
    END, 
    StateGraph
)

from app.chatbot.state import AgentState


def build_terminal_chat(): 

    builder = StateGraph(AgentState)



    return builder.compile()


terminal_chat = build_terminal_chat() 
