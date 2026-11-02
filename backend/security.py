import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import config
import models
from database import get_db

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), 200_000)
    return hmac.compare_digest(digest.hex(), digest_hex)


def create_token(user: models.User) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=config.JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm="HS256")


def get_optional_user(
    cred: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    if not cred:
        return None
    try:
        data = jwt.decode(cred.credentials, config.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn!")
    return db.get(models.User, int(data["sub"]))


def get_current_user(user: Optional[models.User] = Depends(get_optional_user)) -> models.User:
    if not user:
        raise HTTPException(status_code=401, detail="Bạn cần đăng nhập!")
    return user


def require_admin(user: models.User = Depends(get_current_user)) -> models.User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Chỉ quản trị viên mới có quyền này!")
    return user


def require_customer(user: models.User = Depends(get_current_user)) -> models.User:
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Tài khoản quản trị chỉ dùng để quản lý cửa hàng!")
    return user
