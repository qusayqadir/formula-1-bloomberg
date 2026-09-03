import asyncio
import json
import logging
import os
import ssl

import aiomqtt
#async http endpoints
import httpx
import psycopg
from aiobotocore.session import get_session
from dotenv import load_dotenv

from core.database import get_connection

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

# car data? 270 ms per driver, do i need all the telemetry? 
# how do i change websocket subscription based off the filters of hte frontend? 

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


# car_data is the firehose (~74 msg/s for 20 cars); we only forward it for the drivers
# the user has focused, read from bronze.live_focus_selection. location stays full (all cars,
# for the track map). Empty/absent selection for a session -> no car_data forwarded.
FOCUS_REFRESH_SECONDS = 10
focus: dict[int, set[int]] = {}  # session_key -> {driver_number, ...}

_focus_conn: "psycopg.Connection | None" = None


def _get_focus_conn() -> psycopg.Connection:
    global _focus_conn
    if _focus_conn is None or _focus_conn.closed:
        _focus_conn = get_connection()
    return _focus_conn


def _reset_focus_conn() -> None:
    global _focus_conn
    if _focus_conn is not None and not _focus_conn.closed:
        try:
            _focus_conn.close()
        except Exception:
            pass
    _focus_conn = None


def _load_focus() -> dict[int, set[int]]:
    """Sync Postgres read of the current focus selection (runs off the event loop)."""
    try:
        conn = _get_focus_conn()
        rows = conn.execute(
            "SELECT session_key, driver_numbers FROM bronze.live_focus_selection"
        ).fetchall()
        conn.rollback()  # end the read txn without holding it open
        return {row["session_key"]: set(row["driver_numbers"] or ()) for row in rows}
    except Exception:
        _reset_focus_conn()
        raise


async def focus_refresher() -> None:
    """Refresh the in-memory focus map from bronze.live_focus_selection every ~10s."""
    global focus
    while True:
        try:
            focus = await asyncio.to_thread(_load_focus)
        except Exception:
            logger.exception("focus refresh failed; keeping previous selection")
        await asyncio.sleep(FOCUS_REFRESH_SECONDS)


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

                    topic = str(message.topic)
                    queue = TOPIC_BUCKET.get(topic)
                    if queue is None:
                        continue
                    #raw bytes that come from the websocket
                    payload = message.payload.decode()

                    # car_data is the firehose: only forward focused drivers. Everything
                    # else (incl. v1/location for the full track map) passes through.
                    if topic == "v1/car_data":
                        try:
                            body = json.loads(payload)
                            if body["driver_number"] not in focus.get(body["session_key"], set()):
                                continue
                        except (json.JSONDecodeError, KeyError):
                            logger.warning("dropping malformed car_data payload")
                            continue

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
            focus_refresher(),
            producer(buffer),
            dispatcher(buffer, sqs),
        )


if __name__ == "__main__":
    asyncio.run(main())
