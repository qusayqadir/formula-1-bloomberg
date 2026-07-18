import os

from langchain_anthropic import ChatAnthropic
from langgraph.graph import (
    START, 
    END, 
    StateGraph
)
from app.chatbot.core.models import answer_model


def main() -> None:

    client = answer_model

    print("F1 chatbot test")
    print("Type 'exit' to stop.\n")

    while True:
        message = input("You: ").strip()

        if message.lower() in {"exit", "quit"}:
            break

        if not message:
            continue

        response = client.invoke(message)

        print(f"\nAssistant: {response.content}\n")


if __name__ == "__main__":
    main()

