import json
from pathlib import Path

METADATA_PATH = Path(__file__).parent / "f1_circuit_metadata.json"


def load_circuit_metadata() -> list[dict]:
    with open(METADATA_PATH) as f:
        return json.load(f)


def upsert_circuit_metadata(conn, rows: list[dict]) -> int:
    """Populate the circuit layout columns on bronze.circuits, keyed by
    circuit name. Idempotent — re-running overwrites with the same values."""
    updated = 0
    for m in rows:
        cur = conn.execute(
            """
            UPDATE bronze.circuits
            SET track_length   = %s,
                turns          = %s,
                race_laps      = %s,
                lap_record     = %s::interval,
                record_holder  = %s,
                track_type     = %s,
                drs_zones      = %s,
                elevation_gain = %s
            WHERE name = %s
            """,
            (
                m["track_length"],
                m["turns"],
                m["race_laps"],
                m["lap_record"],
                m["record_holder"],
                m["track_type"],
                m["drs_zones"],
                m["elevation_gain"],
                m["circuit_name"],
            ),
        )
        if cur.rowcount == 0:
            print(f"WARN: no circuit named {m['circuit_name']!r} in bronze.circuits")
        updated += cur.rowcount
    conn.commit()
    return updated
