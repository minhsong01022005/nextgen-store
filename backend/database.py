from urllib.parse import quote_plus

import pymysql
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

import config

# Tự tạo database nếu chưa tồn tại (MySQL Laragon/XAMPP)
conn = pymysql.connect(host=config.DB_HOST, user=config.DB_USER,
                       password=config.DB_PASSWORD, port=config.DB_PORT)
with conn.cursor() as cursor:
    cursor.execute(
        f"CREATE DATABASE IF NOT EXISTS `{config.DB_NAME}` "
        "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
    )
conn.close()

SQLALCHEMY_DATABASE_URL = (
    f"mysql+pymysql://{config.DB_USER}:{quote_plus(config.DB_PASSWORD)}"
    f"@{config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}?charset=utf8mb4"
)

engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
