from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- AUTH ----------
class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=150, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    full_name: str = Field(..., min_length=2, max_length=150)
    password: str = Field(..., min_length=6, max_length=100)


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(ORM):
    id: int
    email: str
    full_name: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    user: UserResponse


# ---------- CATEGORY / PRODUCT ----------
class CategoryResponse(ORM):
    id: int
    name: str
    description: Optional[str] = ""


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    brand: Optional[str] = ""
    description: Optional[str] = ""
    price: int = Field(..., gt=0)
    stock: int = Field(..., ge=0)
    image_url: Optional[str] = ""
    category_id: int


class ProductResponse(BaseModel):
    id: int
    name: str
    brand: Optional[str] = ""
    description: Optional[str] = ""
    price: int
    stock: int
    image_url: Optional[str] = ""
    category_id: int
    category_name: Optional[str] = ""
    avg_rating: float = 0
    review_count: int = 0


class ProductPage(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    pages: int


# ---------- REVIEW ----------
class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(default="", max_length=1000)


class ReviewResponse(BaseModel):
    id: int
    user_name: str
    rating: int
    comment: Optional[str] = ""
    created_at: Optional[datetime] = None


# ---------- COUPON ----------
class CouponCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    discount_type: Literal["percent", "fixed"]
    discount_value: int = Field(..., gt=0)
    min_order_amount: int = Field(default=0, ge=0)
    usage_limit: int = Field(default=50, gt=0)
    expires_at: Optional[datetime] = None


class CouponResponse(ORM):
    id: int
    code: str
    discount_type: str
    discount_value: int
    min_order_amount: int
    usage_limit: int
    used_count: int
    is_active: bool
    expires_at: Optional[datetime] = None


class CouponApplyRequest(BaseModel):
    code: str
    order_total: int


# ---------- CART / ADDRESS ----------
class CartItemSet(BaseModel):
    quantity: int = Field(..., ge=0, le=999)  # 0 = xóa khỏi giỏ


class CartAdd(BaseModel):
    product_id: int
    quantity: int = Field(default=1, gt=0, le=999)


class CartMerge(BaseModel):
    items: List[CartAdd]


class AddressIn(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=150)
    phone: str = Field(..., min_length=6, max_length=50)
    address: str = Field(..., min_length=1, max_length=300)
    is_default: bool = False


class AddressResponse(ORM):
    id: int
    full_name: str
    phone: str
    address: str
    is_default: bool


# ---------- ORDER ----------
class CartItemInput(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    address_id: int  # địa chỉ trong sổ địa chỉ của người đặt
    payment_method: Literal["cod", "bank"] = "cod"
    coupon_code: Optional[str] = None
    items: List[CartItemInput]


class OrderItemDetail(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    quantity: int
    unit_price: int


class StatusHistoryItem(BaseModel):
    status: str
    actor: str
    note: Optional[str] = None
    created_at: Optional[datetime] = None


class OrderActionRequest(BaseModel):
    reason: Optional[str] = Field(default="", max_length=300)


class OrderResponse(BaseModel):
    id: int
    customer_name: str
    customer_phone: str
    customer_address: str
    payment_method: str
    coupon_code: Optional[str] = None
    discount_amount: int = 0
    shipping_fee: int = 0
    total_amount: int
    status: str
    cancel_reason: Optional[str] = None
    delivered_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    items: List[OrderItemDetail]
    history: List[StatusHistoryItem] = []
    next_actions: List[str] = []  # trạng thái mà người đang xem được phép chuyển tới
