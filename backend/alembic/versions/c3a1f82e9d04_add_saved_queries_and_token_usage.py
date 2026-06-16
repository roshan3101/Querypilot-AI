"""add_saved_queries_and_token_usage

Revision ID: c3a1f82e9d04
Revises: b2539b4b9ff4
Create Date: 2026-06-16 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "c3a1f82e9d04"
down_revision: Union[str, None] = "b2539b4b9ff4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("query_history", sa.Column("token_usage", postgresql.JSON(), nullable=True))

    op.create_table(
        "saved_queries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sql", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_saved_queries_id", "saved_queries", ["id"])


def downgrade() -> None:
    op.drop_index("ix_saved_queries_id", table_name="saved_queries")
    op.drop_table("saved_queries")
    op.drop_column("query_history", "token_usage")
