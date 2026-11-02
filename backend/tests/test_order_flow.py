from datetime import datetime, timedelta

import pytest

from order_flow import RETURN_WINDOW, allowed_next, check_transition


def test_happy_path_by_actor():
    check_transition("pending", "processing", "admin")
    check_transition("processing", "shipping", "admin")
    check_transition("shipping", "delivered", "admin")
    check_transition("delivered", "completed", "customer")
    check_transition("delivered", "completed", "system")


def test_customer_cannot_advance_shipping():
    with pytest.raises(ValueError):
        check_transition("pending", "processing", "customer")
    with pytest.raises(ValueError):
        check_transition("shipping", "delivered", "customer")


@pytest.mark.parametrize("cur", ["pending", "processing"])
def test_customer_can_cancel_before_shipping(cur):
    check_transition(cur, "cancelled", "customer")


@pytest.mark.parametrize("cur", ["shipping", "delivered", "completed", "cancelled", "returned"])
def test_cannot_cancel_after_shipping(cur):
    with pytest.raises(ValueError):
        check_transition(cur, "cancelled", "customer")
    with pytest.raises(ValueError):
        check_transition(cur, "cancelled", "admin")


def test_cannot_skip_steps_or_reopen():
    with pytest.raises(ValueError):
        check_transition("pending", "shipping", "admin")
    with pytest.raises(ValueError):
        check_transition("cancelled", "pending", "admin")
    with pytest.raises(ValueError):
        check_transition("pending", "bogus", "admin")


def test_return_window():
    now = datetime(2026, 11, 10)
    check_transition("delivered", "return_requested", "customer", now - timedelta(days=3), now)
    with pytest.raises(ValueError):
        check_transition("delivered", "return_requested", "customer", now - RETURN_WINDOW - timedelta(hours=1), now)
    with pytest.raises(ValueError):
        check_transition("delivered", "return_requested", "customer", None, now)


def test_return_resolution_admin_only():
    check_transition("return_requested", "returned", "admin")
    check_transition("return_requested", "delivered", "admin")
    with pytest.raises(ValueError):
        check_transition("return_requested", "returned", "customer")


def test_allowed_next():
    assert set(allowed_next("pending", "customer")) == {"cancelled"}
    assert set(allowed_next("pending", "admin")) == {"processing", "cancelled"}
    assert allowed_next("completed", "admin") == []
