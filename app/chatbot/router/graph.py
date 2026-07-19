from langgraph.graph import (
    START,
    END,
    StateGraph
)
from app.chatbot.state import AgentState
from app.chatbot.router.nodes import (
    classify_domain,
    chosen_route
)


def build_route_graph(): 
    
    builder = StateGraph(AgentState) 

    builder.add_node(
        "classify_domain",
        classify_domain,
    )

    builder.add_edge(
        START, 
        "classify_domain"
    )

    builder.add_edge(
        "classify_domain",
        END
    )

    return builder.compile()


router_graph = build_route_graph()
# g = router_graph.get_graph()
# open("graph.png", "wb").write(g.draw_mermaid_png())