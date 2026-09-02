# Polymarket Gamma (search) + CLOB (price history) client for F1 prediction
# markets. No API key required — both endpoints are Polymarket's public
# open market-data API.
#
import json
import os
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv()

MAX_HISTORY_POINTS = 60
CLOB_BATCH_LIMIT = 20
CLOSED_HISTORY_WINDOW_DAYS = 15
GAMMA_F1_TAG_IDS = (100389, 435)


def _fetch_tagged_events(
    *, active: bool | None = None, closed: bool | None = None, order: str | None = None,
    ascending: bool | None = None, limit: int = 200,
) -> list[dict]:
    url = f"{os.getenv('POLYMARKET_BASE_GAMMA_API')}/events"

    params: list[tuple[str, str]] = [("tag_id", str(tid)) for tid in GAMMA_F1_TAG_IDS]
    params.append(("limit", str(limit)))
    if active is not None:
        params.append(("active", "true" if active else "false"))
    if closed is not None:
        params.append(("closed", "true" if closed else "false"))
    if order:
        params.append(("order", order))
    if ascending is not None:
        params.append(("ascending", "true" if ascending else "false"))

    response = requests.get(url, params=params)
    response.raise_for_status()

    # /events returns a bare JSON array, unlike /public-search's {"events": [...]}.
    return response.json()


def _dedupe_by_id(events: list[dict]) -> dict[str, dict]:
    events_by_id: dict[str, dict] = {}
    for event in events:
        event_id = event.get("id")
        if event_id is not None and event_id not in events_by_id:
            events_by_id[event_id] = event
    return events_by_id


def find_top_events(event_limit: int = 15) -> list[tuple[dict, list[dict]]]:
    events_by_id = _dedupe_by_id(_fetch_tagged_events(active=True, closed=False))

    valid_events = []
    for event in events_by_id.values():
        active_markets = [
            market for market in event.get("markets", []) if market.get("active") and not market.get("closed")
        ]
        if active_markets:
            valid_events.append((event, active_markets))

    valid_events.sort(key=lambda item: float(item[0].get("volume") or 0), reverse=True)

    return valid_events[:event_limit]


def find_recently_closed_events(limit: int) -> list[tuple[dict, list[dict]]]:

    if limit <= 0:
        return []

    events_by_id = _dedupe_by_id(
        _fetch_tagged_events(closed=True, order="endDate", ascending=False, limit=max(limit * 3, 50))
    )

    valid_events = [
        (event, event["markets"]) for event in events_by_id.values() if event.get("closed") and event.get("markets")
    ]
    valid_events.sort(key=lambda item: item[0].get("endDate") or "", reverse=True)

    return valid_events[:limit]


def _normalize_market(market: dict) -> dict:
    outcomes = json.loads(market.get("outcomes") or "[]")
    outcome_prices = json.loads(market.get("outcomePrices") or "[]")
    token_ids = json.loads(market.get("clobTokenIds") or "[]")

    yes_index = outcomes.index("Yes") if "Yes" in outcomes else 0
    yes_price = round(float(outcome_prices[yes_index]) * 100, 2) if outcome_prices else 0.0

    return {
        "market_id": market.get("id"),
        "outcome_label": market.get("groupItemTitle") or "Yes",
        "yes_token_id": token_ids[yes_index] if token_ids else None,
        "yes_price": yes_price,
        "no_price": round(100 - yes_price, 2),
        "volume": float(market.get("volumeNum") or 0),
        "liquidity": float(market.get("liquidityNum") or 0),
        "expiry": market.get("endDate"),
    }


def top_markets_per_event(events: list[tuple[dict, list[dict]]], markets_per_event: int = 4) -> list[dict]:
    results = []
    for event, active_markets in events:
        normalized = sorted(
            (_normalize_market(m) for m in active_markets),
            key=lambda m: m["yes_price"],
            reverse=True,
        )
        top = normalized[:markets_per_event]

        results.append({
            "event_id": event.get("id"),
            "event_title": event.get("title"),
            "event_volume": float(event.get("volume") or 0),
            "event_liquidity": float(event.get("liquidity") or 0),
            "expiry": top[0]["expiry"] if top else None,
            "status": "closed" if event.get("closed") else "active",
            "markets": top,
        })

    return results


def _chunked(items: list, size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def batch_price_history(token_ids: list[str]) -> dict:
    if not token_ids:
        return {}

    url = f"{os.getenv('POLYMARKET_BASE_CLOB_API')}/batch-prices-history"
    history: dict[str, list[dict]] = {}

    for chunk in _chunked(token_ids, CLOB_BATCH_LIMIT):
        response = requests.post(url, json={"markets": chunk, "interval": "max"})
        response.raise_for_status()
        history.update(response.json().get("history", {}))

    return history


def closed_market_price_history(token_id: str, expiry: str | None) -> list[dict]:
    if expiry:
        end_dt = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
    else:
        end_dt = datetime.now(timezone.utc)
    end_ts = int(end_dt.timestamp())
    start_ts = end_ts - CLOSED_HISTORY_WINDOW_DAYS * 24 * 60 * 60

    url = f"{os.getenv('POLYMARKET_BASE_CLOB_API')}/prices-history"
    response = requests.get(url, params={"market": token_id, "startTs": start_ts, "endTs": end_ts, "fidelity": 60})
    response.raise_for_status()
    return response.json().get("history", [])


def fetch_price_histories(events_with_markets: list[dict]) -> dict:

    active_tokens = [
        m["yes_token_id"]
        for e in events_with_markets
        if e["status"] == "active"
        for m in e["markets"]
        if m["yes_token_id"]
    ]
    history = batch_price_history(active_tokens)

    for e in events_with_markets:
        if e["status"] != "closed":
            continue
        for m in e["markets"]:
            if m["yes_token_id"]:
                history[m["yes_token_id"]] = closed_market_price_history(m["yes_token_id"], m["expiry"])

    return history


def _downsample(history: list[dict], max_points: int = MAX_HISTORY_POINTS) -> list[dict]:
    if len(history) <= max_points:
        return history
    step = len(history) / max_points
    indices = sorted({round(i * step) for i in range(max_points)})
    indices[-1] = len(history) - 1
    return [history[i] for i in indices]


def combine_event_data(events: list[dict], price_chart: dict) -> list[dict]:
    combined = []

    for event in events:
        markets = []
        for market in event["markets"]:
            history = _downsample(price_chart.get(market["yes_token_id"], []))
            markets.append({
                "market_id": market["market_id"],
                "outcome_label": market["outcome_label"],
                "yes_price": market["yes_price"],
                "no_price": market["no_price"],
                "volume": market["volume"],
                "liquidity": market["liquidity"],
                "price_history": [
                    {"t": point["t"], "yes_price": round(float(point["p"]) * 100, 2)}
                    for point in history
                ],
            })
        markets.sort(key=lambda m: m["yes_price"], reverse=True)

        combined.append({
            "event_id": event["event_id"],
            "event_title": event["event_title"],
            "event_volume": event["event_volume"],
            "event_liquidity": event["event_liquidity"],
            "expiry": event["expiry"],
            "status": event["status"],
            "markets": markets,
        })

    return combined
