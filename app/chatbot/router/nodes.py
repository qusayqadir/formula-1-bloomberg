import os

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic

from app.chatbot.router.prompts import ROUTER_SYSTEM_PROMPT
from app.chatbot.router.schemas import RouteDecision
from app.chatbot.core.models import analysis_model
from app.chatbot.router.state import RouterState


load_dotenv()


model_name = os.getenv("ANTHROPIC_MODEL")

if not model_name:
    raise RuntimeError(
        "ANTHROPIC_MODEL is missing from the .env file."
    )


router_model = ChatAnthropic(
    model=model_name,
    max_tokens=500,
)


structured_router = router_model.with_structured_output(
    RouteDecision
)