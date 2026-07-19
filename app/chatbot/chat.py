from app.chatbot.graph import terminal_chat
from dotenv import load_dotenv
import os 

load_dotenv()

def main() -> None:


    print("F1 chatbot test")
    print("Type 'exit' to stop.\n")

    while True:
        message = input("You: ").strip()

        if message.lower() in {"exit", "quit"}:
            break

        if not message:
            continue

        response = terminal_chat.invoke(
            {
                "user_query" : message
            }
        )

        print(f"{response["final_answer"]}")


if __name__ == "__main__":
    main()

