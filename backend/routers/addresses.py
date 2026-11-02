from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import require_customer

router = APIRouter(tags=["addresses"])


def _mine(db: Session, user: models.User, address_id: int) -> models.Address:
    a = db.get(models.Address, address_id)
    if not a or a.user_id != user.id:
        raise HTTPException(status_code=404, detail="Không tìm thấy địa chỉ")
    return a


def _clear_default(db: Session, user: models.User) -> None:
    db.query(models.Address).filter_by(user_id=user.id, is_default=True).update({"is_default": False})


@router.get("/me/addresses", response_model=List[schemas.AddressResponse])
def list_addresses(user: models.User = Depends(require_customer), db: Session = Depends(get_db)):
    return (db.query(models.Address).filter_by(user_id=user.id)
            .order_by(models.Address.is_default.desc(), models.Address.id.desc()).all())


@router.post("/me/addresses", response_model=schemas.AddressResponse)
def create_address(req: schemas.AddressIn, user: models.User = Depends(require_customer),
                   db: Session = Depends(get_db)):
    first = db.query(models.Address.id).filter_by(user_id=user.id).first() is None
    make_default = req.is_default or first  # địa chỉ đầu tiên luôn là mặc định
    if make_default:
        _clear_default(db, user)
    a = models.Address(user_id=user.id, full_name=req.full_name.strip(), phone=req.phone.strip(),
                       address=req.address.strip(), is_default=make_default)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/me/addresses/{address_id}", response_model=schemas.AddressResponse)
def update_address(address_id: int, req: schemas.AddressIn, user: models.User = Depends(require_customer),
                   db: Session = Depends(get_db)):
    a = _mine(db, user, address_id)
    if req.is_default and not a.is_default:
        _clear_default(db, user)
    a.full_name, a.phone, a.address = req.full_name.strip(), req.phone.strip(), req.address.strip()
    a.is_default = req.is_default or a.is_default
    db.commit()
    db.refresh(a)
    return a


@router.delete("/me/addresses/{address_id}")
def delete_address(address_id: int, user: models.User = Depends(require_customer),
                   db: Session = Depends(get_db)):
    a = _mine(db, user, address_id)
    was_default = a.is_default
    db.delete(a)
    db.flush()
    if was_default:  # chuyển mặc định sang địa chỉ còn lại gần nhất
        nxt = db.query(models.Address).filter_by(user_id=user.id).order_by(models.Address.id.desc()).first()
        if nxt:
            nxt.is_default = True
    db.commit()
    return {"message": "Đã xóa địa chỉ!"}
