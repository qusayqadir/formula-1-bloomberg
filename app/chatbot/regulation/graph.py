from langgraph.graph import(
    START,
    END, 
    StateGraph
)
from app.chatbot.regulation.nodes import (
    analyze_query,
    retrieve_docs,
    rerank_docs,
    validate_retrieval,
    generate_response,
    validate_response
)




def build_regulation_graph():

    builder = StateGraph() 
    builder.add_edge()
    builder.add_conditional_edges()


regulation_graph = build_regulation_graph()