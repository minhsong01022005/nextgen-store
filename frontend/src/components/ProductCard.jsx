import { Link } from "react-router-dom";
import { Heart, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import { imgUrl, errMsg } from "../api";
import { formatVND } from "../utils/format";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { Stars } from "./common";

export default function ProductCard({ p }) {
  const { user, favIds, toggleFav } = useAuth();
  const { add } = useCart();
  const isAdmin = user?.role === "admin";
  const faved = favIds.includes(p.id);

  const onFav = async () => {
    if (!user) return toast("Hãy đăng nhập để lưu sản phẩm yêu thích");
    try {
      await toggleFav(p.id);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="card overflow-hidden flex flex-col justify-between hover:shadow-md transition group">
      <div>
        <Link to={`/product/${p.id}`} className="block h-44 overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
          <img
            src={imgUrl(p.image_url)}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
          <span className="absolute top-2.5 left-2.5 bg-slate-900/75 text-white text-[11px] px-2.5 py-1 rounded-lg font-medium">
            {p.category_name}
          </span>
          <span
            className={`absolute top-2.5 right-2.5 text-[11px] font-bold px-2.5 py-1 rounded-lg text-white ${
              p.stock > 5 ? "bg-emerald-500" : p.stock > 0 ? "bg-amber-500" : "bg-rose-600"
            }`}
          >
            {p.stock > 0 ? `Kho: ${p.stock}` : "Hết hàng"}
          </span>
        </Link>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/product/${p.id}`} className="font-bold text-sm line-clamp-2 min-h-[40px] hover:text-indigo-600 dark:hover:text-indigo-400">
              {p.name}
            </Link>
            {!isAdmin && (
              <button onClick={onFav} aria-label="Yêu thích" className="shrink-0 cursor-pointer">
                <Heart size={18} className={faved ? "fill-rose-500 text-rose-500" : "text-slate-400 hover:text-rose-500"} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5 h-4">
            {p.review_count > 0 && (
              <>
                <Stars value={p.avg_rating} size={12} />
                <span className="text-[11px] muted">({p.review_count})</span>
              </>
            )}
          </div>
          <p className="text-lg price mt-1.5">{formatVND(p.price)}</p>
        </div>
      </div>
      {!isAdmin && (
        <div className="px-4 pb-4">
          <button onClick={() => add(p)} disabled={p.stock <= 0} className="btn-primary w-full !text-xs !py-2.5">
            <ShoppingCart size={15} />
            {p.stock > 0 ? "Thêm vào Giỏ hàng" : "Tạm hết hàng"}
          </button>
        </div>
      )}
    </div>
  );
}
