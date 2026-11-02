import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequireAuth({ admin = false, customer = false, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <p className="muted text-sm py-10 text-center">Đang kiểm tra đăng nhập...</p>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (admin && user.role !== "admin") return <Navigate to="/" replace />;
  if (customer && user.role === "admin") return <Navigate to="/admin" replace />;
  return children;
}
