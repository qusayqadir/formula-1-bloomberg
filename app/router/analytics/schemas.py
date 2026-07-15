"""Response schemas for the analytical dataset endpoints.

These are reusable dataset shapes (series, aggregate rows, comparisons),
deliberately independent of any particular chart or frontend library.
"""
from datetime import timedelta
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel


# ── shared building blocks ─────────────────────────────────────────────────

class DriverRef(BaseModel):
    id: int
    forename: str
    surname: str
    abbreviation: Optional[str] = None


class TeamRef(BaseModel):
    id: int
    name: str
    primary_color: Optional[str] = None


# ── championship progression (drivers + teams) ─────────────────────────────

class ChampionshipPoint(BaseModel):
    round_id: Optional[int] = None
    round_number: int
    round_name: Optional[str] = None
    position: Optional[int] = None
    points: float
    win_count: int
    highest_finish: Optional[int] = None
    is_eligible: Optional[bool] = None
    # derived: points minus points at the previous snapshot (first round = points)
    points_gained: float
    # derived: distance to the highest points total at that round
    gap_to_leader: float


class DriverChampionshipSeries(BaseModel):
    entity: DriverRef
    values: list[ChampionshipPoint]


class TeamChampionshipSeries(BaseModel):
    entity: TeamRef
    values: list[ChampionshipPoint]


class DriverChampionshipProgression(BaseModel):
    metadata: dict[str, Any]
    series: list[DriverChampionshipSeries]


class TeamChampionshipProgression(BaseModel):
    metadata: dict[str, Any]
    series: list[TeamChampionshipSeries]


# ── aggregate summaries ────────────────────────────────────────────────────

class DriverGroupBy(str, Enum):
    DRIVER = "driver"
    DRIVER_SEASON = "driver_season"
    DRIVER_CIRCUIT = "driver_circuit"


class TeamGroupBy(str, Enum):
    TEAM = "team"
    TEAM_SEASON = "team_season"
    TEAM_CIRCUIT = "team_circuit"
    TEAM_DRIVER = "team_driver"  # per-season driver contribution to team points


class CircuitGroupBy(str, Enum):
    CIRCUIT = "circuit"
    CIRCUIT_DRIVER = "circuit_driver"
    CIRCUIT_TEAM = "circuit_team"


class ResultAggregates(BaseModel):
    """Aggregates over session_entry rows — shared by all summary datasets."""
    starts: int
    total_points: Optional[float] = None
    avg_points: Optional[float] = None
    wins: int
    podiums: int
    avg_finish: Optional[float] = None
    median_finish: Optional[float] = None
    best_finish: Optional[int] = None
    worst_finish: Optional[int] = None
    finish_stddev: Optional[float] = None
    avg_grid: Optional[float] = None
    best_grid: Optional[int] = None
    avg_positions_gained: Optional[float] = None
    avg_fastest_lap_rank: Optional[float] = None
    total_laps_completed: Optional[int] = None
    avg_laps_completed: Optional[float] = None
    classification_rate: Optional[float] = None


class DriverSummaryRow(ResultAggregates):
    driver: DriverRef
    year: Optional[int] = None       # present when grouped by season
    circuit_id: Optional[int] = None  # present when grouped by circuit
    circuit_name: Optional[str] = None


class TeamSummaryRow(ResultAggregates):
    team: TeamRef
    year: Optional[int] = None
    circuit_id: Optional[int] = None
    circuit_name: Optional[str] = None
    driver: Optional[DriverRef] = None           # present for team_driver grouping
    share_of_team_points: Optional[float] = None  # driver points / team points, same group


class CircuitSummaryRow(ResultAggregates):
    circuit_id: int
    circuit_name: str
    country: Optional[str] = None
    country_code: Optional[str] = None
    locality: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    events: int  # distinct rounds included
    driver: Optional[DriverRef] = None
    team: Optional[TeamRef] = None


class SummaryResponse(BaseModel):
    metadata: dict[str, Any]
    rows: list[DriverSummaryRow]


class TeamSummaryResponse(BaseModel):
    metadata: dict[str, Any]
    rows: list[TeamSummaryRow]


class CircuitSummaryResponse(BaseModel):
    metadata: dict[str, Any]
    rows: list[CircuitSummaryRow]


# ── circuit racecraft (pole conversion / processionality) ──────────────────

class CircuitRacecraftRow(BaseModel):
    """Per-circuit grid→finish dynamics over the filtered window."""
    circuit_id: int
    circuit_name: str
    country_code: Optional[str] = None
    races: int
    pole_starts: int
    pole_wins: int
    pole_win_rate: Optional[float] = None       # pole_wins / pole_starts
    front_row_wins: int
    front_row_win_rate: Optional[float] = None  # front_row_wins / races
    winner_avg_grid: Optional[float] = None
    avg_abs_position_change: Optional[float] = None  # classified finishers only


class CircuitRacecraftResponse(BaseModel):
    metadata: dict[str, Any]
    rows: list[CircuitRacecraftRow]


# ── grid → finish density (hex-binned start/finish field) ──────────────────

class GridFinishDensityRow(BaseModel):
    grid: int
    position: int
    count: int


class GridFinishDensityResponse(BaseModel):
    metadata: dict[str, Any]
    rows: list[GridFinishDensityRow]


# ── status distribution ────────────────────────────────────────────────────

class StatusDistributionRow(BaseModel):
    status: Optional[str] = None
    is_classified: Optional[bool] = None
    count: int
    driver: Optional[DriverRef] = None
    team: Optional[TeamRef] = None
    year: Optional[int] = None


class StatusDistributionResponse(BaseModel):
    metadata: dict[str, Any]
    rows: list[StatusDistributionRow]


class StatusGroupBy(str, Enum):
    NONE = "none"
    DRIVER = "driver"
    TEAM = "team"
    SEASON = "season"


# ── driver head-to-head ────────────────────────────────────────────────────

class HeadToHeadSessionRow(BaseModel):
    session_id: int
    session_type: Optional[str] = None
    year: int
    round_number: Optional[int] = None
    round_name: Optional[str] = None
    circuit_name: Optional[str] = None
    a_position: Optional[int] = None
    b_position: Optional[int] = None
    a_grid: Optional[int] = None
    b_grid: Optional[int] = None
    a_points: Optional[float] = None
    b_points: Optional[float] = None
    a_fastest_lap_rank: Optional[int] = None
    b_fastest_lap_rank: Optional[int] = None
    a_fastest_lap_time: Optional[timedelta] = None
    b_fastest_lap_time: Optional[timedelta] = None
    a_is_classified: Optional[bool] = None
    b_is_classified: Optional[bool] = None


class HeadToHeadTally(BaseModel):
    """Sessions where driver A beat driver B / B beat A, on one metric.

    Only sessions where both drivers have a value for the metric are counted.
    """
    a: int
    b: int


class HeadToHeadSummary(BaseModel):
    shared_sessions: int
    position: HeadToHeadTally
    grid: HeadToHeadTally
    fastest_lap_rank: HeadToHeadTally
    a_total_points: float
    b_total_points: float
    a_wins: int
    b_wins: int
    a_avg_finish: Optional[float] = None
    b_avg_finish: Optional[float] = None
    a_avg_grid: Optional[float] = None
    b_avg_grid: Optional[float] = None


class DriverHeadToHead(BaseModel):
    metadata: dict[str, Any]
    driver_a: DriverRef
    driver_b: DriverRef
    summary: HeadToHeadSummary
    rows: list[HeadToHeadSessionRow]
