from app.chatbot import regulation
from langgraph.graph import (
    START, 
    END, 
    StateGraph
)

from app.chatbot.state import AgentState
from app.chatbot.router.graph import router_graph
from app.chatbot.regulation.graph import regulation_graph
# from app.chatbot.data_visual.graph import data_visual_graph

# from app.chatbot.regulation.nodes import (

# )

# from app.chatbot.data_visual.nodes import (

# )




def build_terminal_chat(): 

    builder = StateGraph(AgentState)

    builder.add_node(
        "router",
        router_graph,
    )

    builder.add_node(
        "regulation",
        regulation_graph,
    )

    builder.add_edge(
        START,
        "router"
    )

    builder.add_edge(
        "router",
        "regulation"
    )

    builder.add_edge(
        "regulation",
        END
    )

    # builder.add_conditional_edges(
    #     "router",
    #     chosen_route, 
    #     {"REGULATION" : regulation_subgraph, 
    #     "VISUALIZATOIN": visualization_subgraph, 
    #     "OUT_OF_SCOPE": END
    #     }
    # )

    return builder.compile()


terminal_chat = build_terminal_chat() 
g = terminal_chat.get_graph()
open("final-chat-graph.png", "wb").write(g.draw_mermaid_png())
