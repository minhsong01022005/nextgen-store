import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { ClipboardList, Heart, LayoutDashboard, LogIn, LogOut, Menu, Moon, Search, ShoppingBag, ShoppingCart, Sun, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("ngs_theme");
    return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("ngs_theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, () => setDark((d) => !d)];
}

const linkCls = ({ isActive }) =>
  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
    isActive ? "bg-indigo-600 text-white shadow" : "text-slate-300 hover:text-white"
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const isAdmin = user?.role === "admin";
  const [dark, toggleTheme] = useTheme();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const search = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/?search=${encodeURIComponent(q.trim())}` : "/");
    setMenu(false);
  };

  const nav = (
    <>
      <NavLink to="/" end className={linkCls} onClick={() => setMenu(false)}>Cửa hàng</NavLink>
      {user && !isAdmin && (
        <>
          <NavLink to="/favorites" className={linkCls} onClick={() => setMenu(false)}><Heart size={14} /> Yêu thích</NavLink>
          <NavLink to="/my-orders" className={linkCls} onClick={() => setMenu(false)}><ClipboardList size={14} /> Đơn của tôi</NavLink>
        </>
      )}
      {user?.role === "admin" && (
        <NavLink to="/admin" className={linkCls} onClick={() => setMenu(false)}><LayoutDashboard size={14} /> Quản trị</NavLink>
      )}
    </>
  );

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ShoppingBag size={22} />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg leading-tight">NextGen Store</h1>
              <p className="text-xs text-slate-400">Công nghệ chính hãng</p>
            </div>
          </Link>

          <form onSubmit={search} className="relative hidden md:block flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm sản phẩm..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </form>

          <nav className="hidden lg:flex items-center gap-1 bg-slate-800 p-1.5 rounded-xl">{nav}</nav>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} aria-label="Đổi giao diện sáng/tối" className="p-2 rounded-lg hover:bg-slate-800 cursor-pointer">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {!isAdmin && (
              <button onClick={() => navigate("/cart")} aria-label="Mở giỏ hàng" className="relative p-2 rounded-lg hover:bg-slate-800 cursor-pointer">
                <ShoppingCart size={20} />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">{count}</span>
                )}
              </button>
            )}
            {user ? (
              <button onClick={() => { logout(); navigate("/"); }} className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer" title={user.email}>
                <LogOut size={14} /> {user.full_name.split(" ").slice(-1)[0]}
              </button>
            ) : (
              <Link to="/login" className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700">
                <LogIn size={14} /> Đăng nhập
              </Link>
            )}
            <button onClick={() => setMenu((m) => !m)} aria-label="Menu" className="lg:hidden p-2 rounded-lg hover:bg-slate-800 cursor-pointer">
              {menu ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menu && (
          <div className="lg:hidden border-t border-slate-800 px-4 py-3 space-y-3">
            <form onSubmit={search}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm sản phẩm..." className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white" />
            </form>
            <div className="flex flex-wrap gap-1.5">{nav}</div>
            {user ? (
              <button onClick={() => { logout(); setMenu(false); navigate("/"); }} className="btn-ghost !text-xs w-full">Đăng xuất ({user.email})</button>
            ) : (
              <Link to="/login" onClick={() => setMenu(false)} className="btn-primary !text-xs w-full">Đăng nhập / Đăng ký</Link>
            )}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Outlet />
      </main>
    </div>
  );
}
