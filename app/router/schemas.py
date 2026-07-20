"""Pydantic response schemas.

Every field maps 1:1 to a column produced by the migrations in
core/alembic/versions/ (schema `bronze`) — no invented fields.
"""
# `date` is aliased: Round has a field literally named `date`, and a bare
# `date` annotation would resolve to that field (NoneType) instead of the type
from datetime import date as date_type, datetime, timedelta
from enum import Enum
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    total: int
    limit: int
    offset: int
    items: list[T]


class SessionType(str, Enum):
    FP1 = "FP1"
    FP2 = "FP2"
    FP3 = "FP3"
    QUALIFYING = "Qualifying"
    RACE = "Race"
    SPRINT = "Sprint"
    SPRINT_QUALIFYING = "SprintQualifying"


# ── bronze.drivers ─────────────────────────────────────────────────────────

class Driver(BaseModel):
    id: int
    api_id: str
    reference: Optional[str] = None
    forename: str
    surname: str
    abbreviation: Optional[str] = None
    permanent_car_number: Optional[int] = None
    date_of_birth: Optional[date_type] = None
    nationality: Optional[str] = None
    country_code: Optional[str] = None
    wikipedia: Optional[str] = None


# ── bronze.circuits ────────────────────────────────────────────────────────

class Circuit(BaseModel):
    id: int
    api_id: str
    reference: Optional[str] = None
    name: str
    locality: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    wikipedia: Optional[str] = None
    track_length: Optional[float] = None
    turns: Optional[int] = None
    race_laps: Optional[int] = None
    lap_record_s: Optional[float] = None
    record_holder: Optional[str] = None
    track_type: Optional[str] = None
    drs_zones: Optional[int] = None
    elevation_gain: Optional[int] = None


# ── bronze.team ────────────────────────────────────────────────────────────

class Team(BaseModel):
    id: int
    api_id: str
    name: str
    nationality: Optional[str] = None
    country_code: Optional[str] = None
    primary_color: Optional[str] = None
    wikipedia: Optional[str] = None


# ── bronze.season ──────────────────────────────────────────────────────────

class Season(BaseModel):
    id: int
    api_id: str
    year: int
    wikipedia: Optional[str] = None
    round_count: int  # derived: COUNT(bronze.round) for the season


# ── bronze.round (joined with season year + circuit name) ─────────────────

class Round(BaseModel):
    id: int
    api_id: str
    season_id: int
    year: int
    circuit_id: int
    circuit_name: str
    number: Optional[int] = None
    name: Optional[str] = None
    date: Optional[date_type] = None
    is_cancelled: Optional[bool] = None


# ── bronze.session ─────────────────────────────────────────────────────────

class Session(BaseModel):
    id: int
    api_id: str
    round_id: int
    type: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    is_cancelled: Optional[bool] = None


# ── bronze.team_driver (joined) ────────────────────────────────────────────

class TeamDriver(BaseModel):
    id: int
    api_id: str
    season_id: int
    year: int
    team_id: int
    team_name: str
    driver_id: int
    driver_forename: str
    driver_surname: str


# ── bronze.round_entry (joined) ────────────────────────────────────────────

class RoundEntry(BaseModel):
    id: int
    api_id: str
    round_id: int
    car_number: Optional[int] = None
    driver_id: int
    driver_forename: str
    driver_surname: str
    team_id: int
    team_name: str


# ── bronze.session_entry (joined result row) ──────────────────────────────

class SessionResult(BaseModel):
    id: int
    api_id: str
    session_id: int
    session_type: Optional[str] = None
    round_id: int
    round_name: Optional[str] = None
    year: int
    round_number: Optional[int] = None
    circuit_id: int
    circuit_name: str
    driver_id: int
    driver_forename: str
    driver_surname: str
    driver_abbreviation: Optional[str] = None
    team_id: int
    team_name: str
    car_number: Optional[int] = None
    position: Optional[int] = None
    position_text: Optional[str] = None
    is_classified: Optional[bool] = None
    status: Optional[str] = None
    detail: Optional[str] = None
    points: Optional[float] = None
    is_eligible_for_points: Optional[bool] = None
    grid: Optional[int] = None
    fastest_lap_time: Optional[timedelta] = None
    fastest_lap_rank: Optional[int] = None
    laps_completed: Optional[int] = None
    # derived: grid - position (NULL when either side is missing or grid is 0/pit-lane)
    positions_gained: Optional[int] = None
    # derived: fastest_lap_time minus the session's overall fastest lap
    fastest_lap_gap: Optional[timedelta] = None


# ── bronze.driver_championship / bronze.team_championship ─────────────────

class DriverStanding(BaseModel):
    id: int
    api_id: Optional[str] = None
    year: int
    round_number: int
    driver_id: int
    driver_forename: str
    driver_surname: str
    position: Optional[int] = None
    points: float
    win_count: int
    highest_finish: Optional[int] = None
    is_eligible: Optional[bool] = None
    adjustment_type: Optional[int] = None


class ConstructorStanding(BaseModel):
    id: int
    api_id: Optional[str] = None
    year: int
    round_number: int
    team_id: int
    team_name: str
    position: Optional[int] = None
    points: float
    win_count: int
    highest_finish: Optional[int] = None
    is_eligible: Optional[bool] = None
    adjustment_type: Optional[int] = None


# ── filter metadata for the dashboard ──────────────────────────────────────

class FilterOptions(BaseModel):
    years: list[int]                 # seasons that actually have rounds
    session_types: list[str]
    driver_nationalities: list[str]
    team_nationalities: list[str]
    circuit_countries: list[str]
