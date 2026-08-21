from langgraph.graph import (
    START,
    END,
    StateGraph
)

from app.chatbot.state import AgentState
from app.chatbot.router.graph import router_graph
from app.chatbot.data_visual.graph import data_visual_graph
from app.chatbot.regulation.graph import regulation_graph

def out_of_scope_response(state: AgentState) -> AgentState:
    return {
        "final_answer": "I can help with Formula 1 regulations or data analysis questions. Please ask about F1 regulations (technical, financial, operational, or sporting) or questions that can be answered with historical F1 data."
    }

def build_terminal_chat():

    builder = StateGraph(AgentState)

    builder.add_node(
        "router",
        router_graph,
    )

    builder.add_node(
        "regulation_subgraph",
        regulation_graph,
    )
    builder.add_node(
        "data_visual_subgraph",
        data_visual_graph
    )
    builder.add_node(
        "out_of_scope",
        out_of_scope_response
    )

    builder.add_edge(
        START,
        "router"
    )

    builder.add_conditional_edges(
        "router",
        lambda state: state.get("route", "OUT_OF_SCOPE"),
        {
            "REGULATION": "regulation_subgraph",
            "VISUALIZATION": "data_visual_subgraph",
            "OUT_OF_SCOPE": "out_of_scope"
        }
    )

    builder.add_edge(
        "out_of_scope",
        END
    )

    return builder.compile()


terminal_chat = build_terminal_chat() 
g = terminal_chat.get_graph()
open("final-chat-graph.png", "wb").write(g.draw_mermaid_png())
