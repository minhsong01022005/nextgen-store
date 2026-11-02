from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from database import get_db
from security import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
def get_stats(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db),
              _admin=Depends(require_admin)):
    not_cancelled = models.Order.status.notin_(["cancelled", "returned"])

    total_revenue = db.query(func.sum(models.Order.total_amount)).filter(not_cancelled).scalar() or 0
    total_orders = db.query(models.Order).count()
    total_products = db.query(models.Product).count()
    low_stock_count = db.query(models.Product).filter(models.Product.stock <= 5).count()
    total_customers = db.query(models.User).filter(models.User.role == "customer").count()

    cat_sales = (
        db.query(models.Category.name,
                 func.sum(models.OrderItem.quantity * models.OrderItem.unit_price).label("revenue"))
        .join(models.Product, models.Product.category_id == models.Category.id)
        .join(models.OrderItem, models.OrderItem.product_id == models.Product.id)
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(not_cancelled).group_by(models.Category.name).all()
    )

    top = (
        db.query(models.OrderItem.product_name,
                 func.sum(models.OrderItem.quantity).label("qty"),
                 func.sum(models.OrderItem.quantity * models.OrderItem.unit_price).label("revenue"))
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(not_cancelled).group_by(models.OrderItem.product_name)
        .order_by(func.sum(models.OrderItem.quantity).desc()).limit(5).all()
    )

    start = date.today() - timedelta(days=days - 1)
    day_col = func.date(models.Order.created_at)
    day_rows = dict(
        db.query(day_col, func.sum(models.Order.total_amount))
        .filter(not_cancelled, day_col >= start).group_by(day_col).all()
    )
    order_rows = dict(
        db.query(day_col, func.count(models.Order.id))
        .filter(not_cancelled, day_col >= start).group_by(day_col).all()
    )
    by_day = []
    for i in range(days):
        d = start + timedelta(days=i)
        by_day.append({"date": d.isoformat(), "revenue": int(day_rows.get(d, 0) or 0),
                       "orders": int(order_rows.get(d, 0) or 0)})

    status_counts = dict(db.query(models.Order.status, func.count(models.Order.id))
                         .group_by(models.Order.status).all())

    return {
        "total_revenue": int(total_revenue),
        "total_orders": total_orders,
        "total_products": total_products,
        "total_customers": total_customers,
        "low_stock_count": low_stock_count,
        "revenue_by_category": [{"category": r[0], "revenue": int(r[1] or 0)} for r in cat_sales],
        "revenue_by_day": by_day,
        "top_products": [{"name": r[0], "qty": int(r[1] or 0), "revenue": int(r[2] or 0)} for r in top],
        "status_counts": status_counts,
    }
