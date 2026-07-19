from dotenv import load_dotenv

load_dotenv()

from app.chatbot.router.graph import router_graph


def main() -> None: 

    while True: 
        message=input("You: ").strip()
        if not message or message.lower() in ("exit", "quit"):
            break 

        result = router_graph.invoke(
            {
                "user_query": message
            }
        )
        
        print(f"route={result.get('route')} "
              f"confidence={result.get('route_confidence')} "
              f"reason={result.get('route_reason')}")


if __name__ == "__main__":
    main()