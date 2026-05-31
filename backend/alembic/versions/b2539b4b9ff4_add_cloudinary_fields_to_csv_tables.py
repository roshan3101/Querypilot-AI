"""add_cloudinary_fields_to_csv_tables

Revision ID: b2539b4b9ff4
Revises: 666a102d6610
Create Date: 2026-05-31 13:18:50.999093

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2539b4b9ff4'
down_revision: Union[str, Sequence[str], None] = '666a102d6610'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("csv_tables", sa.Column("cloudinary_url", sa.String(), nullable=True))
    op.add_column("csv_tables", sa.Column("cloudinary_public_id", sa.String(), nullable=True))
    op.add_column("csv_tables", sa.Column("file_size_bytes", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("csv_tables", "file_size_bytes")
    op.drop_column("csv_tables", "cloudinary_public_id")
    op.drop_column("csv_tables", "cloudinary_url")
