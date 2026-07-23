from multiprocessing import context
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
    RetrievedDocumentMetadata,
    RegulationAnswer,
)
import voyageai

from core.database import (
    get_mongo_connection
)

import os
from dotenv import load_dotenv

from pymongo import MongoClient

load_dotenv()

#determine which season, and regulation type 

vo = voyageai.Client()
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

    result = vo.contextualized_embed(
        inputs=[[state["user_query"]]],
        model="voyage-context-3",
        input_type="query",
        output_dimension=1024,
    )
    query_vector = result.results[0].embeddings[0]

    mongodb_client = get_mongo_connection()
    db = mongodb_client[os.environ["MONGODB_DATABASE_NAME"]]
    #regulatoin is a collection of docs 
    cursor = db["regulation_embeddings"].aggregate([
        {
            "$vectorSearch": {
                "index" : "vector_index",
                "path" : "voyage_embedding",
                "queryVector": query_vector,
                "numCandidates": 50,
                "filter" : {
                    "metadata.season" : state["doc_metadata"]["season"],
                    "metadata.filename" : state["doc_metadata"]["filename"] ,
                    "metadata.regulation_type" :  state["doc_metadata"]["regulation_type"],
                    "metadata.section_type" : state["doc_metadata"]["section_type"] ,
                    "metadata.section_number" :  state["doc_metadata"]["section_number"] ,
                }
            }
        },
        {
            "$project": {
                "_id": 1,
                "text": 1,
                "score": {"$meta": "vectorSearchScore"}
            }
        }
    ])

    return {
        "retrieved_docs" : list(cursor)
    }

def rerank_docs(state: AgentState):

    docs = state["retrieved_docs"]

    reranked = vo.rerank(
        query=state["user_query"],
        documents=[d["text"] for d in docs],
        model="rerank-2.5-lite",
        top_k=20,
    )

    return {
        "reranked_docs": [docs[r.index] for r in reranked.results]
    }

def generate_response(state: AgentState) -> AgentState:
    
    context = "\n\n---\n\n".join(d["text"] for d in state["reranked_docs"])

    structured_model = answer_model.with_structured_output(RegulationAnswer)

    agent_response = structured_model.invoke(
        [
            SystemMessage(
                content=REGULATION_SYSTEM_PROMPT
            ),
            HumanMessage(
                content=f"Context:\n{context}\n\nQuestion:\n{state['user_query']}"
                ),
        ]
    )
    return {
        "regulation_response": agent_response.answer,
        "regulation_response_confidence": agent_response.confidence,
    }

def validate_response(state: AgentState) -> Literal["Yes_Valid", "Search_Again"]:


    if state["regulation_response_confidence"] < 0.70: 
        return "Search_Again"
    
    return "Yes_Valid"


def respond(state: AgentState) -> AgentState: 