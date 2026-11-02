"""Máy trạng thái đơn hàng (kiểu Shopee). Module thuần, không phụ thuộc DB."""
from datetime import datetime, timedelta
from typing import Optional

RETURN_WINDOW = timedelta(days=7)

STATUSES = {"pending", "processing", "shipping", "delivered", "completed",
            "cancelled", "return_requested", "returned"}

# (trạng thái hiện tại, trạng thái mới) -> các vai trò được phép chuyển
TRANSITIONS = {
    ("pending", "processing"): {"admin"},
    ("pending", "cancelled"): {"customer", "admin"},
    ("processing", "shipping"): {"admin"},
    ("processing", "cancelled"): {"customer", "admin"},
    ("shipping", "delivered"): {"admin"},
    ("delivered", "completed"): {"customer", "system"},
    ("delivered", "return_requested"): {"customer"},
    ("return_requested", "returned"): {"admin"},
    ("return_requested", "delivered"): {"admin"},  # từ chối trả hàng
}

# Chuyển sang các trạng thái này thì hoàn kho + hoàn lượt mã giảm giá
RESTOCK_ON = {"cancelled", "returned"}


def allowed_next(current: str, role: str) -> list:
    return [new for (cur, new), roles in TRANSITIONS.items() if cur == current and role in roles]


def check_transition(current: str, new: str, role: str, delivered_at: Optional[datetime] = None,
                     now: Optional[datetime] = None) -> None:
    """Ném ValueError (kèm thông báo tiếng Việt) nếu chuyển trạng thái không hợp lệ."""
    if new not in STATUSES:
        raise ValueError("Trạng thái không hợp lệ!")
    roles = TRANSITIONS.get((current, new))
    if roles is None:
        raise ValueError("Không thể chuyển đơn sang trạng thái này!")
    if role not in roles:
        raise ValueError("Bạn không có quyền thực hiện thao tác này!")
    if new == "return_requested":
        now = now or datetime.now()
        if not delivered_at or now - delivered_at > RETURN_WINDOW:
            raise ValueError("Đã quá 7 ngày kể từ khi nhận hàng, không thể yêu cầu trả hàng!")
