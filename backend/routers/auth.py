from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import create_token, get_current_user, hash_password, require_customer, verify_password

router = APIRouter(tags=["auth"])


@router.post("/auth/register", response_model=schemas.TokenResponse)
def register(req: schemas.RegisterRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký!")
    user = models.User(email=email, full_name=req.full_name.strip(),
                       password_hash=hash_password(req.password), role="customer")
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_token(user), "user": user}


@router.post("/auth/login", response_model=schemas.TokenResponse)
def login(req: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email.strip().lower()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Sai email hoặc mật khẩu!")
    return {"access_token": create_token(user), "user": user}


@router.get("/auth/me", response_model=schemas.UserResponse)
def me(user: models.User = Depends(get_current_user)):
    return user


# ---------- YÊU THÍCH ----------
@router.get("/me/favorites", response_model=List[int])
def my_favorite_ids(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(models.Favorite.product_id).filter(models.Favorite.user_id == user.id).all()
    return [r[0] for r in rows]


@router.post("/favorites/{product_id}")
def add_favorite(product_id: int, user: models.User = Depends(require_customer),
                 db: Session = Depends(get_db)):
    if not db.get(models.Product, product_id):
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    exists = db.query(models.Favorite).filter_by(user_id=user.id, product_id=product_id).first()
    if not exists:
        db.add(models.Favorite(user_id=user.id, product_id=product_id))
        db.commit()
    return {"message": "Đã thêm vào yêu thích"}


@router.delete("/favorites/{product_id}")
def remove_favorite(product_id: int, user: models.User = Depends(require_customer),
                    db: Session = Depends(get_db)):
    db.query(models.Favorite).filter_by(user_id=user.id, product_id=product_id).delete()
    db.commit()
    return {"message": "Đã bỏ khỏi yêu thích"}
