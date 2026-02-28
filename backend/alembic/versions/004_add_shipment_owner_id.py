"""add_shipment_owner_id

Revision ID: 004
Revises: 003
Create Date: 2026-02-19 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('shipments', sa.Column('owner_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_shipments_owner_id_users', 'shipments', 'users', ['owner_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_shipments_owner_id_users', 'shipments', type_='foreignkey')
    op.drop_column('shipments', 'owner_id')
