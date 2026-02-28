"""add_scan_job_user_id

Revision ID: 005
Revises: 004
Create Date: 2026-02-19 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scan_jobs", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_scan_jobs_user_id_users",
        "scan_jobs",
        "users",
        ["user_id"],
        ["id"],
    )
    op.create_index("ix_scan_jobs_user_id", "scan_jobs", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_scan_jobs_user_id", table_name="scan_jobs")
    op.drop_constraint("fk_scan_jobs_user_id_users", "scan_jobs", type_="foreignkey")
    op.drop_column("scan_jobs", "user_id")
