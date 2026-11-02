"""luong don hang: lich su trang thai, ly do huy, thoi diem giao

Revision ID: a1c4f7d20b11
Revises: 8de0e22e25b1
Create Date: 2026-11-02 12:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1c4f7d20b11'
down_revision: Union[str, Sequence[str], None] = '8de0e22e25b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('orders', sa.Column('cancel_reason', sa.String(length=300), nullable=True))
    op.add_column('orders', sa.Column('delivered_at', sa.DateTime(), nullable=True))
    op.create_table(
        'order_status_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('actor', sa.String(length=20), nullable=False),
        sa.Column('note', sa.String(length=300), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_order_status_history_order_id'), 'order_status_history', ['order_id'], unique=False)
    # Đơn cũ: ghi một dòng lịch sử theo trạng thái hiện tại
    op.execute("INSERT INTO order_status_history (order_id, status, actor, created_at) "
               "SELECT id, status, 'system', created_at FROM orders")
    op.execute("UPDATE orders SET delivered_at = created_at WHERE status = 'completed'")


def downgrade() -> None:
    op.drop_index(op.f('ix_order_status_history_order_id'), table_name='order_status_history')
    op.drop_table('order_status_history')
    op.drop_column('orders', 'delivered_at')
    op.drop_column('orders', 'cancel_reason')
