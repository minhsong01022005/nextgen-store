"""Nạp dữ liệu mẫu lần đầu (chỉ chạy khi DB còn trống). Có thể chạy tay: python seed.py"""
from datetime import datetime, timedelta

import models
from database import SessionLocal
from security import hash_password

IMG = "https://images.unsplash.com/photo-{}?w=600&auto=format&fit=crop&q=80"

ADMIN_EMAIL, ADMIN_PASSWORD = "admin@store.com", "admin123"
DEMO_EMAIL, DEMO_PASSWORD = "khach@store.com", "khach123"


def seed(db=None):
    own = db is None
    db = db or SessionLocal()
    try:
        if db.query(models.User).count() == 0:
            db.add_all([
                models.User(email=ADMIN_EMAIL, full_name="Quản trị viên",
                            password_hash=hash_password(ADMIN_PASSWORD), role="admin"),
                models.User(email=DEMO_EMAIL, full_name="Khách hàng Demo",
                            password_hash=hash_password(DEMO_PASSWORD), role="customer"),
            ])

        if db.query(models.Category).count() == 0:
            c1 = models.Category(name="Laptop & MacBook", description="Máy tính xách tay hiệu năng cao")
            c2 = models.Category(name="Điện thoại & Tablet", description="Smartphone và máy tính bảng")
            c3 = models.Category(name="Trang sức & Phụ kiện", description="Đồng hồ thông minh, tai nghe")
            db.add_all([c1, c2, c3])
            db.flush()

            P = models.Product
            db.add_all([
                P(name="MacBook Air M3 13 inch 16GB/512GB", brand="Apple", price=27990000, stock=12,
                  category_id=c1.id, image_url=IMG.format("1517336714731-489689fd1ca8"),
                  description="Chip M3 mạnh mẽ, màn hình Liquid Retina 13.6 inch, pin đến 18 giờ, thiết kế mỏng nhẹ 1.24 kg."),
                P(name="Laptop ASUS ROG Strix Gaming G16", brand="ASUS", price=31500000, stock=8,
                  category_id=c1.id, image_url=IMG.format("1603302576837-37561b2e2302"),
                  description="Core i9, RTX 4060, màn hình 16 inch 165Hz, tản nhiệt 3 quạt cho game thủ."),
                P(name="Laptop Dell XPS 13 Plus", brand="Dell", price=34900000, stock=6,
                  category_id=c1.id, image_url=IMG.format("1496181133206-80ce9b88a853"),
                  description="Thiết kế viền mỏng InfinityEdge, Core Ultra 7, RAM 32GB, SSD 1TB."),
                P(name="Laptop Lenovo ThinkPad X1 Carbon", brand="Lenovo", price=29900000, stock=9,
                  category_id=c1.id, image_url=IMG.format("1588872657578-7efd1f1555ed"),
                  description="Bền bỉ chuẩn quân đội, bàn phím huyền thoại, chỉ nặng 1.12 kg."),
                P(name="iPhone 16 Pro Max 256GB Titan Tự Nhiên", brand="Apple", price=32990000, stock=15,
                  category_id=c2.id, image_url=IMG.format("1592750475338-74b7b21085ab"),
                  description="Chip A18 Pro, khung Titan, camera 48MP với zoom quang 5x, nút Camera Control."),
                P(name="iPad Air M2 11 inch WiFi 128GB", brand="Apple", price=16490000, stock=10,
                  category_id=c2.id, image_url=IMG.format("1544244015-0df4b3ffc6b0"),
                  description="Chip M2, màn hình Liquid Retina 11 inch, hỗ trợ Apple Pencil Pro."),
                P(name="Samsung Galaxy S24 Ultra 512GB", brand="Samsung", price=28990000, stock=11,
                  category_id=c2.id, image_url=IMG.format("1610945415295-d9bbf067e59c"),
                  description="Snapdragon 8 Gen 3, bút S Pen, camera 200MP, Galaxy AI."),
                P(name="Xiaomi Pad 6 8GB/256GB", brand="Xiaomi", price=9490000, stock=14,
                  category_id=c2.id, image_url=IMG.format("1561154464-82e9adf32764"),
                  description="Màn hình 11 inch 144Hz, Snapdragon 870, loa 4 chiều Dolby Atmos."),
                P(name="Tai nghe Sony WH-1000XM5 Chống ồn", brand="Sony", price=6890000, stock=20,
                  category_id=c3.id, image_url=IMG.format("1618366712010-f4ae9c647dcb"),
                  description="Chống ồn chủ động hàng đầu, pin 30 giờ, âm thanh Hi-Res."),
                P(name="Đồng hồ Apple Watch Series 10 GPS 42mm", brand="Apple", price=10990000, stock=4,
                  category_id=c3.id, image_url=IMG.format("1546868871-7041f2a55e12"),
                  description="Màn hình OLED lớn nhất từ trước đến nay, theo dõi sức khỏe, sạc nhanh."),
                P(name="Tai nghe AirPods Pro 2 USB-C", brand="Apple", price=5990000, stock=25,
                  category_id=c3.id, image_url=IMG.format("1606220588913-b3aacb4d2f46"),
                  description="Chống ồn chủ động gấp 2 lần, chip H2, hộp sạc MagSafe USB-C."),
                P(name="Loa Bluetooth JBL Charge 5", brand="JBL", price=3490000, stock=30,
                  category_id=c3.id, image_url=IMG.format("1608043152269-423dbba4e7e1"),
                  description="Chống nước IP67, pin 20 giờ, có thể sạc ngược cho điện thoại."),
            ])

            db.add_all([
                models.Coupon(code="SALE10", discount_type="percent", discount_value=10,
                              min_order_amount=5000000, usage_limit=20),
                models.Coupon(code="GIAM500K", discount_type="fixed", discount_value=500000,
                              min_order_amount=2000000, usage_limit=30),
                models.Coupon(code="VIP2M", discount_type="fixed", discount_value=2000000,
                              min_order_amount=30000000, usage_limit=10,
                              expires_at=datetime.now() + timedelta(days=90)),
            ])
        db.commit()
    finally:
        if own:
            db.close()


if __name__ == "__main__":
    seed()
    print("Đã nạp dữ liệu mẫu.")
