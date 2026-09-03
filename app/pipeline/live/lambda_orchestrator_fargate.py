import aiomqtt 
import httpx 
import asyncio
import os 
import ssl 
from dotenv import load_dotenv
import json

load_dotenv()

openf1_token_username = os.environ["openf1_username"]
openf1_token_password = os.environ["openf1_password"]

def _run_fargate_task(): 
    return None 

def _stop_fargate_task():
    return None 

async def openf1_healthcheck(): 

    async with httpx.AsyncClient(timeout=10) as httpx: 
        response  = await httpx.post(
            "https://api.openf1.org/token",
            data={
                "username": openf1_token_username, 
                "password": openf1_token_password
            }
        )

        token  = response.json()["access_token"] 

    
    async with aiomqtt.Client(
        hostname="mqtt.openf1.org",
        port=8883,
        username=openf1_token_username,
        password=token,
        tls_context=ssl.create_default_context(),
    ) as client:
        await client.subscribe("v1/healthcheck") 


        async for message in client.messages: 
            payload = message.payload.decode() 
            if payload: 
                _run_fargate_task() 
            else: 
                _stop_fargate_task()


def handlers(event, context=None): 
    asyncio.run(openf1_healthcheck()) 