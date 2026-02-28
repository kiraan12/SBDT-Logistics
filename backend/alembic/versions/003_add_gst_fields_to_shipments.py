"""add_gst_fields_to_shipments

Revision ID: 003
Revises: 002
Create Date: 2026-02-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add GST fields to shipments table
    op.add_column('shipments', sa.Column('consignor_gstin', sa.String(), nullable=True))
    op.add_column('shipments', sa.Column('consignee_gstin', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove GST fields from shipments table
    op.drop_column('shipments', 'consignee_gstin')
    op.drop_column('shipments', 'consignor_gstin')
