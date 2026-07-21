from app.chatbot.regulation.prompt import (
    REGULATION_SYSTEM_PROMPT,
    REGULATION_QUERY_ANAYLSIS_PROMPT
) 
from langchain_core.messages import (
    SystemMessage,
    HumanMessage,
)
from app.chatbot.state import AgentState
from app.chatbot.core.models import (
    analysis_model, 
    answer_model, 
)

from app.chatbot.regulation.schemas import (
    RetrievedDocumentMetadata
)

def anaylze_query():

def retrieve_docs(user_query: str, state: AgentState) -> AgentState: 

    # if direct article_refernces then lookup 
    
    #else hybrid search 
    
    find_docs = analysis_model.with_structured_data(RetrievedDocumentMetadata)

def rerank_docks(state: AgentState) -> AgentState:

    #corss-encoder rerank 

def validate_retrieval(state: AgentState) -> AgentState:

def generate_response(user_query: str, state: AgentState) -> AgentState:


def validate_response():