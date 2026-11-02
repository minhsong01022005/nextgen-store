from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from pricing import shipping_fee
from order_flow import RESTOCK_ON, RETURN_WINDOW, allowed_next, check_transition
from security import get_current_user, get_optional_user, require_admin, require_customer

router = APIRouter(tags=["orders"])


# ================= MÃ GIẢM GIÁ =================
def _used_before(db: Session, code: str, user: Optional[models.User], phone: Optional[str] = None) -> bool:
    conds = []
    if user:
        conds.append(models.Order.user_id == user.id)
    if phone:
        conds.append(models.Order.customer_phone == phone)
    if not conds:
        return False
    return db.query(models.Order.id).filter(
        models.Order.coupon_code == code, models.Order.status.notin_(list(RESTOCK_ON)), or_(*conds)
    ).first() is not None


def calculate_discount(coupon: models.Coupon, subtotal: int) -> int:
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="Mã giảm giá này đã bị khóa!")
    if coupon.expires_at and coupon.expires_at < datetime.now():
        raise HTTPException(status_code=400, detail="Mã giảm giá đã hết hạn!")
    if coupon.used_count >= coupon.usage_limit:
        raise HTTPException(status_code=400, detail="Mã giảm giá đã hết lượt sử dụng!")
    if subtotal < coupon.min_order_amount:
        min_fmt = f"{coupon.min_order_amount:,.0f}".replace(",", ".")
        raise HTTPException(
            status_code=400,
            detail=f"Mã '{coupon.code}' chỉ áp dụng cho đơn từ {min_fmt} đ trở lên!")

    if coupon.discount_type == "percent":
        discount = int(subtotal * (coupon.discount_value / 100))
    else:
        discount = coupon.discount_value
    return min(discount, subtotal)


@router.get("/coupons", response_model=List[schemas.CouponResponse])
def public_coupons(db: Session = Depends(get_db)):
    """Danh sách mã còn dùng được, hiển thị cho khách chọn nhanh."""
    now = datetime.now()
    return (db.query(models.Coupon)
            .filter(models.Coupon.is_active.is_(True),
                    models.Coupon.used_count < models.Coupon.usage_limit,
                    or_(models.Coupon.expires_at.is_(None), models.Coupon.expires_at > now))
            .order_by(models.Coupon.id.desc()).all())


@router.get("/admin/coupons", response_model=List[schemas.CouponResponse])
def admin_coupons(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    return db.query(models.Coupon).order_by(models.Coupon.id.desc()).all()


@router.post("/coupons", response_model=schemas.CouponResponse)
def create_coupon(cp: schemas.CouponCreate, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    code_upper = cp.code.strip().upper()
    if db.query(models.Coupon).filter(models.Coupon.code == code_upper).first():
        raise HTTPException(status_code=400, detail="Mã giảm giá này đã tồn tại!")
    if cp.discount_type == "percent" and cp.discount_value > 100:
        raise HTTPException(status_code=400, detail="Giảm theo % không được vượt quá 100!")
    new_cp = models.Coupon(code=code_upper, discount_type=cp.discount_type,
                           discount_value=cp.discount_value, min_order_amount=cp.min_order_amount,
                           usage_limit=cp.usage_limit, expires_at=cp.expires_at)
    db.add(new_cp)
    db.commit()
    db.refresh(new_cp)
    return new_cp


@router.put("/coupons/{coupon_id}", response_model=schemas.CouponResponse)
def update_coupon(coupon_id: int, cp: schemas.CouponCreate, db: Session = Depends(get_db),
                  _admin=Depends(require_admin)):
    coupon = db.get(models.Coupon, coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã giảm giá")
    code_upper = cp.code.strip().upper()
    clash = db.query(models.Coupon).filter(models.Coupon.code == code_upper,
                                           models.Coupon.id != coupon_id).first()
    if clash:
        raise HTTPException(status_code=400, detail="Mã giảm giá này đã tồn tại!")
    if cp.discount_type == "percent" and cp.discount_value > 100:
        raise HTTPException(status_code=400, detail="Giảm theo % không được vượt quá 100!")
    if cp.usage_limit < coupon.used_count:
        raise HTTPException(
            status_code=400,
            detail=f"Mã đã được dùng {coupon.used_count} lượt, giới hạn không thể thấp hơn số này!")
    coupon.code = code_upper
    coupon.discount_type = cp.discount_type
    coupon.discount_value = cp.discount_value
    coupon.min_order_amount = cp.min_order_amount
    coupon.usage_limit = cp.usage_limit
    coupon.expires_at = cp.expires_at
    db.commit()
    db.refresh(coupon)
    return coupon


@router.put("/coupons/{coupon_id}/toggle", response_model=schemas.CouponResponse)
def toggle_coupon(coupon_id: int, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    cp = db.get(models.Coupon, coupon_id)
    if not cp:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã giảm giá")
    cp.is_active = not cp.is_active
    db.commit()
    db.refresh(cp)
    return cp


@router.delete("/coupons/{coupon_id}")
def delete_coupon(coupon_id: int, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    cp = db.get(models.Coupon, coupon_id)
    if not cp:
        raise HTTPException(status_code=404, detail="Không tìm thấy mã giảm giá")
    db.delete(cp)
    db.commit()
    return {"message": "Đã xóa mã giảm giá!"}


@router.post("/coupons/apply")
def apply_coupon(req: schemas.CouponApplyRequest, db: Session = Depends(get_db),
                 user: Optional[models.User] = Depends(get_optional_user)):
    code_upper = req.code.strip().upper()
    coupon = db.query(models.Coupon).filter(models.Coupon.code == code_upper).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Mã giảm giá không tồn tại!")
    discount_amount = calculate_discount(coupon, req.order_total)
    if _used_before(db, coupon.code, user):
        raise HTTPException(status_code=400, detail="Bạn đã dùng mã này rồi!")
    return {
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "discount_amount": discount_amount,
        "final_total": req.order_total - discount_amount,
        "message": f"Áp dụng mã {coupon.code} thành công!",
    }


# ================= ĐƠN HÀNG =================
def _next_actions(o: models.Order, role: str) -> list:
    acts = allowed_next(o.status, role)
    if "return_requested" in acts and (
            not o.delivered_at or datetime.now() - o.delivered_at > RETURN_WINDOW):
        acts.remove("return_requested")
    return acts


def _transition(db: Session, o: models.Order, new: str, role: str, note: Optional[str] = None) -> None:
    """Đổi trạng thái đơn: kiểm tra hợp lệ, hoàn kho/mã khi cần, ghi lịch sử."""
    try:
        check_transition(o.status, new, role, o.delivered_at)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if new in RESTOCK_ON:
        for oi in o.items:
            if oi.product:
                oi.product.stock += oi.quantity
        if o.coupon_code:
            cp = db.query(models.Coupon).filter(models.Coupon.code == o.coupon_code).first()
            if cp and cp.used_count > 0:
                cp.used_count -= 1
    if new == "cancelled":
        o.cancel_reason = note or None
    if new == "delivered" and not o.delivered_at:  # từ chối trả hàng không làm mới hạn 7 ngày
        o.delivered_at = datetime.now()
    o.status = new
    db.add(models.OrderStatusHistory(order_id=o.id, status=new, actor=role, note=note or None))


def _auto_complete(db: Session) -> None:
    """Đơn đã giao quá 7 ngày mà khách chưa phản hồi thì tự hoàn tất."""
    cutoff = datetime.now() - RETURN_WINDOW
    stale = (db.query(models.Order)
             .filter(models.Order.status == "delivered", models.Order.delivered_at < cutoff).all())
    for o in stale:
        _transition(db, o, "completed", "system", "Tự động hoàn tất sau 7 ngày")
    if stale:
        db.commit()


def _own_order(db: Session, order_id: int, user: models.User) -> models.Order:
    o = db.get(models.Order, order_id)
    if not o or o.user_id != user.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return o


def _order_to_dict(o: models.Order, role: str = "customer") -> dict:
    return {
        "id": o.id, "customer_name": o.customer_name, "customer_phone": o.customer_phone,
        "customer_address": o.customer_address, "payment_method": o.payment_method or "cod",
        "coupon_code": o.coupon_code, "discount_amount": o.discount_amount,
        "shipping_fee": o.shipping_fee or 0, "total_amount": o.total_amount, "status": o.status, "created_at": o.created_at,
        "cancel_reason": o.cancel_reason, "delivered_at": o.delivered_at,
        "next_actions": _next_actions(o, role),
        "history": [{"status": h.status, "actor": h.actor, "note": h.note, "created_at": h.created_at}
                    for h in o.history],
        "items": [{
            "product_id": oi.product_id,
            "product_name": oi.product_name or (oi.product.name if oi.product else "Sản phẩm đã xóa"),
            "quantity": oi.quantity, "unit_price": oi.unit_price,
        } for oi in o.items],
    }


@router.post("/orders")
def create_order(order_req: schemas.OrderCreate, db: Session = Depends(get_db),
                 user: models.User = Depends(require_customer)):
    if not order_req.items:
        raise HTTPException(status_code=400, detail="Bạn chưa chọn sản phẩm nào để thanh toán!")
    addr = db.get(models.Address, order_req.address_id)
    if not addr or addr.user_id != user.id:
        raise HTTPException(status_code=400, detail="Vui lòng chọn địa chỉ nhận hàng!")

    # Gộp các dòng trùng sản phẩm
    wanted: dict = {}
    for it in order_req.items:
        wanted[it.product_id] = wanted.get(it.product_id, 0) + it.quantity

    # Khóa hàng sản phẩm (theo thứ tự id để tránh deadlock) -> chống bán quá tồn kho
    products = (db.query(models.Product).filter(models.Product.id.in_(wanted.keys()))
                .order_by(models.Product.id).with_for_update().all())
    by_id = {p.id: p for p in products}

    subtotal = 0
    lines = []
    for pid, qty in wanted.items():
        product = by_id.get(pid)
        if not product:
            raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại!")
        if product.stock < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Sản phẩm '{product.name}' chỉ còn {product.stock} chiếc trong kho!")
        product.stock -= qty
        subtotal += product.price * qty
        lines.append((product, qty))

    discount_amount = 0
    applied_code = None
    if order_req.coupon_code and order_req.coupon_code.strip():
        code_upper = order_req.coupon_code.strip().upper()
        coupon = (db.query(models.Coupon).filter(models.Coupon.code == code_upper)
                  .with_for_update().first())
        if not coupon:
            raise HTTPException(status_code=404, detail="Mã giảm giá không hợp lệ!")
        discount_amount = calculate_discount(coupon, subtotal)
        if _used_before(db, coupon.code, user, addr.phone):
            raise HTTPException(status_code=400, detail="Bạn đã dùng mã này rồi!")
        coupon.used_count += 1
        applied_code = coupon.code

    fee = shipping_fee(subtotal)  # phí ship tính trên tiền hàng, không trừ mã giảm giá
    new_order = models.Order(
        user_id=user.id,
        customer_name=addr.full_name, customer_phone=addr.phone, customer_address=addr.address,
        payment_method=order_req.payment_method,
        coupon_code=applied_code, discount_amount=discount_amount, shipping_fee=fee,
        total_amount=max(subtotal - discount_amount, 0) + fee, status="pending",
    )
    db.add(new_order)
    db.flush()
    for product, qty in lines:
        db.add(models.OrderItem(order_id=new_order.id, product_id=product.id,
                                product_name=product.name, quantity=qty, unit_price=product.price))
    db.add(models.OrderStatusHistory(order_id=new_order.id, status="pending", actor="customer"))
    # Chỉ xóa các món đã thanh toán khỏi giỏ; món chưa chọn vẫn ở lại
    db.query(models.CartItem).filter(models.CartItem.user_id == user.id,
                                     models.CartItem.product_id.in_(wanted.keys())
                                     ).delete(synchronize_session=False)
    db.commit()
    return {"message": "Đặt hàng thành công!", "order_id": new_order.id}


@router.get("/orders", response_model=List[schemas.OrderResponse])
def all_orders(status: Optional[str] = None, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    _auto_complete(db)
    q = db.query(models.Order)
    if status:
        q = q.filter(models.Order.status == status)
    return [_order_to_dict(o, "admin")
            for o in q.order_by(models.Order.created_at.desc(), models.Order.id.desc()).all()]


@router.get("/me/orders", response_model=List[schemas.OrderResponse])
def my_orders(user: models.User = Depends(require_customer), db: Session = Depends(get_db)):
    _auto_complete(db)
    rows = (db.query(models.Order).filter(models.Order.user_id == user.id)
            .order_by(models.Order.created_at.desc(), models.Order.id.desc()).all())
    return [_order_to_dict(o) for o in rows]


@router.post("/me/orders/{order_id}/cancel")
def cancel_my_order(order_id: int, req: schemas.OrderActionRequest,
                    user: models.User = Depends(require_customer), db: Session = Depends(get_db)):
    o = _own_order(db, order_id, user)
    _transition(db, o, "cancelled", "customer", (req.reason or "").strip())
    db.commit()
    return {"message": "Đã hủy đơn hàng!"}


@router.post("/me/orders/{order_id}/confirm-received")
def confirm_received(order_id: int, user: models.User = Depends(require_customer),
                     db: Session = Depends(get_db)):
    o = _own_order(db, order_id, user)
    _transition(db, o, "completed", "customer")
    db.commit()
    return {"message": "Cảm ơn bạn đã xác nhận nhận hàng!"}


@router.post("/me/orders/{order_id}/return")
def request_return(order_id: int, req: schemas.OrderActionRequest,
                   user: models.User = Depends(require_customer), db: Session = Depends(get_db)):
    o = _own_order(db, order_id, user)
    reason = (req.reason or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Vui lòng nhập lý do trả hàng!")
    _transition(db, o, "return_requested", "customer", reason)
    db.commit()
    return {"message": "Đã gửi yêu cầu trả hàng!"}


@router.put("/orders/{order_id}/status")
def update_order_status(order_id: int, status: str, note: Optional[str] = None,
                        db: Session = Depends(get_db), _admin=Depends(require_admin)):
    order = db.get(models.Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    _transition(db, order, status, "admin", (note or "").strip())
    db.commit()
    return {"message": "Đã cập nhật trạng thái đơn hàng!"}
