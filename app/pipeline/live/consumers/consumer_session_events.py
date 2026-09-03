from botocore.utils import validate_region_name
import asyncio
from aiobotocore.session import get_session
from core.database import get_connection 
import os 
from dotenv import load_dotenv 
import json 


load_dotenv()
SESSION_SQS=os.environ["sessoin_sqs_url"]

def _process(conn, body): 
    

def handler(event, context=None): 

    conn = _get_conn() 
    failures = [] 
    
    for record in event.get("Records", []): 
        message_id = record.get("messageId")
        try: 
            body = json.load(record.get("body")) 
            _process(conn, body) 
            conn.commit() 
         
        except Exception: 
            try: 
                conn.rollback() 
            except Exception: 
                _reset_conn() 
                conn = _get_conn() 
                if message_id: 
                    failures.append({
                        "itemIdentifier": message_id
                    })