from fastapi import APIRouter
from pydantic import BaseModel
from app.chatbot.graph import terminal_chat

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


class ChatRequest(BaseModel):
    user_query: str


class ChatResponse(BaseModel):
    answer: str


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest) -> ChatResponse:
    """Process a user question through the terminal chat graph."""
    response = terminal_chat.invoke(
        {"user_query": request.user_query}
    )
    return ChatResponse(answer=response.get("final_answer", ""))
