from sqlalchemy import (Column, Integer, String, Text, DateTime, ForeignKey, Boolean,
                        UniqueConstraint, func)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    full_name = Column(String(150), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="customer")  # customer | admin
    created_at = Column(DateTime, server_default=func.now())

    orders = relationship("Order", back_populates="user")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    products = relationship("Product", back_populates="category", cascade="all, delete")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    brand = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    price = Column(Integer, nullable=False)
    stock = Column(Integer, nullable=False, default=10)
    image_url = Column(String(500), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)

    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    reviews = relationship("Review", back_populates="product", cascade="all, delete")
    favorites = relationship("Favorite", back_populates="product", cascade="all, delete")


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_type = Column(String(20), nullable=False)   # percent | fixed
    discount_value = Column(Integer, nullable=False)
    min_order_amount = Column(Integer, default=0)
    usage_limit = Column(Integer, default=50)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    customer_name = Column(String(150), nullable=False)
    customer_phone = Column(String(50), nullable=False, index=True)
    customer_address = Column(String(300), nullable=False)
    payment_method = Column(String(30), nullable=False, default="cod")  # cod | bank
    coupon_code = Column(String(50), nullable=True)
    discount_amount = Column(Integer, nullable=False, default=0)
    shipping_fee = Column(Integer, nullable=False, default=0)
    total_amount = Column(Integer, nullable=False, default=0)
    status = Column(String(50), default="pending")
    cancel_reason = Column(String(300), nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete")
    history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete",
                           order_by="OrderStatusHistory.id")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(255), nullable=True)  # lưu tên tại thời điểm mua
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), nullable=False)
    actor = Column(String(20), nullable=False)  # customer | admin | system
    note = Column(String(300), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    order = relationship("Order", back_populates="history")


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)

    product = relationship("Product")


class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=False)
    address = Column(String(300), nullable=False)
    is_default = Column(Boolean, nullable=False, default=False)


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_fav_user_product"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)

    product = relationship("Product", back_populates="favorites")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_review_user_product"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(String(1000), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")
    product = relationship("Product", back_populates="reviews")
