import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const TOKEN_KEY = "ngs_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Token hết hạn giữa phiên -> xóa token và báo AuthContext đăng xuất.
// Chỉ áp dụng cho request có gửi token (đăng nhập sai mật khẩu cũng trả 401 nhưng không có token).
export const LOGOUT_EVENT = "ngs:logout";
api.interceptors.response.use(undefined, (err) => {
  if (err.response?.status === 401 && err.config?.headers?.Authorization) {
    setToken(null);
    window.dispatchEvent(new Event(LOGOUT_EVENT));
  }
  return Promise.reject(err);
});

// Ảnh upload trả về đường dẫn tương đối (/uploads/..) -> ghép với địa chỉ API
export const imgUrl = (u) => (u && u.startsWith("/uploads/") ? `${API_URL}${u}` : u);

// Thông báo lỗi dễ hiểu: phân biệt mất kết nối với lỗi do server trả về
export function errMsg(err, fallback = "Đã có lỗi xảy ra!") {
  if (!err?.response) return "Chưa kết nối được Backend FastAPI!";
  const d = err.response.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x.msg).join("; ");
  return `${fallback} (mã lỗi ${err.response.status})`;
}

export const get = (url, params) => api.get(url, { params }).then((r) => r.data);
