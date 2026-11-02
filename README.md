# NextGen Store

FastAPI + MySQL (backend) và React + Vite + Tailwind (frontend).

## Chạy backend
```
cd backend
uvicorn main:app --reload

```
Lần chạy đầu tự nạp dữ liệu mẫu. Tài khoản demo: `admin@store.com` / `admin123`, `khach@store.com` / `khach123`.

Phí ship cấu hình trong `.env`: `SHIPPING_FEE` (mặc định 30000) và `FREE_SHIP_THRESHOLD` (miễn phí từ 500000).
Chạy test: `python -m pytest tests`.

Khi sửa `models.py`: `python -m alembic revision --autogenerate -m "mo ta"` rồi `python -m alembic upgrade head`.

## Chạy frontend
```
cd frontend
npm install
copy .env.example .env           # VITE_API_URL trỏ tới backend
npm run dev
```
http://localhost:5173