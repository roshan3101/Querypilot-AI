import re
from typing import Tuple

BLOCKED_KEYWORDS = [
    r"\bDROP\b",
    r"\bDELETE\b",
    r"\bTRUNCATE\b",
    r"\bINSERT\b",
    r"\bUPDATE\b",
    r"\bALTER\b",
    r"\bCREATE\b",
    r"\bGRANT\b",
    r"\bREVOKE\b",
    r"\bEXECUTE\b",
    r"\bEXEC\b",
    r"\bCALL\b",
    r"\bpg_sleep\b",
    r"\bpg_read_file\b",
    r"\bCOPY\b",
]


def validate_sql_safety(sql: str) -> Tuple[bool, str]:
    sql_upper = sql.upper().strip()

    if not sql_upper.startswith("SELECT") and not sql_upper.startswith("WITH") and not sql_upper.startswith("EXPLAIN"):
        return False, "Only SELECT, WITH (CTEs), and EXPLAIN queries are allowed."

    for pattern in BLOCKED_KEYWORDS:
        if re.search(pattern, sql, re.IGNORECASE):
            keyword = pattern.replace(r"\b", "").strip()
            return False, f"Query contains forbidden keyword: {keyword}"

    if "--" in sql or "/*" in sql:
        return False, "SQL comments are not allowed for security reasons."

    if len(sql) > 10000:
        return False, "Query exceeds maximum allowed length."

    return True, "Query is safe."
