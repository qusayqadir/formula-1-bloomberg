from app.chatbot.regulation.prompt import REGULATION_SYSTEM_PROMPT
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

from langchain_core.vectorstores import InMemoryVectorStore
from functools import lru_cache 

def anaylze_query():

    find_docs = anaylsis_model.with_structured_data(RetrievedDocumentMetadata)

def retrieve_docs(user_query: str, state: AgentState) -> AgentState: 

    # if direct article_refernces then lookup 
    
    #else hybrid search 
    
    find_docs = analysis_model.with_structured_data(RetrievedDocumentMetadata)

def rerank_docks():

    #corss-encoder rerank 

def validate_retrieval():

def generate_response():

def validate_response():


    