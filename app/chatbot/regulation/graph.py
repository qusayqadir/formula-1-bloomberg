from langgraph.graph import(
    START,
    END, 
    StateGraph
)
from app.chatbot.state import AgentState
from app.chatbot.regulation.nodes import (
    analyze_query,
    retrieve_docs,
    rerank_docs,
    generate_response,
    validate_response,
    rewrite_query,
    chosen_route, 
    respond 
)




def build_regulation_graph():

    builder = StateGraph(AgentState)

    builder.add_node("analyze_query", analyze_query)
    builder.add_node("retrieve_docs", retrieve_docs)
    builder.add_node("rerank_docs", rerank_docs)
    builder.add_node("generate_response", generate_response)
    builder.add_node("validate_response", validate_response)
    builder.add_node("rewrite_query", rewrite_query)
    builder.add_node("respond", respond)

    builder.add_edge(
        START,
        "analyze_query"
    )

    builder.add_edge(
     "analyze_query", 
     "retrieve_docs"   
    )
    
    builder.add_edge(
        "retrieve_docs",
        "rerank_docs"
    )

    builder.add_edge(
        "rerank_docs",
        "generate_response"
    )   

    builder.add_edge(
        "generate_response",
        "validate_response"
    )

    builder.add_conditional_edges(
        "validate_response",
        chosen_route, 
        {                     
            "respond": "respond",
            "rewrite_query": "rewrite_query",
        },
    )

    builder.add_edge(
        "rewrite_query",
        "analyze_query"
    )

    builder.add_edge(
        "respond",
        END 
    )

    return builder.compile()


regulation_graph = build_regulation_graph()
g = regulation_graph.get_graph()
open("graph.png", "wb").write(g.draw_mermaid_png())