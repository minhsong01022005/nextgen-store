"""gio hang tren server, so dia chi, phi ship

Revision ID: b7e2c91a5d33
Revises: a1c4f7d20b11
Create Date: 2026-11-02 13:30:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7e2c91a5d33'
down_revision: Union[str, Sequence[str], None] = 'a1c4f7d20b11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('shipping_fee', sa.Integer(), nullable=False, server_default='0'))
    op.create_table(
        'cart_items',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'product_id', name='uq_cart_user_product'),
    )
    op.create_index(op.f('ix_cart_items_user_id'), 'cart_items', ['user_id'], unique=False)
    op.create_table(
        'addresses',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=False),
        sa.Column('address', sa.String(length=300), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_addresses_user_id'), 'addresses', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_addresses_user_id'), table_name='addresses')
    op.drop_table('addresses')
    op.drop_index(op.f('ix_cart_items_user_id'), table_name='cart_items')
    op.drop_table('cart_items')
    op.drop_column('orders', 'shipping_fee')
