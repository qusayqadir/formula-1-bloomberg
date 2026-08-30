"""Live F1 prediction-market snapshot, sourced from Polymarket's public
Gamma + CLOB APIs (no API key required). Unlike every other router here,
this doesn't touch Postgres — it proxies and reshapes an external API."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import requests

from app.pipeline.live.polymarket_client import (
    combine_event_data,
    fetch_price_histories,
    find_recently_closed_events,
    find_top_events,
    top_markets_per_event,
)

router = APIRouter(prefix="/markets", tags=["markets"])


class MarketPricePoint(BaseModel):
    t: int
    yes_price: float


class MarketSeries(BaseModel):
    market_id: str
    outcome_label: str
    yes_price: float
    no_price: float
    volume: float
    liquidity: float
    price_history: list[MarketPricePoint]


class Event(BaseModel):
    event_id: str
    event_title: str
    event_volume: float
    event_liquidity: float
    expiry: str | None
    status: str
    markets: list[MarketSeries]


class MarketsResponse(BaseModel):
    events: list[Event]


@router.get("/polymarket", response_model=MarketsResponse)
def polymarket_markets(
    event_limit: int = Query(20, ge=1, le=25, description="Events to return, ranked by volume"),
    markets_per_event: int = Query(
        4, ge=1, le=10, description="Max candidate markets (outcomes) per event, ranked by volume"
    ),
):
    """Top active Polymarket F1 events by volume, each carrying its top
    `markets_per_event` candidate markets (e.g. the leading drivers in "F1
    Drivers' Champion") with yes-price history — one widget per event, one
    line per candidate, mirroring Polymarket's own event chart. Backfilled
    with the most recently expired events when there aren't `event_limit`
    live ones, so the page always fills out."""
    try:
        events = find_top_events(event_limit=event_limit)
        if len(events) < event_limit:
            events = events + find_recently_closed_events(limit=event_limit - len(events))
        if not events:
            return {"events": []}

        events_with_markets = top_markets_per_event(events, markets_per_event=markets_per_event)
        price_chart = fetch_price_histories(events_with_markets)
        combined = combine_event_data(events_with_markets, price_chart)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Polymarket API unreachable: {exc}") from exc

    return {"events": combined}
