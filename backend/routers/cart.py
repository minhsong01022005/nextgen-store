from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from pricing import shipping_fee
from security import require_customer

router = APIRouter(tags=["cart"])

DEFAULT_IMG = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80"


def _cart_payload(db: Session, user: models.User) -> list:
    rows = (db.query(models.CartItem).filter(models.CartItem.user_id == user.id)
            .order_by(models.CartItem.id).all())
    return [{"id": r.product_id, "name": r.product.name, "price": r.product.price,
             "image_url": r.product.image_url or DEFAULT_IMG, "stock": r.product.stock,
             "quantity": r.quantity} for r in rows]


def _add(db: Session, user: models.User, product_id: int, qty: int, *, strict: bool) -> None:
    """Cộng dồn vào giỏ. strict=False (gộp giỏ khi đăng nhập) thì tự cắt xuống theo tồn kho."""
    p = db.get(models.Product, product_id)
    if not p:
        if strict:
            raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại!")
        return
    if p.stock <= 0:
        if strict:
            raise HTTPException(status_code=400, detail="Sản phẩm này đã hết hàng!")
        return
    item = db.query(models.CartItem).filter_by(user_id=user.id, product_id=product_id).first()
    want = (item.quantity if item else 0) + qty
    if want > p.stock:
        if strict:
            raise HTTPException(status_code=400, detail=f"Kho chỉ còn tối đa {p.stock} sản phẩm!")
        want = p.stock
    if item:
        item.quantity = want
    else:
        db.add(models.CartItem(user_id=user.id, product_id=product_id, quantity=want))


@router.get("/me/cart")
def get_cart(user: models.User = Depends(require_customer), db: Session = Depends(get_db)):
    return _cart_payload(db, user)


@router.post("/me/cart")
def add_to_cart(req: schemas.CartAdd, user: models.User = Depends(require_customer),
                db: Session = Depends(get_db)):
    _add(db, user, req.product_id, req.quantity, strict=True)
    db.commit()
    return _cart_payload(db, user)


@router.put("/me/cart/{product_id}")
def set_cart_quantity(product_id: int, req: schemas.CartItemSet,
                      user: models.User = Depends(require_customer), db: Session = Depends(get_db)):
    item = db.query(models.CartItem).filter_by(user_id=user.id, product_id=product_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Sản phẩm không có trong giỏ!")
    if req.quantity == 0:
        db.delete(item)
    else:
        if req.quantity > item.product.stock:
            raise HTTPException(status_code=400, detail=f"Kho chỉ còn tối đa {item.product.stock} sản phẩm!")
        item.quantity = req.quantity
    db.commit()
    return _cart_payload(db, user)


@router.delete("/me/cart/{product_id}")
def remove_from_cart(product_id: int, user: models.User = Depends(require_customer),
                     db: Session = Depends(get_db)):
    db.query(models.CartItem).filter_by(user_id=user.id, product_id=product_id).delete()
    db.commit()
    return _cart_payload(db, user)


@router.post("/me/cart/merge")
def merge_cart(req: schemas.CartMerge, user: models.User = Depends(require_customer),
               db: Session = Depends(get_db)):
    """Gộp giỏ của khách vãng lai (localStorage) vào giỏ tài khoản sau khi đăng nhập."""
    for it in req.items:
        _add(db, user, it.product_id, it.quantity, strict=False)
    db.commit()
    return _cart_payload(db, user)


@router.get("/shipping-fee")
def get_shipping_fee(subtotal: int = 0):
    return {"shipping_fee": shipping_fee(subtotal)}
