from anthropic import Anthropic 
from dotenv import load_dotenv
load_dotenv()


client = Anthropic()

message = client.messages.create(
    model="claude-haiku-4-5-20251001",
    max_tokens=1000,
    messages=[{
        "role" : "user",
        "content" : "who are you"
    }],
    temperature=1.0
)

print(message.content[0].text)