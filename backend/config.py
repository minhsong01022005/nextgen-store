import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "nextgen_store")
CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "72"))
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
SHIPPING_FEE = int(os.getenv("SHIPPING_FEE", "30000"))
FREE_SHIP_THRESHOLD = int(os.getenv("FREE_SHIP_THRESHOLD", "500000"))
