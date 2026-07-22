from typing import Literal
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
import voyageai

from core.database import (
    get_mongo_connection
)

import os
import gridfs
from dotenv import load_dotenv
import requests
import json
load_dotenv()

#determine which season, and regulation type 
def analyze_query(state: AgentState) -> AgentState:

    structured_model = analysis_model.with_structured_output(RetrievedDocumentMetadata)

    docs=structured_model.invoke(
        [
            SystemMessage(
                content=REGULATION_QUERY_ANAYLSIS_PROMPT, 
            ),
            HumanMessage(
                content=state["user_query"]
            )
        ]
    )

    return {
        "doc_metadata": {
            "filename": docs.filename,
            "season" : docs.season, 
            "regulation_type": docs.regulation_type,
            "section_type": docs.section_type, 
            "section_number": docs.section_number 
        }
    }


def retrieve_docs(state: AgentState): 

    vo = voyageai.Client()

    result = vo.contextualized_embed(
        inputs=[state["user_query"]],
        model="votage-context-3",
        input_type="query",
        output_dimension=1024,
    )
    query_embedding = result.results[0].embeddings

    mongodb_client = get_mongo_connection()
    db = mongodb_client[os.environ["MONGODB_DATABASE_NAME"]]

    db["regulation_embeddings"].aggregate([
        {
            "$vectorSearch": {
                "index" : "vector_index", 
                "path" : "voyage_embedding",
                "queryVector": query_embedding,
                "num"
            }
        },
        {

        }
    ])

    

    # if direct article_refernces then lookup 
    
    #else hybrid search 

    return 

def rerank_docs(state: AgentState):

    reranker_url = "https://api.voyageai.com/v1/rerank"
    headers = {
        "Authorizatoin" : f"Bearer {bearer_token}",
        "Content-type" : "applicatoin/json"
    }

    payload = retrieve_docs()

    response = requests.post(
        url=reranker_url, 
        headers=headers,
        json=payload 
    )

    response.raise_for_status()
    response_data = response.json()

    return {
        "doc_id": 
    }


    #corss-encoder rerank 

def validate_retrieval(state: AgentState) -> AgentState:

def generate_response(user_query: str, state: AgentState) -> AgentState:

def validate_response(state: AgentState) -> Literal["Yes_Valid", "Search_Again"]:


    if state["regulation_response_confidence"] < 0.70: 
        return "Search_Again"
    
    return "Yes_Valid"


def respond(state: AgentState) -> AgentState: 