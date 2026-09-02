from botocore.utils import validate_region_name
import asyncio
from aiobotocore.session import get_session
from core.database import get_connection 
import os 
from dotenv import load_dotenv 


load_dotenv()
TELEMETRY_SQS=os.environ["telemetry_sqs_url"]

async def upsert_data(): 
    
    with get_connection() as conn: 
        conn.execute("""
        """)

    conn.close()


async def consumer(): 
    session = get_session() 
    async with session.get_client("sqs", region_name="us-east-1") as sqs: 

        while True: 
            response = await sqs.recieve_messages(
                QueueUrl = TELEMETRY_SQS, 
                MaxNumberOfMessages=10, 
                WaitTimeSeconds=20, 
                AttributeNames=["ALL"] 
            )

            messages = response.get("Messages", [])


            await sqs.delete_message(
                QueueUrl=TELEMETRY_SQS,
                # ReceiptHandle= 
            )
                

        

def handler(events, messages):
    asyncio.run(consumer())