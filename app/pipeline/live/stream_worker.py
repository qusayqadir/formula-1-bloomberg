import asyncio
from aiobotocore.session import get_session
import json 
import websockets
import os 
from dotenv import load_dotenv

load_dotenv()

SESSION_SQS=os.environ["sessoin_sqs_url"]
TELEMETRY_SQS=os.environ["telemetry_sqs_url"]
TIMINGS_SQS=os.environ["timings_sqs_url"]

consumer_sqs = { 
    "session_events" : SESSION_SQS, 
    "telemetry" : TELEMETRY_SQS, 
    "timings" : TIMINGS_SQS,
}

async def producer(source_uri: str, topic: str, buffer: asyncio.Queue): 
    async with websockets.connect(source_uri) as websocket:
        async for response in websocket: 
            message = json.load(response)
            message["topic"] = topic 
                        
            await buffer.put(json.dumps(message))
            

async def dispatcher(buffer: asyncio.Queue, sqs): 

    while True: 
        record = await buffer.get()
        await sqs.send_message(
            QueueUrl = consumer_sqs[buffer["topic"]],
            MessageBody = record
        )

async def main(): 

    #in memory queue ?
    buffer = asyncio.Queue(maxsize=10000)
    session = get_session() 
    async with session.create_client("sqs", regoin_name="us-east-1") as sqs: 
        asyncio.gather(
            producer( LIVE_STINT_URI, "session_events", buffer), 
            producer( LIVE_PIT_URI, "session_events", buffer), 
            producer( LIVE_LOCATION_URI, "session_events", buffer), 
            producer( LIVE_POSITION_URI, "session_events", buffer), 
            producer( LIVE_RACE_CONTROL_URI, "session_events", buffer), 
            producer( LIVE_OVERTAKE_URI, "session_events", buffer), 
            producer( LIVE_OVERTAKE_URI, "session_events", buffer), 
            producer( LIVE_WEATHER_URI, "session_events", buffer), 

            # all the cars? or just the driver i want to see? 
            producer( LIVE_CAR_DATA_URI, "telemetry", buffer), 

            producer( LIVE_INTERVAL_URI, "timings", buffer),
            producer( LIVE_LAP_URI, "timings", buffer),

            dispatcher(buffer, sqs)
        )

if __name__ == "__main__": 
    asyncio.run(main)