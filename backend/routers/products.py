import math
import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

import config
import models
import schemas
from database import get_db
from security import get_current_user, require_admin, require_customer

router = APIRouter(tags=["products"])

DEFAULT_IMG = "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80"
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_UPLOAD = 5 * 1024 * 1024


def _rating_subquery(db: Session):
    return (
        db.query(
            models.Review.product_id.label("pid"),
            func.avg(models.Review.rating).label("avg_rating"),
            func.count(models.Review.id).label("review_count"),
        )
        .group_by(models.Review.product_id)
        .subquery()
    )


def _to_response(p: models.Product, avg=0, cnt=0) -> dict:
    return {
        "id": p.id, "name": p.name, "brand": p.brand or "", "description": p.description or "",
        "price": p.price, "stock": p.stock, "image_url": p.image_url or DEFAULT_IMG,
        "category_id": p.category_id, "category_name": p.category.name if p.category else "",
        "avg_rating": round(float(avg or 0), 1), "review_count": int(cnt or 0),
    }


@router.get("/categories", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()


@router.get("/products", response_model=schemas.ProductPage)
def list_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    min_price: Optional[int] = Query(None, ge=0),
    max_price: Optional[int] = Query(None, ge=0),
    in_stock: bool = False,
    ids: Optional[str] = None,
    sort: str = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    rs = _rating_subquery(db)
    q = db.query(models.Product, rs.c.avg_rating, rs.c.review_count).outerjoin(
        rs, rs.c.pid == models.Product.id)

    if category_id:
        q = q.filter(models.Product.category_id == category_id)
    if search and search.strip():
        like = f"%{search.strip()}%"
        q = q.filter(models.Product.name.ilike(like) | models.Product.brand.ilike(like))
    if min_price is not None:
        q = q.filter(models.Product.price >= min_price)
    if max_price is not None:
        q = q.filter(models.Product.price <= max_price)
    if in_stock:
        q = q.filter(models.Product.stock > 0)
    if ids:
        try:
            id_list = [int(x) for x in ids.split(",") if x.strip()]
        except ValueError:
            raise HTTPException(status_code=400, detail="ids không hợp lệ")
        q = q.filter(models.Product.id.in_(id_list))

    order = {
        "price_asc": models.Product.price.asc(),
        "price_desc": models.Product.price.desc(),
        "name": models.Product.name.asc(),
        "rating": func.coalesce(rs.c.avg_rating, 0).desc(),
    }.get(sort, models.Product.id.desc())

    total = q.count()
    rows = (q.order_by(order, models.Product.id.desc())
            .offset((page - 1) * page_size).limit(page_size).all())
    return {
        "items": [_to_response(p, a, c) for p, a, c in rows],
        "total": total, "page": page, "pages": max(1, math.ceil(total / page_size)),
    }


@router.get("/products/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.get(models.Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    avg, cnt = db.query(func.avg(models.Review.rating), func.count(models.Review.id)).filter(
        models.Review.product_id == product_id).one()
    return _to_response(p, avg, cnt)


def _check_category(db: Session, category_id: int):
    if not db.get(models.Category, category_id):
        raise HTTPException(status_code=400, detail="Danh mục không tồn tại!")


def _clean_image(url: Optional[str]) -> str:
    return url.strip() if url and url.strip() else DEFAULT_IMG


@router.post("/products", response_model=schemas.ProductResponse)
def create_product(prod: schemas.ProductCreate, db: Session = Depends(get_db),
                   _admin=Depends(require_admin)):
    _check_category(db, prod.category_id)
    p = models.Product(
        name=prod.name.strip(), brand=(prod.brand or "").strip(), description=prod.description,
        price=prod.price, stock=prod.stock, image_url=_clean_image(prod.image_url),
        category_id=prod.category_id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _to_response(p)


@router.put("/products/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: int, prod: schemas.ProductCreate, db: Session = Depends(get_db),
                   _admin=Depends(require_admin)):
    p = db.get(models.Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    _check_category(db, prod.category_id)
    p.name = prod.name.strip()
    p.brand = (prod.brand or "").strip()
    p.description = prod.description
    p.price = prod.price
    p.stock = prod.stock
    p.image_url = _clean_image(prod.image_url)
    p.category_id = prod.category_id
    db.commit()
    db.refresh(p)
    return _to_response(p)


@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), _admin=Depends(require_admin)):
    p = db.get(models.Product, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    db.delete(p)
    db.commit()
    return {"message": "Đã xóa sản phẩm!"}


@router.post("/upload")
async def upload_image(file: UploadFile = File(...), _admin=Depends(require_admin)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận ảnh jpg, png, webp, gif!")
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(status_code=400, detail="Ảnh tối đa 5MB!")
    os.makedirs(config.UPLOAD_DIR, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(config.UPLOAD_DIR, name), "wb") as f:
        f.write(data)
    return {"url": f"/uploads/{name}"}


# ---------- ĐÁNH GIÁ ----------
@router.get("/products/{product_id}/reviews", response_model=List[schemas.ReviewResponse])
def get_reviews(product_id: int, db: Session = Depends(get_db)):
    rows = (db.query(models.Review).filter(models.Review.product_id == product_id)
            .order_by(models.Review.id.desc()).all())
    return [{"id": r.id, "user_name": r.user.full_name, "rating": r.rating,
             "comment": r.comment, "created_at": r.created_at} for r in rows]


@router.post("/products/{product_id}/reviews")
def upsert_review(product_id: int, req: schemas.ReviewCreate,
                  user: models.User = Depends(require_customer), db: Session = Depends(get_db)):
    if not db.get(models.Product, product_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    r = db.query(models.Review).filter_by(user_id=user.id, product_id=product_id).first()
    if r:
        r.rating, r.comment = req.rating, req.comment
    else:
        db.add(models.Review(user_id=user.id, product_id=product_id,
                             rating=req.rating, comment=req.comment))
    db.commit()
    return {"message": "Cảm ơn bạn đã đánh giá!"}
