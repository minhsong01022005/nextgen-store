import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import config
from database import SessionLocal
from routers import addresses, admin, auth, cart, orders, products
from seed import seed


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Cấu trúc bảng do Alembic quản lý: chạy `alembic upgrade head` trước khi khởi động.
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
    yield


app = FastAPI(title="NextGen Store API", version="5.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(config.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=config.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(cart.router)
app.include_router(addresses.router)
app.include_router(admin.router)
