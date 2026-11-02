"""Tính phí vận chuyển. Module thuần, dễ kiểm thử."""
import config


def shipping_fee(subtotal: int) -> int:
    if subtotal <= 0 or subtotal >= config.FREE_SHIP_THRESHOLD:
        return 0
    return config.SHIPPING_FEE
