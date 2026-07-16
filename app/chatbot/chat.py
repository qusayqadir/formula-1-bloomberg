import os

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic


load_dotenv()


def main() -> None:
    model_name = os.getenv("ANTHROPIC_MODEL")

    if not model_name:
        raise RuntimeError(
            "Add ANTHROPIC_MODEL to your .env file."
        )

    model = ChatAnthropic(
        model=model_name
    )

    print("F1 chatbot test")
    print("Type 'exit' to stop.\n")

    while True:
        message = input("You: ").strip()

        if message.lower() in {"exit", "quit"}:
            break

        if not message:
            continue

        response = model.invoke(message)

        print(f"\nAssistant: {response.content}\n")


if __name__ == "__main__":
    main()

