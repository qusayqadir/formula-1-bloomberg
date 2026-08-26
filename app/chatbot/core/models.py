from langchain_anthropic import ChatAnthropic
from typing import Optional

def make_model(
    model: str,
    max_tokens: int,
    timeout: float | None = None,
    max_retries: int = 2,
) -> ChatAnthropic:
    return ChatAnthropic(
        model=model,
        max_tokens=max_tokens,
        timeout=timeout,
        max_retries=max_retries,
    )


answer_model = make_model("claude-sonnet-5", max_tokens=3000, max_retries=3)
analysis_model = make_model("claude-haiku-4-5", max_tokens=1000)
