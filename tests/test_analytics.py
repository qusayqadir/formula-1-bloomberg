import math

V1 = "/api/v1/analytics"


# ── championship progression ───────────────────────────────────────────────

def test_driver_progression_shape(client, year):
    body = client.get(f"{V1}/championships/drivers/progression", params={"year": year}).json()
    assert body["metadata"]["year"] == year
    assert body["series"]
    for s in body["series"]:
        rounds = [v["round_number"] for v in s["values"]]
        assert rounds == sorted(rounds)


def test_points_gained_sums_to_final_points(client, year):
    body = client.get(f"{V1}/championships/drivers/progression", params={"year": year}).json()
    for s in body["series"]:
        # snapshots are cumulative: per-round gains must sum to the last total
        assert math.isclose(sum(v["points_gained"] for v in s["values"]),
                            s["values"][-1]["points"], abs_tol=1e-6)


def test_gap_to_leader_zero_for_leader(client, year):
    body = client.get(f"{V1}/championships/drivers/progression", params={"year": year}).json()
    last_round = max(v["round_number"] for s in body["series"] for v in s["values"])
    finals = [s["values"][-1] for s in body["series"]
              if s["values"][-1]["round_number"] == last_round]
    assert min(f["gap_to_leader"] for f in finals) == 0
    assert all(f["gap_to_leader"] >= 0 for f in finals)


def test_progression_round_and_driver_filters(client, year, two_driver_ids):
    a, _ = two_driver_ids
    body = client.get(
        f"{V1}/championships/drivers/progression",
        params={"year": year, "round_from": 3, "round_to": 5, "driver_ids": [a]},
    ).json()
    assert len(body["series"]) == 1
    assert body["series"][0]["entity"]["id"] == a
    assert all(3 <= v["round_number"] <= 5 for v in body["series"][0]["values"])


def test_progression_unknown_year_404(client):
    r = client.get(f"{V1}/championships/drivers/progression", params={"year": 1900})
    assert r.status_code == 404


def test_team_progression(client, year):
    body = client.get(f"{V1}/championships/teams/progression", params={"year": year}).json()
    assert body["series"] and "name" in body["series"][0]["entity"]


# ── summaries ──────────────────────────────────────────────────────────────

def test_driver_summary_matches_detailed_results(client, year, two_driver_ids):
    a, _ = two_driver_ids
    row = client.get(
        f"{V1}/drivers/summary", params={"year": year, "driver_id": a}
    ).json()["rows"][0]
    detailed = client.get(
        "/api/v1/results",
        params={"year": year, "driver_id": a, "session_type": "Race", "limit": 500},
    ).json()["items"]
    assert row["starts"] == len(detailed)
    assert math.isclose(row["total_points"], sum(r["points"] or 0 for r in detailed), abs_tol=1e-6)
    assert row["wins"] == sum(1 for r in detailed if r["position"] == 1)
    assert 0 <= row["classification_rate"] <= 1


def test_driver_summary_group_by_season(client, two_driver_ids):
    a, _ = two_driver_ids
    body = client.get(
        f"{V1}/drivers/summary",
        params={"driver_id": a, "group_by": "driver_season"},
    ).json()
    assert all(r["year"] is not None for r in body["rows"])
    assert len({r["year"] for r in body["rows"]}) == len(body["rows"])


def test_driver_summary_invalid_group_by(client):
    assert client.get(f"{V1}/drivers/summary", params={"group_by": "nope"}).status_code == 422


def test_team_driver_contribution_shares_sum_to_one(client, year):
    body = client.get(
        f"{V1}/teams/summary", params={"year": year, "group_by": "team_driver"}
    ).json()
    by_team = {}
    for r in body["rows"]:
        if r["share_of_team_points"] is not None:
            by_team.setdefault(r["team"]["id"], []).append(r["share_of_team_points"])
    assert by_team
    for shares in by_team.values():
        assert math.isclose(sum(shares), 1.0, abs_tol=1e-6)


def test_circuit_performance_has_geo_and_events(client, year):
    body = client.get(f"{V1}/circuits/performance", params={"year": year}).json()
    assert body["rows"]
    for r in body["rows"]:
        assert r["events"] >= 1
        assert "latitude" in r and "altitude" in r


def test_status_distribution_counts_match_results_total(client, year):
    dist = client.get(
        f"{V1}/results/status-distribution", params={"year": year}
    ).json()["rows"]
    total = client.get(
        "/api/v1/results", params={"year": year, "session_type": "Race", "limit": 1}
    ).json()["total"]
    assert sum(r["count"] for r in dist) == total


# ── head-to-head ───────────────────────────────────────────────────────────

def test_h2h_shared_sessions_and_tallies(client, year, two_driver_ids):
    a, b = two_driver_ids
    body = client.get(
        f"{V1}/comparisons/drivers",
        params={"driver_a": a, "driver_b": b, "year": year},
    ).json()
    s = body["summary"]
    assert s["shared_sessions"] == len(body["rows"]) > 0
    # tallies only count sessions where both have the metric
    assert s["position"]["a"] + s["position"]["b"] <= s["shared_sessions"]
    a_starts = client.get(
        "/api/v1/results",
        params={"year": year, "driver_id": a, "session_type": "Race", "limit": 1},
    ).json()["total"]
    assert s["shared_sessions"] <= a_starts


def test_h2h_same_driver_rejected(client, two_driver_ids):
    a, _ = two_driver_ids
    r = client.get(f"{V1}/comparisons/drivers", params={"driver_a": a, "driver_b": a})
    assert r.status_code == 422


def test_h2h_unknown_driver_404(client, two_driver_ids):
    a, _ = two_driver_ids
    r = client.get(f"{V1}/comparisons/drivers", params={"driver_a": a, "driver_b": 99999999})
    assert r.status_code == 404


def test_h2h_no_shared_sessions_is_empty_not_error(client, year, two_driver_ids):
    a, b = two_driver_ids
    body = client.get(
        f"{V1}/comparisons/drivers",
        params={"driver_a": a, "driver_b": b, "year": 1900},
    ).json()
    assert body["summary"]["shared_sessions"] == 0 and body["rows"] == []
