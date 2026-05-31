from typing import Optional


def suggest_chart_type(columns: list[str], rows: list, sql: str) -> Optional[str]:
    if not rows or not columns:
        return "table"

    col_lower = [c.lower() for c in columns]
    row_count = len(rows)
    col_count = len(columns)

    sql_lower = sql.lower()

    has_date = any(k in " ".join(col_lower) for k in ["date", "month", "year", "day", "week", "time"])
    has_count_or_sum = any(k in " ".join(col_lower) for k in ["count", "sum", "total", "revenue", "amount", "sales"])
    has_category = col_count >= 2 and col_count <= 4

    if has_date and has_count_or_sum:
        return "line"

    if has_category and row_count <= 20 and has_count_or_sum:
        if row_count <= 8:
            return "pie"
        return "bar"

    if col_count == 2 and row_count <= 30:
        return "bar"

    if row_count > 50:
        return "table"

    return "bar"
