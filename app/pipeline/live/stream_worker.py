import asyncio
import logging
import os
import ssl

import aiomqtt
#async http endpoints
import httpx
from aiobotocore.session import get_session
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SESSION_SQS = os.environ["sessoin_sqs_url"]
TELEMETRY_SQS = os.environ["telemetry_sqs_url"]
TIMINGS_SQS = os.environ["timings_sqs_url"]

# internal bucket -> SQS queue url
BUCKET_SQS = {
    "session_events": SESSION_SQS,
    "telemetry": TELEMETRY_SQS,
    "timings": TIMINGS_SQS,
}

TOPIC_BUCKET: dict[str, str] = {
    "v1/laps": "timings",
    "v1/intervals": "timings",
    "v1/position" : "timings",

    "v1/car_data": "telemetry",
    "v1/location": "telemetry",
    
    "v1/stints": "session_events",
    "v1/pit": "session_events",
    "v1/race_control": "session_events",
    "v1/overtakes": "session_events",
    "v1/weather": "session_events",
    "v1/sessions": "session_events",
}


openf1_token_username = os.environ["openf1_username"]
openf1_token_password = os.environ["openf1_password"]


async def get_access_token() -> str:
    
    async with httpx.AsyncClient(timeout=10) as http:
        resp = await http.post(
            "https://api.openf1.org/token",
            data={
                "username": openf1_token_username, 
                "password": openf1_token_password
            }
        )
    
        resp.raise_for_status()
    
        return resp.json()["access_token"]


async def producer(buffer: asyncio.Queue) -> None:
    backoff = 1
    while True:
        try:
            token = await get_access_token() 
            async with aiomqtt.Client(
                hostname="mqtt.openf1.org",
                port=8883,
                username=openf1_token_username,
                password=token,
                tls_context=ssl.create_default_context(),
            ) as client:
                for topic in TOPIC_BUCKET.keys():
                    await client.subscribe(topic)
                
                logger.info("subscribed to %d OpenF1 topics", len(TOPIC_BUCKET))
                backoff = 1  
                
                async for message in client.messages:
                    
                    queue = TOPIC_BUCKET.get(str(message.topic))
                    if queue is None:
                        continue
                    #raw bytes that come from the websocket 
                    payload = message.payload.decode()
                    await buffer.put((queue, payload))
                    
        except aiomqtt.MqttError as exc:
            logger.warning("MQTT connection dropped (%s); reconnecting in %ss", exc, backoff)
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 30)
        


async def dispatcher(buffer: asyncio.Queue, sqs) -> None:
    while True:
        queue, payload = await buffer.get()
        try:
            await sqs.send_message(QueueUrl=BUCKET_SQS[queue], MessageBody=payload)
        except Exception:
            logger.exception("failed to enqueue message for bucket %s", queue)
        finally:
            buffer.task_done()


async def main() -> None:
    buffer: asyncio.Queue = asyncio.Queue(maxsize=10000)
    session = get_session()
    async with session.create_client("sqs", region_name="us-east-1") as sqs:
        await asyncio.gather(
            producer(buffer),
            dispatcher(buffer, sqs),
        )


if __name__ == "__main__":
    asyncio.run(main())
