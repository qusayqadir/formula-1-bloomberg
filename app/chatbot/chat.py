import asyncio
import uuid

from dotenv import load_dotenv

from app.chatbot.graph import terminal_chat

load_dotenv()


async def main() -> None:
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in {"exit", "quit"}:
            break
        if not user_input:
            continue

        response = await terminal_chat.ainvoke({"user_query": user_input}, config=config)
        print(f"Assistant: {response['final_answer']}\n")


if __name__ == "__main__":
    asyncio.run(main())
