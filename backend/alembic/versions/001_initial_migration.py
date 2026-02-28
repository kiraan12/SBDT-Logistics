"""Initial migration

Revision ID: 001
Revises: 
Create Date: 2026-02-17 22:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create UserRole enum (with existence check)
    conn = op.get_bind()
    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE userrole AS ENUM ('ADMIN', 'MANAGER', 'OPERATOR');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    
    # Create DeliveryStatus enum (with existence check)
    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE deliverystatus AS ENUM ('BOOKED', 'IN_TRANSIT', 'DELIVERED');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    
    # Reference the enums for table creation
    user_role_enum = postgresql.ENUM('ADMIN', 'MANAGER', 'OPERATOR', name='userrole', create_type=False)
    delivery_status_enum = postgresql.ENUM('BOOKED', 'IN_TRANSIT', 'DELIVERED', name='deliverystatus', create_type=False)
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('role', user_role_enum, nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_full_name'), 'users', ['full_name'], unique=False)
    
    # Create shipments table
    op.create_table(
        'shipments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lr_no', sa.String(), nullable=False),
        sa.Column('branch_name', sa.String(), nullable=True),
        sa.Column('inv_no', sa.String(), nullable=True),
        sa.Column('invoice_value', sa.Float(), nullable=True),
        sa.Column('boxes', sa.Integer(), nullable=True),
        sa.Column('weight', sa.Float(), nullable=True),
        sa.Column('shipment_type', sa.String(), nullable=True),
        sa.Column('consignor_name', sa.String(), nullable=True),
        sa.Column('consignor_address', sa.Text(), nullable=True),
        sa.Column('consignee_name', sa.String(), nullable=True),
        sa.Column('consignee_address', sa.Text(), nullable=True),
        sa.Column('source', sa.String(), nullable=True),
        sa.Column('destination', sa.String(), nullable=True),
        sa.Column('vehicle_no', sa.String(), nullable=True),
        sa.Column('booking_date', sa.Date(), nullable=True),
        sa.Column('ship_date', sa.Date(), nullable=True),
        sa.Column('expected_delivery_date', sa.Date(), nullable=True),
        sa.Column('eta', sa.DateTime(timezone=True), nullable=True),
        sa.Column('actual_delivery_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivery_status', delivery_status_enum, nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_shipments_lr_no'), 'shipments', ['lr_no'], unique=True)
    op.create_index(op.f('ix_shipments_branch_name'), 'shipments', ['branch_name'], unique=False)
    op.create_index(op.f('ix_shipments_inv_no'), 'shipments', ['inv_no'], unique=False)
    
    # Create shipment_files table
    op.create_table(
        'shipment_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('shipment_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('file_type', sa.String(), nullable=True),
        sa.Column('file_path', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['shipment_id'], ['shipments.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_shipment_files_id'), 'shipment_files', ['id'], unique=False)
    
    # Create scan_jobs table
    op.create_table(
        'scan_jobs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('input_file_path', sa.String(), nullable=True),
        sa.Column('extracted_data', sa.Text(), nullable=True),
        sa.Column('confidence_scores', sa.Text(), nullable=True),
        sa.Column('raw_text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('scan_jobs')
    op.drop_index(op.f('ix_shipment_files_id'), table_name='shipment_files')
    op.drop_table('shipment_files')
    op.drop_index(op.f('ix_shipments_inv_no'), table_name='shipments')
    op.drop_index(op.f('ix_shipments_branch_name'), table_name='shipments')
    op.drop_index(op.f('ix_shipments_lr_no'), table_name='shipments')
    op.drop_table('shipments')
    op.drop_index(op.f('ix_users_full_name'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
    
    # Drop enums
    sa.Enum(name='deliverystatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='userrole').drop(op.get_bind(), checkfirst=True)
