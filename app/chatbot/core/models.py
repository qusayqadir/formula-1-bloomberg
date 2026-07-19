from langchain_anthropic import ChatAnthropic

def make_model(
    model: str,
    temp: float,
    max_tokens: int,
    timeout: float | None = None,
    max_retries: int = 2,
) -> ChatAnthropic:
    return ChatAnthropic(
        model=model,
        temperature=temp,
        max_tokens=max_tokens,
        timeout=timeout,
        max_retries=max_retries,
    )


answer_model = make_model("claude-sonnet-5", temp=0.4, max_tokens=3000, max_retries=3)
analysis_model = make_model("claude-haiku-4-5", temp=0.4, max_tokens=1000)
