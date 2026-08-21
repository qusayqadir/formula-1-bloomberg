import os
from typing import Iterator


import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

from pymongo import MongoClient 

load_dotenv()


def get_database_url() -> str:
    return os.environ["DATABASE_URL"]


def get_connection(**kwargs) -> psycopg.Connection:
    # psycopg.connect expects a plain postgresql:// URL, not the
    # SQLAlchemy-style postgresql+psycopg:// used by Alembic
    return psycopg.connect(
        get_database_url().replace("postgresql+psycopg://", "postgresql://"),
        row_factory=dict_row,
        **kwargs,
    )


def get_db() -> Iterator[psycopg.Connection]:
    """FastAPI dependency: read-only connection with dict rows."""
    with get_connection() as conn:
        yield conn

def get_mongo_url() -> str: 
    return os.getenv("MONGODB_URI")

def get_mongo_connection(): 
    
    client = MongoClient(get_mongo_url())
    return client 