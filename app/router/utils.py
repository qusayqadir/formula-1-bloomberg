"""Shared query helpers for the routers.

All SQL is built from static strings plus psycopg named parameters —
user input never reaches the SQL text itself.
"""
from typing import Any

import psycopg
from fastapi import HTTPException, Query


class Pagination:
    def __init__(
        self,
        limit: int = Query(100, ge=1, le=500, description="Page size"),
        offset: int = Query(0, ge=0, description="Rows to skip"),
    ):
        self.limit = limit
        self.offset = offset


def paginate(
    conn: psycopg.Connection,
    select_sql: str,
    count_sql: str,
    where: list[str],
    params: dict[str, Any],
    order_by: str,
    page: Pagination,
) -> dict[str, Any]:
    where_sql = f" WHERE {' AND '.join(where)}" if where else ""
    with conn.cursor() as cur:
        cur.execute(count_sql + where_sql, params)
        total = cur.fetchone()["count"]
        cur.execute(
            f"{select_sql}{where_sql} ORDER BY {order_by} LIMIT %(limit)s OFFSET %(offset)s",
            {**params, "limit": page.limit, "offset": page.offset},
        )
        items = cur.fetchall()
    return {"total": total, "limit": page.limit, "offset": page.offset, "items": items}


def fetch_one_or_404(conn: psycopg.Connection, sql: str, params: dict, entity: str) -> dict:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail=f"{entity} not found")
    return row
