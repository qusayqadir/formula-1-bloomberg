V1 = "/api/v1"


def test_year_filter(client, year):
    body = client.get(f"{V1}/results", params={"year": year, "limit": 50}).json()
    assert body["total"] > 0
    assert all(r["year"] == year for r in body["items"])


def test_round_range_filter(client, year):
    body = client.get(
        f"{V1}/results",
        params={"year": year, "round_from": 2, "round_to": 4, "limit": 500},
    ).json()
    assert body["items"]
    assert all(2 <= r["round_number"] <= 4 for r in body["items"])


def test_multiple_driver_ids(client, year, two_driver_ids):
    a, b = two_driver_ids
    body = client.get(
        f"{V1}/results",
        params={"year": year, "driver_ids": [a, b], "session_type": "Race", "limit": 500},
    ).json()
    seen = {r["driver_id"] for r in body["items"]}
    assert seen == {a, b}


def test_positions_gained_derivation(client, year):
    rows = client.get(
        f"{V1}/results", params={"year": year, "session_type": "Race", "limit": 200}
    ).json()["items"]
    for r in rows:
        if r["grid"] and r["grid"] > 0 and r["position"] is not None:
            assert r["positions_gained"] == r["grid"] - r["position"]


def test_fastest_lap_gap_nonnegative(client, year):
    rows = client.get(
        f"{V1}/results", params={"year": year, "session_type": "Race", "limit": 200}
    ).json()["items"]
    gaps = [r["fastest_lap_gap"] for r in rows if r["fastest_lap_gap"] is not None]
    assert gaps, "expected some fastest lap gaps"
    # ISO 8601 durations from timedelta: negatives start with '-'
    assert all(not g.startswith("-") for g in gaps)


def test_empty_year_returns_empty_page(client):
    body = client.get(f"{V1}/results", params={"year": 1900}).json()
    assert body["total"] == 0 and body["items"] == []


def test_invalid_session_type_rejected(client):
    assert client.get(f"{V1}/results", params={"session_type": "bogus"}).status_code == 422


def test_unclassified_filter(client, year):
    body = client.get(
        f"{V1}/results",
        params={"year": year, "session_type": "Race", "is_classified": False, "limit": 500},
    ).json()
    assert all(r["is_classified"] is False for r in body["items"])
