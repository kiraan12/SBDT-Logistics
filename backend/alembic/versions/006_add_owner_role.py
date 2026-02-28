"""Add OWNER to UserRole enum

Revision ID: 006
Revises: 005
Create Date: 2026-02-22

"""
from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE userrole ADD VALUE 'OWNER';
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)


def downgrade() -> None:
    # PostgreSQL does not support removing enum values easily; leave as-is
    pass
