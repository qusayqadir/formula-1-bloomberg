import asyncio
from aiobotocore.session import get_session
from core.database import get_connection 

async def proccess_message(events: list[dict]) -> None : 
    QUERUE_URL = "" 
    session = get_session()
    async with session.create_client("sqs", QUERUE_URL) as sqs_client: 
        await sqs_client.get_message()

# event is the message, and messages is the metadata of the message 
def handler(events, messages): 
    asyncio.run(proccess_message(events))