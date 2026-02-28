"""Add CANCELLED to DeliveryStatus enum

Revision ID: 002
Revises: 001
Create Date: 2026-02-18

"""
from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE deliverystatus ADD VALUE 'CANCELLED';
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)


def downgrade() -> None:
    # PostgreSQL does not support removing enum values easily; leave as-is
    pass
