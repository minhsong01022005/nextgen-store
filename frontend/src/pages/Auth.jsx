import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { errMsg } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Auth({ mode }) {
  const isLogin = mode === "login";
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (user) return <Navigate to={loc.state?.from || (user.role === "admin" ? "/admin" : "/")} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = isLogin ? await login(form.email, form.password) : await register(form.full_name, form.email, form.password);
      toast.success(`Xin chào ${u.full_name}!`);
      navigate(loc.state?.from || (u.role === "admin" ? "/admin" : "/"), { replace: true });
    } catch (err) {
      toast.error(errMsg(err, "Không thể đăng nhập!"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto card p-7 space-y-5">
      <h2 className="text-xl font-extrabold">{isLogin ? "Đăng nhập" : "Tạo tài khoản"}</h2>
      <form onSubmit={submit} className="space-y-3.5">
        {!isLogin && (
          <div><label className="label">Họ và tên</label><input className="input mt-1" value={form.full_name} onChange={set("full_name")} required minLength={2} /></div>
        )}
        <div><label className="label">Email</label><input type="email" className="input mt-1" value={form.email} onChange={set("email")} required autoComplete="email" /></div>
        <div><label className="label">Mật khẩu {!isLogin && "(tối thiểu 6 ký tự)"}</label><input type="password" className="input mt-1" value={form.password} onChange={set("password")} required minLength={isLogin ? 1 : 6} autoComplete={isLogin ? "current-password" : "new-password"} /></div>
        <button className="btn-primary w-full !py-2.5" disabled={busy}>{busy ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Đăng ký"}</button>
      </form>
      <p className="text-sm muted text-center">
        {isLogin ? <>Chưa có tài khoản? <Link to="/register" state={loc.state} className="text-indigo-600 font-semibold">Đăng ký</Link></> : <>Đã có tài khoản? <Link to="/login" state={loc.state} className="text-indigo-600 font-semibold">Đăng nhập</Link></>}
      </p>
    </div>
  );
}
