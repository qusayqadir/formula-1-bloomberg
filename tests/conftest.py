"""Integration tests run against the ingested database (DATABASE_URL from .env).

The DB is read-only from the API's perspective, so tests discover real ids
dynamically instead of hard-coding fixture data.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def year(client):
    """A season that actually has ingested data."""
    years = client.get("/api/v1/meta/filters").json()["years"]
    assert years, "no ingested seasons — tests need a populated database"
    return years[-2] if len(years) > 1 else years[-1]


@pytest.fixture(scope="session")
def two_driver_ids(client, year):
    """Two drivers who raced in the same season (guaranteed shared sessions)."""
    standings = client.get(f"/api/v1/championships/drivers?year={year}").json()
    return standings[0]["driver_id"], standings[1]["driver_id"]
