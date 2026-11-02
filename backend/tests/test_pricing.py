import config
from pricing import shipping_fee


def test_shipping_fee_rules():
    assert shipping_fee(0) == 0
    assert shipping_fee(config.FREE_SHIP_THRESHOLD - 1) == config.SHIPPING_FEE
    assert shipping_fee(config.FREE_SHIP_THRESHOLD) == 0
    assert shipping_fee(config.FREE_SHIP_THRESHOLD * 3) == 0
