import { Link, Navigate, useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { imgUrl } from "../api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { formatVND } from "../utils/format";
import { EmptyState, PageTitle } from "../components/common";

export default function Cart() {
  const { cart, changeQty, remove, isSelected, toggle, toggleAll, selectedItems, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === "admin") return <Navigate to="/admin" replace />;

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <PageTitle icon={ShoppingCart}>Giỏ hàng</PageTitle>
        <EmptyState>Giỏ hàng đang trống. <Link to="/" className="text-indigo-600 font-semibold">Mua sắm ngay</Link></EmptyState>
      </div>
    );
  }

  const allChecked = selectedItems.length === cart.length;
  const picked = selectedItems.reduce((s, i) => s + i.quantity, 0);

  const buy = () => {
    if (selectedItems.length === 0) return toast.error("Hãy chọn ít nhất một sản phẩm để mua!");
    if (!user) {
      toast("Vui lòng đăng nhập để đặt hàng!");
      return navigate("/login", { state: { from: "/cart" } });
    }
    navigate("/checkout");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-28">
      <PageTitle icon={ShoppingCart}>Giỏ hàng</PageTitle>

      <label className="card p-4 flex items-center gap-3 text-sm font-semibold cursor-pointer">
        <input type="checkbox" className="size-4 cursor-pointer" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} aria-label="Chọn tất cả" />
        <span>Chọn tất cả ({cart.length} sản phẩm)</span>
      </label>

      <div className="space-y-3">
        {cart.map((item) => (
          <div key={item.id} className="card p-4 flex items-center gap-3">
            <label className="p-2 -m-2 shrink-0 cursor-pointer">
              <input type="checkbox" className="size-4 cursor-pointer" checked={isSelected(item.id)} onChange={() => toggle(item.id)} aria-label={`Chọn ${item.name}`} />
            </label>
            <Link to={`/product/${item.id}`} className="shrink-0">
              <img src={imgUrl(item.image_url)} alt="" className="w-16 h-16 rounded-lg object-cover" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={`/product/${item.id}`} className="text-sm font-bold line-clamp-2 hover:text-indigo-600">{item.name}</Link>
              <p className="text-sm price mt-0.5">{formatVND(item.price)}</p>
              {item.stock <= 0 ? (
                <p className="text-[11px] text-rose-600 font-semibold">Đã hết hàng</p>
              ) : item.quantity > item.stock ? (
                <p className="text-[11px] text-rose-600 font-semibold">Kho chỉ còn {item.stock}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
              <button onClick={() => changeQty(item.id, -1)} aria-label="Giảm" className="muted hover:text-rose-600 cursor-pointer"><Minus size={14} /></button>
              <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
              <button onClick={() => changeQty(item.id, 1)} aria-label="Tăng" className="muted hover:text-indigo-600 cursor-pointer"><Plus size={14} /></button>
            </div>
            <p className="hidden sm:block w-28 text-right font-bold text-rose-600 text-sm">{formatVND(item.price * item.quantity)}</p>
            <button onClick={() => remove(item.id)} aria-label="Xóa" className="muted hover:text-rose-600 cursor-pointer"><Trash2 size={17} /></button>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-xs muted">Đã chọn <b>{picked}</b> sản phẩm</p>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] muted">Tạm tính</p>
              <p className="text-lg font-extrabold text-rose-600">{formatVND(subtotal)}</p>
            </div>
            <button className="btn-primary !px-6 !py-2.5" onClick={buy} disabled={selectedItems.length === 0}>
              {user ? "Mua hàng" : "Đăng nhập để mua"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
